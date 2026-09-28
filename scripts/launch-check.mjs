import { emailConfig } from '../server/email.mjs';
import { one, closeDatabase } from '../server/db.mjs';

const checks = [
  ['Live mode', process.env.APP_MODE === 'live'],
  ['Account email configuration', !!emailConfig()],
  ['Email retry endpoint secret', (process.env.CRON_SECRET || '').length >= 32],
  [
    'Hosted database configuration',
    !!process.env.TURSO_DATABASE_URL && !!process.env.TURSO_AUTH_TOKEN,
  ],
];
try {
  await one('SELECT 1');
  checks.push(['Database connection', true]);
} catch {
  checks.push(['Database connection', false]);
} finally {
  closeDatabase();
}
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'MISSING'} ${name}`);
console.log(
  'Also verify a real email delivery, scheduled retries, database restore, and the hosted signup/RSVP flow before opening the pilot.',
);
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
