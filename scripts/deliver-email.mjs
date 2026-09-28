import { deliverEmails, requireEmail } from '../server/email.mjs';
import { closeDatabase } from '../server/db.mjs';

try {
  requireEmail();
  const result = await deliverEmails(undefined, { limit: 20 });
  console.log(JSON.stringify(result));
  if (result.failed) process.exitCode = 1;
} catch {
  console.error(
    'Email delivery could not run. Check the email configuration and database connection.',
  );
  process.exitCode = 1;
} finally {
  closeDatabase();
}
