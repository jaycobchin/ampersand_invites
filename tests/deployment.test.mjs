import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { publicConfig } from '../server/config.mjs';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
for (const name of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'VERCEL', 'APP_MODE', 'ENABLE_DEMO'])
  delete process.env[name];
const { app } = await import('../server/app.mjs');
const { one, closeDatabase } = await import('../server/db.mjs');
let server, base;
before(async () => {
  server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
});
const post = (path, body = {}) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('demo serves sample weddings but rejects real registration before storing an account', async () => {
  process.env.APP_MODE = 'demo';
  process.env.LIVE_APP_URL = 'https://live.example.com';
  const config = await (await fetch(base + '/config')).json();
  assert.equal(config.liveUrl, 'https://live.example.com');
  assert.equal(config.registrationEnabled, false);
  const response = await post('/auth/register', {
    name: 'A real person',
    email: 'real@example.com',
    role: 'couple',
    password: 'a-long-password',
  });
  assert.equal(response.status, 403);
  assert.equal(await one('SELECT id FROM users WHERE email = ?', 'real@example.com'), undefined);
  const demo = await post('/auth/demo');
  assert.equal(demo.status, 200);
  assert.equal((await demo.json()).user.demo, true);
});

test('live allows real registration and blocks both sample creation and sample role switching', async () => {
  process.env.APP_MODE = 'demo';
  const sample = await post('/auth/demo');
  const sampleCookie = sample.headers.get('set-cookie').split(';')[0];
  process.env.APP_MODE = 'live';
  process.env.ENABLE_DEMO = 'true';
  process.env.DEMO_APP_URL = 'https://demo.example.com/';
  const config = await (await fetch(base + '/config')).json();
  assert.equal(config.demoEnabled, false);
  assert.equal(config.demoUrl, 'https://demo.example.com');
  assert.equal(config.liveUrl, null);
  assert.equal((await post('/auth/demo')).status, 404);
  assert.equal((await post('/auth/demo-role', { role: 'vendor' })).status, 404);
  const oldSampleSession = await fetch(base + '/workspace', { headers: { Cookie: sampleCookie } });
  assert.equal(oldSampleSession.status, 401);
  assert.match(oldSampleSession.headers.get('set-cookie'), /ampersand_session=;/);
  assert.equal(
    (
      await post('/auth/register', {
        name: 'Live person',
        email: 'live@example.com',
        role: 'couple',
        password: 'a-long-password',
      })
    ).status,
    201,
  );
  assert.equal(
    (await one('SELECT demo_group FROM users WHERE email = ?', 'live@example.com')).demo_group,
    null,
  );
});

test('public configuration exposes only intended fields and valid website origins', () => {
  const config = publicConfig({
    APP_MODE: 'demo',
    LIVE_APP_URL: 'https://live.example.com/',
    TURSO_AUTH_TOKEN: 'secret',
  });
  assert.deepEqual(config, {
    mode: 'demo',
    demoEnabled: true,
    registrationEnabled: false,
    demoUrl: null,
    liveUrl: 'https://live.example.com',
  });
  for (const url of [
    'javascript:alert(1)',
    'https://user:password@example.com',
    'https://example.com/?token=secret',
    'https://example.com/register',
  ])
    assert.equal(publicConfig({ APP_MODE: 'demo', LIVE_APP_URL: url }).liveUrl, null);
  assert.equal(publicConfig({}).demoEnabled, true);
  assert.equal(publicConfig({ ENABLE_DEMO: 'false' }).demoEnabled, false);
  assert.throws(() => publicConfig({ APP_MODE: 'typo' }), /APP_MODE/);
});
