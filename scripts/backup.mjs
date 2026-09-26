import { backup } from 'node:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { db } from '../server/db.mjs';

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
