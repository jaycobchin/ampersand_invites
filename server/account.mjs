import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import { one, run, transaction } from './db.mjs';
import { requireEmail, queueEmail, tryDeliverEmails } from './email.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const scryptAsync = promisify(scrypt);
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export const accountActions = [
  'forgot-password',
  'reset-password',
  'verify-email',
  'resend-verification',
];
const genericReset =
  'If an account exists for that address, we’ll email a password reset link. Check your inbox and spam folder.';

// Recheck credentials while inserting the session, so an in-flight login using
// an old password cannot create a session after recovery revoked access.
export async function createAccountSession(user) {
  const value = randomBytes(32).toString('base64url');
  await transaction(async () => {
    const current = await one('SELECT password_hash FROM users WHERE id = ?', user.id);
    if (!current || (user.password_hash && current.password_hash !== user.password_hash))
      fail(401, 'Your account changed. Please sign in again.');
    await run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
    await run(
      'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
      hash(value),
      user.id,
      Date.now() + 30 * 86400000,
    );
  });
  return value;
}

// All callers use a write transaction, so concurrent resends share the limit.
export async function queueAccountEmail(user, purpose) {
  if (user.demo_group) return null;
  const config = requireEmail(),
    now = Date.now();
  const limitKey = `email:${purpose}:${hash(user.email)}`;
  const limit = await one('SELECT * FROM auth_limits WHERE key = ?', limitKey);
  if (limit && limit.resets_at > now && limit.attempts >= 5) return null;
  const recent = await one(
    'SELECT id FROM email_outbox WHERE user_id = ? AND kind = ? AND created_at > ?',
    user.id,
    purpose,
    now - 60000,
  );
  if (recent) return null;
  await run(
    'INSERT INTO auth_limits (key, attempts, resets_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = CASE WHEN resets_at <= ? THEN 1 ELSE attempts + 1 END, resets_at = CASE WHEN resets_at <= ? THEN excluded.resets_at ELSE resets_at END',
    limitKey,
    now + 3600000,
    now,
    now,
  );
  const raw = randomBytes(32).toString('hex');
  const expiresAt = now + (purpose === 'reset' ? 30 * 60000 : 23 * 3600000);
  await run('DELETE FROM account_tokens WHERE expires_at <= ?', now);
  await run(
    'INSERT INTO account_tokens (token_hash, user_id, purpose, expires_at) VALUES (?, ?, ?, ?)',
    hash(raw),
    user.id,
    purpose,
    expiresAt,
  );
  // Fragment tokens stay out of server access logs and Referer headers.
  const path = purpose === 'reset' ? '/reset-password' : '/verify-email';
  const subject =
    purpose === 'reset' ? 'Reset your Ampersand password' : 'Verify your Ampersand email';
  const explanation =
    purpose === 'reset'
      ? 'Choose a new password using the link below. It expires in 30 minutes. If you did not request this, you can ignore this email.'
      : 'Confirm this email address to open your wedding or business workspace. This link expires in 23 hours. If you did not create this account, ignore this email.';
  return queueEmail(user.id, purpose, {
    subject,
    expiresAt,
    text: `${subject}\n\n${explanation}\n\n${config.origin}${path}#token=${raw}\n\nAmpersand Invites`,
  });
}

export async function handleAccountAction(req, res) {
  const action = req.params.action;
  if (!accountActions.includes(action)) return false;
  if (process.env.APP_MODE === 'demo') fail(403, 'Manage your real account on the live site.');
  if (action === 'forgot-password') {
    requireEmail();
    const email = z.email().max(254).parse(req.body.email).toLowerCase();
    const emailId = await transaction(async () => {
      const user = await one('SELECT * FROM users WHERE email = ? AND demo_group IS NULL', email);
      return user ? queueAccountEmail(user, 'reset') : null;
    });
    await tryDeliverEmails([emailId]);
    res.json({ message: genericReset });
    return true;
  }
  if (action === 'resend-verification') {
    if (!req.user || req.user.demo_group) fail(401, 'Please sign in to continue.');
    const emailId = await transaction(async () => {
      if (await one('SELECT user_id FROM verified_emails WHERE user_id = ?', req.user.id))
        return null;
      return queueAccountEmail(req.user, 'verify');
    });
    await tryDeliverEmails([emailId]);
    res.json({
      message:
        'Check your inbox and spam folder. If you recently requested a link, wait a minute before trying again.',
    });
    return true;
  }
  const raw = z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .parse(req.body.token);
  const purpose = action === 'reset-password' ? 'reset' : 'verify';
  const password = z.string().min(10).max(128).parse(req.body.password);
  let passwordHash;
  if (purpose === 'reset') {
    if (password !== req.body.confirmPassword) fail(400, 'The passwords do not match.');
    const salt = randomBytes(16).toString('hex');
    passwordHash = `${salt}:${(await scryptAsync(password, salt, 64)).toString('hex')}`;
  }
  const emailId = await transaction(async () => {
    const row = await one(
      'SELECT t.*, u.email, u.demo_group, u.password_hash FROM account_tokens t JOIN users u ON u.id = t.user_id WHERE t.token_hash = ? AND t.purpose = ? AND t.expires_at > ?',
      hash(raw),
      purpose,
      Date.now(),
    );
    if (!row || row.demo_group)
      fail(400, 'This link has expired or has already been used. Please request a new one.');
    if (purpose === 'verify' && req.user && req.user.id !== row.user_id)
      fail(409, 'This link belongs to another account. Sign out, then open the link again.');
    if (purpose === 'verify') {
      // Both mailbox access and the chosen password are required. Clicking a
      // verification message must not activate an account created by someone else.
      const [salt, expected] = row.password_hash.split(':');
      const actual = await scryptAsync(password, salt, 64);
      if (!timingSafeEqual(Buffer.from(expected, 'hex'), actual))
        fail(
          400,
          'The password is incorrect. Use the password you chose when signing up, or reset it from the sign-in page.',
        );
    } else {
      await run('UPDATE users SET password_hash = ? WHERE id = ?', passwordHash, row.user_id);
    }
    // Resetting via an emailed link also proves ownership of the address.
    await run(
      'INSERT INTO verified_emails (user_id, verified_at) VALUES (?, ?) ON CONFLICT(user_id) DO NOTHING',
      row.user_id,
      Date.now(),
    );
    await run('DELETE FROM sessions WHERE user_id = ?', row.user_id);
    await run(
      'DELETE FROM account_tokens WHERE user_id = ? AND (purpose = ? OR ? = ?)',
      row.user_id,
      purpose,
      purpose,
      'reset',
    );
    await run(
      "UPDATE email_outbox SET payload = '', expires_at = ? WHERE user_id = ? AND (kind = ? OR (? = 'reset' AND kind = 'verify')) AND sent_at IS NULL",
      Date.now(),
      row.user_id,
      purpose,
      purpose,
    );
    if (purpose === 'reset')
      return queueEmail(row.user_id, 'password-changed', {
        subject: 'Your Ampersand password was changed',
        text: 'Your password has been changed and all existing sessions have been signed out. If you did not make this change, reset your password from the Ampersand sign-in page immediately.',
      });
    return null;
  });
  res.clearCookie('ampersand_session', { path: '/' });
  await tryDeliverEmails([emailId]);
  res.json({
    message:
      purpose === 'reset'
        ? 'Your password has been changed. Sign in with your new password.'
        : 'Your email is verified. Sign in to continue.',
  });
  return true;
}
