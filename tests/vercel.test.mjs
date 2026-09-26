import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, existsSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { allowedOrigins } from '../server/origins.mjs';

test('Vercel permits exact deployment origins and rejects unrelated deployments or spoofed hosts', () => {
  const request = { get: () => 'attacker.example' };
  const origins = allowedOrigins(request, {
    NODE_ENV: 'production',
    VERCEL: '1',
    VERCEL_URL: 'ampersand-abc123.vercel.app',
    VERCEL_BRANCH_URL: 'ampersand-git-main-team.vercel.app',
    VERCEL_PROJECT_PRODUCTION_URL: 'ampersand.vercel.app',
    APP_URL: 'https://wedding.example/',
  });
  assert.ok(origins.has('https://ampersand-abc123.vercel.app'));
  assert.ok(origins.has('https://ampersand-git-main-team.vercel.app'));
  assert.ok(origins.has('https://ampersand.vercel.app'));
  assert.ok(origins.has('https://wedding.example'));
  assert.ok(!origins.has('https://unrelated.vercel.app'));
  assert.ok(!origins.has('http://attacker.example'));
  assert.equal(allowedOrigins(request, { NODE_ENV: 'production' }).size, 0);
});

test('Vercel refuses to silently use ephemeral storage when the cloud database is missing', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ampersand-vercel-'));
  const databasePath = join(directory, 'must-not-exist.sqlite');
  try {
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      const { one } = await import('./server/db.mjs');
      try { await one('SELECT 1'); process.exit(2); }
      catch (error) { if (error.status !== 503) throw error; console.log(error.status); }
    `,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          VERCEL: '1',
          TURSO_DATABASE_URL: '',
          TURSO_AUTH_TOKEN: '',
          DATABASE_PATH: databasePath,
        },
      },
    );
    assert.equal(output.trim(), '503');
    assert.equal(existsSync(databasePath), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('existing Node SQLite files can be read by the cloud-compatible adapter', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ampersand-compatible-'));
  try {
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
      import { DatabaseSync } from 'node:sqlite';
      import { schema } from './server/schema.mjs';
      const old = new DatabaseSync(process.env.DATABASE_PATH);
      old.exec(schema);
      old.prepare('INSERT INTO users (id,email,name,password_hash,role) VALUES (?,?,?,?,?)').run('old','old@example.com','Existing account','hash','couple');
      old.close();
      const { one, closeDatabase } = await import('./server/db.mjs');
      console.log((await one('SELECT name FROM users WHERE id = ?', 'old')).name);
      closeDatabase();
    `,
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
          ...process.env,
          VERCEL: '',
          TURSO_DATABASE_URL: '',
          TURSO_AUTH_TOKEN: '',
          DATABASE_PATH: join(directory, 'existing.sqlite'),
        },
      },
    );
    assert.equal(output.trim(), 'Existing account');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('Vercel routes the API separately from frontend deep links', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url)));
  assert.equal(config.framework, 'vite');
  assert.equal(config.outputDirectory, 'dist');
  assert.deepEqual(config.rewrites[0], { source: '/api/:path*', destination: '/api' });
  const frontend = new RegExp(`^${config.rewrites[1].source}$`);
  for (const url of ['/', '/dashboard', '/invite/abc', '/w/our-wedding'])
    assert.ok(frontend.test(url));
  for (const url of ['/api', '/api/health', '/api/auth/login']) assert.ok(!frontend.test(url));
});
