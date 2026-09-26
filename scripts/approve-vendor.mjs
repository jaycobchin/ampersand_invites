import { one, run } from '../server/db.mjs';
const email = process.argv[2]?.toLowerCase();
if (!email) {
  console.error('Usage: npm run vendor:approve -- vendor@example.com');
  process.exit(1);
}
const user = await one('SELECT id FROM users WHERE email = ? AND role = ?', email, 'vendor');
if (!user || !(await one('SELECT id FROM vendors WHERE owner_id = ?', user.id))) {
  console.error('No vendor profile found for this email.');
  process.exit(1);
}
await run('UPDATE vendors SET approved = 1 WHERE owner_id = ?', user.id);
console.log('Vendor approved. The listing is now visible in the marketplace.');
