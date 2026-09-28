import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { all, one, run, transaction } from './db.mjs';

export function verificationRequired() {
  return process.env.APP_MODE === 'live' || process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
}

export function emailConfig() {
  let origin;
  try {
    const url = new URL(process.env.APP_URL);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    )
      return null;
    origin = url.origin;
  } catch {
    return null;
  }
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM ||
    !/^[a-f0-9]{64}$/i.test(process.env.EMAIL_ENCRYPTION_KEY || '')
  )
    return null;
  return {
    origin,
    from: process.env.EMAIL_FROM,
    key: Buffer.from(process.env.EMAIL_ENCRYPTION_KEY, 'hex'),
  };
}

export function requireEmail() {
  const config = emailConfig();
  if (!config)
    throw Object.assign(
      new Error('Account email is temporarily unavailable. Please try again later.'),
      { status: 503 },
    );
  return config;
}

function encrypt(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64');
}

function decrypt(value, key) {
  const bytes = Buffer.from(value, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'),
  );
}

// Only account mail may go to an unverified address. Never send from demo mode.
export async function queueEmail(userId, kind, { subject, text, expiresAt }) {
  if (process.env.APP_MODE === 'demo') return null;
  const config = emailConfig();
  if (!config) return null;
  const user = await one(
    'SELECT u.*, v.verified_at FROM users u LEFT JOIN verified_emails v ON v.user_id = u.id WHERE u.id = ?',
    userId,
  );
  if (!user || user.demo_group || (!['verify', 'reset'].includes(kind) && !user.verified_at))
    return null;
  const now = Date.now(),
    id = randomUUID();
  await run(
    'INSERT INTO email_outbox (id, user_id, kind, payload, created_at, expires_at, next_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    userId,
    kind,
    encrypt({ from: config.from, to: [user.email], subject, text }, config.key),
    now,
    Math.min(expiresAt || now + 23 * 3600000, now + 23 * 3600000),
    now,
  );
  return id;
}

export async function queueNotification(req, userId, kind, subject, message, path) {
  if (req.user?.demo_group || !emailConfig()) return;
  const id = await queueEmail(userId, kind, {
    subject,
    text: `${message}\n\nOpen Ampersand: ${emailConfig().origin}${path}\n\nAmpersand Invites`,
  });
  if (id) (req.emailIds ||= []).push(id);
}

// Claim briefly in a DB transaction, then release it before contacting Resend.
// Stable provider idempotency keys protect retries if delivery succeeded but the
// process stopped before marking the row sent. Payloads expire within 24 hours.
export async function deliverEmails(ids, { limit = 5, transport = fetch } = {}) {
  const config = emailConfig();
  if (!config || process.env.APP_MODE === 'demo') return { sent: 0, failed: 0 };
  const now = Date.now();
  await run(
    "UPDATE email_outbox SET payload = '', last_error = 'expired' WHERE sent_at IS NULL AND expires_at <= ? AND payload != ''",
    now,
  );
  const candidates =
    ids === undefined
      ? await all(
          'SELECT id FROM email_outbox WHERE sent_at IS NULL AND next_attempt_at <= ? AND expires_at > ? AND lease_until <= ? ORDER BY created_at LIMIT ?',
          now,
          now,
          now,
          limit,
        )
      : ids
          .filter(Boolean)
          .slice(0, limit)
          .map((id) => ({ id }));
  const result = { sent: 0, failed: 0 };
  for (const candidate of candidates) {
    const row = await transaction(async () => {
      const item = await one(
        'SELECT * FROM email_outbox WHERE id = ? AND sent_at IS NULL AND next_attempt_at <= ? AND lease_until <= ? AND expires_at > ?',
        candidate.id,
        Date.now(),
        Date.now(),
        Date.now(),
      );
      if (!item) return null;
      await run(
        'UPDATE email_outbox SET lease_until = ?, attempts = attempts + 1 WHERE id = ?',
        Date.now() + 60000,
        item.id,
      );
      return item;
    });
    if (!row) continue;
    let errorCode = 'delivery_failed';
    try {
      const response = await transport('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `ampersand/${row.id}`,
        },
        body: JSON.stringify(decrypt(row.payload, config.key)),
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        errorCode = `provider_${response.status}`;
        throw new Error(errorCode);
      }
      await run(
        "UPDATE email_outbox SET sent_at = ?, payload = '', lease_until = 0, last_error = NULL WHERE id = ?",
        Date.now(),
        row.id,
      );
      result.sent++;
    } catch {
      // Never log recipient addresses, message bodies, provider bodies, or tokens.
      await run(
        'UPDATE email_outbox SET lease_until = 0, next_attempt_at = ?, last_error = ? WHERE id = ?',
        Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(row.attempts, 6)),
        errorCode,
        row.id,
      );
      result.failed++;
    }
  }
  return result;
}

// Email failures must not roll back a successfully saved enquiry or account.
export async function tryDeliverEmails(ids) {
  if (!ids?.length) return;
  try {
    await deliverEmails(ids);
  } catch {
    console.error('Email queue unavailable; pending messages need a retry.');
  }
}
