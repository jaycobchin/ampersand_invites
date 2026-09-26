import { backup, DatabaseSync } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const databasePath = process.env.DATABASE_PATH || './data/ampersand.sqlite';
if (process.env.TURSO_DATABASE_URL) {
  console.error('Use Turso backups or a Turso database export for the hosted database.');
  process.exit(1);
}
const db = new DatabaseSync(databasePath);

const destination = process.argv[2];
if (!destination) {
  console.error('Usage: npm run db:backup -- /path/to/backup.sqlite');
  process.exit(1);
}
const target = resolve(destination);
if (existsSync(target)) {
  console.error('Choose a new filename. Existing backup files are never overwritten.');
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
await backup(db, target);
console.log(`Database backup saved to ${target}`);
