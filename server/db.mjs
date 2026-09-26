import { createClient } from '@libsql/client';
import { AsyncLocalStorage } from 'node:async_hooks';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { schema } from './schema.mjs';

export const databasePath = process.env.DATABASE_PATH || './data/ampersand.sqlite';
export const remoteDatabase = !!process.env.TURSO_DATABASE_URL;
const missingCloudDatabase = process.env.VERCEL === '1' && !remoteDatabase;
if (!remoteDatabase && !missingCloudDatabase && databasePath !== ':memory:') {
  mkdirSync(dirname(databasePath), { recursive: true });
}
const url =
  process.env.TURSO_DATABASE_URL ||
  (databasePath === ':memory:' ? 'file::memory:' : pathToFileURL(resolve(databasePath)).href);
if (process.env.VERCEL === '1' && remoteDatabase && !/^(libsql|https):\/\//.test(url)) {
  throw new Error('Vercel requires a hosted Turso database URL.');
}
const client = missingCloudDatabase
  ? null
  : createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
const scope = new AsyncLocalStorage();
let ready;
let queue = Promise.resolve();

// A local libSQL client shares a connection. Serialize its operations so one
// request can never execute inside another request's uncommitted transaction.
// Cloud instances coordinate writes through the database's write transaction.
async function exclusive(fn) {
  const previous = queue;
  let release;
  queue = new Promise((resolve) => {
    release = resolve;
  });
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function initializeDatabase() {
  if (!client) {
    throw Object.assign(
      new Error('Connect a Turso database to this Vercel project and redeploy.'),
      { status: 503 },
    );
  }
  if (!ready) {
    ready = exclusive(async () => {
      if (!remoteDatabase) {
        await client.execute('PRAGMA foreign_keys = ON');
        await client.execute('PRAGMA busy_timeout = 5000');
        await client.execute('PRAGMA journal_mode = WAL');
      }
      await client.batch(
        schema
          .split(';')
          .map((sql) => sql.trim())
          .filter(Boolean),
        'write',
      );
    }).catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  await ready;
}

async function execute(sql, args) {
  await initializeDatabase();
  const tx = scope.getStore();
  return tx ? tx.execute({ sql, args }) : exclusive(() => client.execute({ sql, args }));
}
export const all = async (sql, ...args) => (await execute(sql, args)).rows;
export const one = async (sql, ...args) => (await execute(sql, args)).rows[0];
export const run = async (sql, ...args) => execute(sql, args);
export async function batch(statements) {
  await initializeDatabase();
  const tx = scope.getStore();
  return tx ? tx.batch(statements) : exclusive(() => client.batch(statements, 'write'));
}
export async function transaction(fn, mode = 'write') {
  await initializeDatabase();
  if (scope.getStore()) return fn();
  return exclusive(async () => {
    const tx = await client.transaction(mode);
    try {
      const value = await scope.run(tx, fn);
      await tx.commit();
      return value;
    } catch (error) {
      await tx.rollback().catch(() => {});
      throw error;
    } finally {
      tx.close();
    }
  });
}
export function closeDatabase() {
  client?.close();
}
