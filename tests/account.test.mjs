import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.APP_MODE = 'live';
process.env.APP_URL = 'https://ampersand.example';
process.env.RESEND_API_KEY = 'test-only-key';
process.env.EMAIL_FROM = 'Ampersand <hello@example.com>';
process.env.EMAIL_ENCRYPTION_KEY = 'ab'.repeat(32);
process.env.CRON_SECRET = 'test-cron-secret-at-least-32-characters';
for (const key of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN', 'VERCEL']) delete process.env[key];
const { app } = await import('../server/app.mjs');
const { all, one, run, transaction, closeDatabase } = await import('../server/db.mjs');
const { queueAccountEmail, createAccountSession } = await import('../server/account.mjs');
const { queueEmail, deliverEmails, emailConfig } = await import('../server/email.mjs');
const actualFetch = globalThis.fetch;
const messages = [];
let providerStatus = 200,
  server,
  base;
globalThis.fetch = async (url, options) => {
  if (url === 'https://api.resend.com/emails') {
    messages.push({ ...JSON.parse(options.body), key: options.headers['Idempotency-Key'] });
    return new Response(JSON.stringify({ id: 'fake-provider-id' }), { status: providerStatus });
  }
  return actualFetch(url, options);
};
before(async () => {
  server = await new Promise((resolve, reject) => {
    const listener = app.listen(0, '127.0.0.1', (error) =>
      error ? reject(error) : resolve(listener),
    );
  });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  globalThis.fetch = actualFetch;
  await new Promise((resolve) => server.close(resolve));
  closeDatabase();
});
function client() {
  let cookie = '';
  return async (path, body, method = body === undefined ? 'GET' : 'POST') => {
    const response = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (response.headers.get('set-cookie'))
      cookie = response.headers.get('set-cookie').split(';')[0];
    return { status: response.status, body: await response.json() };
  };
}
const password = 'initial-password-123';
const register = (c, email, role = 'couple') =>
  c('/auth/register', { email, name: 'Pilot Person', role, password });
const tokenFor = (email, subject) =>
  messages
    .findLast((m) => m.to[0] === email && (!subject || m.subject.includes(subject)))
    .text.match(/#token=([a-f0-9]{64})/)[1];
async function verifiedClient(email, role = 'couple') {
  const c = client();
  assert.equal((await register(c, email, role)).status, 201);
  assert.equal((await c('/auth/verify-email', { token: tokenFor(email), password })).status, 200);
  assert.equal((await c('/auth/login', { email, password })).status, 200);
  return c;
}

test('live signup requires verification, protects private work, and consumes links once', async () => {
  const c = client(),
    email = 'verify@example.com';
  const registered = await register(c, email);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.user.verificationRequired, true);
  assert.equal(registered.body.user.emailVerified, false);
  assert.equal((await c('/workspace')).body.wedding, null);
  assert.equal((await c('/wedding', {})).status, 403);
  const raw = tokenFor(email);
  assert.match(messages.at(-1).text, /https:\/\/ampersand\.example\/verify-email#token=/);
  const token = await one(
    'SELECT * FROM account_tokens WHERE token_hash = ?',
    createHash('sha256').update(raw).digest('hex'),
  );
  assert.equal(token.purpose, 'verify');
  assert.equal(JSON.stringify(await all('SELECT * FROM account_tokens')).includes(raw), false);
  const before = messages.length;
  await c('/auth/resend-verification', {});
  assert.equal(messages.length, before);
  assert.equal(
    (await c('/auth/verify-email', { token: raw, password: 'incorrect-password' })).status,
    400,
  );
  const foreign = client();
  await register(foreign, 'foreign@example.com');
  assert.equal((await foreign('/auth/verify-email', { token: raw, password })).status, 409);
  const secondSession = client();
  await secondSession('/auth/login', { email, password });
  assert.equal((await c('/auth/verify-email', { token: raw, password })).status, 200);
  assert.equal((await secondSession('/workspace')).status, 401);
  assert.equal((await c('/auth/verify-email', { token: raw, password })).status, 400);
  assert.equal((await c('/auth/login', { email, password })).body.user.emailVerified, true);
  assert.equal((await c('/wedding', {})).status, 400); // Now reaches domain validation.
});

test('password recovery gives generic responses, expires tokens, and revokes every session', async () => {
  const email = 'reset@example.com',
    c = await verifiedClient(email),
    other = client();
  await other('/auth/login', { email, password });
  const known = await c('/auth/forgot-password', { email });
  const raw = tokenFor(email, 'Reset');
  const unknown = await client()('/auth/forgot-password', { email: 'missing@example.com' });
  assert.deepEqual(known, unknown);
  const before = messages.length;
  await c('/auth/forgot-password', { email });
  assert.equal(messages.length, before);
  assert.equal((await c('/auth/verify-email', { token: raw, password })).status, 400);
  const newPassword = 'replacement-password-456';
  const staleLogin = await one('SELECT * FROM users WHERE email = ?', email);
  const body = { token: raw, password: newPassword, confirmPassword: newPassword };
  assert.equal(
    (await c('/auth/reset-password', { ...body, confirmPassword: 'mismatch-password' })).status,
    400,
  );
  assert.equal(
    (await c('/auth/reset-password', { ...body, password: 'short', confirmPassword: 'short' }))
      .status,
    400,
  );
  const simultaneous = await Promise.all([
    client()('/auth/reset-password', body),
    client()('/auth/reset-password', body),
  ]);
  assert.deepEqual(simultaneous.map((r) => r.status).sort(), [200, 400]);
  await assert.rejects(createAccountSession(staleLogin), { status: 401 });
  assert.equal((await c('/workspace')).status, 401);
  assert.equal((await other('/workspace')).status, 401);
  assert.equal((await c('/auth/login', { email, password })).status, 401);
  assert.equal((await c('/auth/login', { email, password: newPassword })).status, 200);
  assert.equal(messages.at(-1).subject, 'Your Ampersand password was changed');
  assert.equal((await c('/auth/reset-password', body)).status, 400);
  const user = await one('SELECT * FROM users WHERE email = ?', email);
  await run('UPDATE email_outbox SET created_at = 0 WHERE user_id = ?', user.id);
  await c('/auth/forgot-password', { email });
  const expired = tokenFor(email, 'Reset');
  await run('UPDATE account_tokens SET expires_at = 0 WHERE user_id = ?', user.id);
  assert.equal((await c('/auth/reset-password', { ...body, token: expired })).status, 400);
});

test('failed deliveries retain encrypted messages, retry with stable keys, and never send demo mail', async () => {
  const c = client(),
    email = 'retry@example.com';
  providerStatus = 503;
  assert.equal((await register(c, email)).status, 201);
  const first = messages.at(-1);
  const user = await one('SELECT * FROM users WHERE email = ?', email);
  let row = await one('SELECT * FROM email_outbox WHERE user_id = ?', user.id);
  assert.equal(row.sent_at, null);
  assert.equal(row.last_error, 'provider_503');
  assert.equal(row.payload.includes(email), false);
  assert.equal(row.payload.includes(tokenFor(email)), false);
  assert.equal((await c('/workspace')).body.user.emailVerified, false);
  providerStatus = 200;
  await run('UPDATE email_outbox SET next_attempt_at = 0 WHERE id = ?', row.id);
  const results = await Promise.all([deliverEmails([row.id]), deliverEmails([row.id])]);
  assert.equal(
    results.reduce((n, r) => n + r.sent, 0),
    1,
  );
  assert.deepEqual(messages.at(-1), first);
  row = await one('SELECT * FROM email_outbox WHERE id = ?', row.id);
  assert.ok(row.sent_at);
  assert.equal(row.payload, '');
  const before = messages.length;
  await deliverEmails([row.id]);
  assert.equal(messages.length, before);
  process.env.APP_MODE = 'demo';
  assert.equal(
    await queueEmail(user.id, 'verify', { subject: 'Do not send', text: 'Sample' }),
    null,
  );
  assert.deepEqual(await deliverEmails(), { sent: 0, failed: 0 });
  assert.equal((await c('/auth/forgot-password', { email })).status, 403);
  const sample = client();
  const demo = await sample('/auth/demo', {});
  assert.equal(demo.status, 200);
  process.env.APP_MODE = 'standard';
  assert.equal(
    await queueEmail(demo.body.user.id, 'verify', { subject: 'Do not send', text: 'Sample' }),
    null,
  );
  process.env.APP_MODE = 'live';
});

test('account email enqueue is atomic, resend limits persist, and reset verifies an unverified address', async () => {
  const c = client(),
    email = 'limits@example.com';
  await register(c, email);
  const user = await one('SELECT * FROM users WHERE email = ?', email);
  const count = Number((await one('SELECT COUNT(*) AS count FROM email_outbox')).count);
  await run('UPDATE email_outbox SET created_at = 0 WHERE user_id = ?', user.id);
  await assert.rejects(
    transaction(async () => {
      await queueAccountEmail(user, 'verify');
      throw new Error('rollback');
    }),
  );
  assert.equal(Number((await one('SELECT COUNT(*) AS count FROM email_outbox')).count), count);
  for (let i = 0; i < 8; i++) {
    await run('UPDATE email_outbox SET created_at = 0 WHERE user_id = ?', user.id);
    await c('/auth/resend-verification', {});
  }
  assert.equal(
    Number(
      (
        await one(
          "SELECT COUNT(*) AS count FROM email_outbox WHERE user_id = ? AND kind = 'verify'",
          user.id,
        )
      ).count,
    ),
    5,
  );
  await c('/auth/forgot-password', { email });
  const newPassword = 'email-owner-password';
  assert.equal(
    (
      await c('/auth/reset-password', {
        token: tokenFor(email, 'Reset'),
        password: newPassword,
        confirmPassword: newPassword,
      })
    ).status,
    200,
  );
  assert.equal(
    (await c('/auth/login', { email, password: newPassword })).body.user.emailVerified,
    true,
  );
  assert.equal(
    Number(
      (await one('SELECT COUNT(*) AS count FROM account_tokens WHERE user_id = ?', user.id)).count,
    ),
    0,
  );
});

test('mail configuration rejects unsafe link origins and retry endpoint requires a secret', async () => {
  const original = process.env.APP_URL;
  for (const value of [
    'https://user:pass@example.com',
    'https://example.com/path',
    'https://example.com/?a=1',
    'http://example.com',
    'javascript:alert(1)',
  ]) {
    process.env.APP_URL = value;
    assert.equal(emailConfig(), null);
  }
  process.env.APP_URL = original;
  assert.ok(emailConfig());
  const missing = await fetch(base + '/internal/deliver-email');
  assert.equal(missing.status, 401);
  const invalid = await fetch(base + '/internal/deliver-email', {
    headers: { Authorization: 'Bearer wrong' },
  });
  assert.equal(invalid.status, 401);
  const accepted = await fetch(base + '/internal/deliver-email', {
    headers: { Authorization: `Bearer ${process.env.CRON_SECRET}` },
  });
  assert.equal(accepted.status, 200);
});

test('enquiry, quote, and selection emails reach only the intended verified account', async () => {
  const c = await verifiedClient('couple-notify@example.com');
  const v = await verifiedClient('vendor-notify@example.com', 'vendor');
  const w = await c('/wedding', {
    partner1: 'A',
    partner2: 'B',
    date: '2099-01-01',
    city: 'Singapore',
    guestEstimate: 80,
    totalBudget: 10000,
    currency: 'SGD',
    notes: '',
  });
  assert.equal(w.status, 201);
  const profile = await v(
    '/vendor/profile',
    {
      name: 'Pilot florist',
      category: 'Florals',
      city: 'Singapore',
      description: 'Wedding flowers',
      price: 100,
      currency: 'SGD',
      image: '',
      portfolio: [],
      packages: [],
    },
    'PUT',
  );
  assert.equal(profile.status, 200);
  await run('UPDATE vendors SET approved = 1 WHERE id = ?', profile.body.id);
  const e = await c('/wedding/enquiries', {
    vendorId: profile.body.id,
    message: 'Flowers for our wedding please.',
  });
  assert.equal(e.status, 201);
  assert.equal(messages.at(-1).subject, 'A new wedding enquiry on Ampersand');
  assert.deepEqual(messages.at(-1).to, ['vendor-notify@example.com']);
  const q = await v(`/vendor/enquiries/${e.body.id}/quotes`, {
    title: 'Flowers',
    description: 'Delivery included',
    expires: '2099-01-01',
    items: [{ name: 'Bouquet', price: 100, quantity: 1 }],
  });
  assert.equal(q.status, 201);
  assert.deepEqual(messages.at(-1).to, ['couple-notify@example.com']);
  assert.equal(messages.at(-1).subject, 'A new quote for your wedding');
  assert.equal((await c(`/wedding/quotes/${q.body.id}/select`, {})).status, 200);
  assert.deepEqual(messages.at(-1).to, ['vendor-notify@example.com']);
  assert.equal(messages.at(-1).subject, 'Your quote was selected on Ampersand');
  const before = messages.length;
  await c(`/wedding/quotes/${q.body.id}/select`, {});
  assert.equal(messages.length, before);
});
