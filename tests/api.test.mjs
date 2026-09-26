import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

process.env.DATABASE_PATH = ':memory:';
process.env.NODE_ENV = 'test';
const { app } = await import('../server/app.mjs');
const { one, run } = await import('../server/db.mjs');
const { budgetTotals } = await import('../server/domain.mjs');
let server, base;
before(async () => {
  server = await new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => resolve(server));
  });
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise((resolve) => server.close(resolve)));

function client() {
  let cookie = '';
  return async (path, method = 'GET', body, extraHeaders = {}) => {
    const res = await fetch(base + '/api' + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(cookie ? { Cookie: cookie } : {}),
        ...extraHeaders,
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: res.status, body: await res.json(), headers: res.headers };
  };
}
const register = async (c, email, role = 'couple') =>
  c('/auth/register', 'POST', {
    name: 'Test Person',
    email,
    password: 'a-long-test-password',
    role,
  });
const weddingInput = {
  partner1: 'Alice',
  partner2: '李',
  date: '2027-09-25',
  city: 'Singapore',
  guestEstimate: 80,
  totalBudget: 40000,
  currency: 'SGD',
  notes: '',
};
const eventInput = {
  name: 'Our ceremony',
  date: '2027-09-25',
  time: '16:30',
  venue: 'Garden',
  address: 'Singapore',
  description: '',
  dressCode: '',
  visibility: 'invited_only',
};
const guestInput = {
  firstName: 'Guest',
  lastName: 'One',
  email: 'guest@example.com',
  phone: '',
  group: 'Household',
  tags: 'Family',
  dietary: '',
  eventIds: [],
  plusOne: false,
};

test('accounts use hashed credentials, persist sessions, reject duplicates, and protect private endpoints', async () => {
  const c = client();
  assert.equal((await c('/workspace')).status, 401);
  assert.equal((await register(c, 'account@example.com')).status, 201);
  const user = one('SELECT * FROM users WHERE email = ?', 'account@example.com');
  assert.match(user.password_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal((await c('/workspace')).body.user.name, 'Test Person');
  assert.equal((await register(client(), 'account@example.com')).status, 409);
  assert.equal((await c('/auth/logout', 'POST', {})).status, 200);
  assert.equal((await c('/workspace')).status, 401);
  assert.equal(
    (
      await c('/auth/login', 'POST', {
        email: 'account@example.com',
        password: 'wrong-password-here',
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await c('/auth/login', 'POST', {
        email: 'account@example.com',
        password: 'a-long-test-password',
      })
    ).status,
    200,
  );
  assert.equal(
    (await c('/auth/logout', 'POST', {}, { Origin: 'https://untrusted.example' })).status,
    403,
  );
  assert.equal((await c('/workspace')).headers.get('cache-control'), 'no-store');
});

test('wedding setup validates dates and generates date-relative tasks and reconcilable budget targets', async () => {
  const c = client();
  await register(c, 'setup@example.com');
  assert.equal((await c('/wedding', 'POST', { ...weddingInput, date: '2027-02-30' })).status, 400);
  const result = await c('/wedding', 'POST', weddingInput);
  assert.equal(result.status, 201);
  assert.equal(result.body.tasks.length, 12);
  assert.equal(result.body.tasks.at(-1).due, '2027-09-24');
  assert.equal(
    result.body.budget.reduce((n, b) => n + b.target, 0),
    40000,
  );
  assert.equal((await c('/wedding', 'POST', weddingInput)).status, 409);
  assert.equal((await c('/wedding/constructor', 'POST', {})).status, 404);
  assert.equal(
    (await c('/wedding/budget', 'POST', { name: 'Venue', target: 1, committed: 0, paid: 0 }))
      .status,
    409,
  );
});

test('public pages and RSVP tokens expose only permitted data; updates are household scoped and atomic', async () => {
  const c = client(),
    publicClient = client();
  await register(c, 'rsvp@example.com');
  const w = (await c('/wedding', 'POST', weddingInput)).body;
  const event = (await c('/wedding/events', 'POST', eventInput)).body;
  const otherEvent = (
    await c('/wedding/events', 'POST', {
      ...eventInput,
      name: 'Another celebration',
      visibility: 'public',
    })
  ).body;
  const guest = (
    await c('/wedding/guests', 'POST', { ...guestInput, eventIds: [event.id], plusOne: true })
  ).body;
  const otherGuest = (
    await c('/wedding/guests', 'POST', {
      ...guestInput,
      firstName: 'Other',
      email: 'other@example.com',
      group: 'Other household',
      eventIds: [otherEvent.id],
    })
  ).body;
  let workspace = (await c('/workspace')).body;
  const group = workspace.wedding.groups.find((g) => g.id === guest.groupId),
    invitePath = `/invite/${group.token}`;
  assert.equal((await publicClient(invitePath)).status, 404);
  assert.equal((await publicClient(`/w/${w.slug}`)).status, 404);
  assert.equal((await c('/wedding', 'PATCH', { published: true })).status, 200);
  const page = (await publicClient(`/w/${w.slug}`)).body.wedding;
  assert.equal(page.events.length, 1);
  assert.equal(page.events[0].id, otherEvent.id);
  for (const field of ['guests', 'budget', 'totalBudget', 'ownerId', 'groups', 'selections'])
    assert.equal(page[field], undefined);
  const invite = (await publicClient(invitePath)).body;
  assert.equal(invite.guests.length, 2);
  assert.deepEqual(
    invite.wedding.events.map((e) => e.id),
    [event.id],
  );
  assert.equal(invite.guests[0].email, undefined);
  assert.equal((await publicClient('/invite/not-a-valid-token')).status, 404);
  const answers = invite.guests.map((g) => ({
    id: g.id,
    firstName: g.isPlusOne ? 'Plus' : 'Attempted name change',
    lastName: 'Guest',
    dietary: 'Vegetarian; peanut allergy',
    responses: { [event.id]: 'attending' },
  }));
  assert.equal(
    (
      await publicClient(`${invitePath}/rsvp`, 'POST', {
        guests: [...answers, { ...answers[0], id: otherGuest.id }],
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await publicClient(`${invitePath}/rsvp`, 'POST', {
        guests: [{ ...answers[0], responses: { [otherEvent.id]: 'attending' } }, answers[1]],
      })
    ).status,
    403,
  );
  assert.equal(
    (await publicClient(`${invitePath}/rsvp`, 'POST', { guests: [answers[0]] })).status,
    400,
  );
  assert.equal(
    (await c('/workspace')).body.wedding.guests.find((g) => g.id === guest.id).dietary,
    '',
  );
  assert.equal((await publicClient(`${invitePath}/rsvp`, 'POST', { guests: answers })).status, 200);
  workspace = (await c('/workspace')).body;
  const saved = workspace.wedding.guests.find((g) => g.id === guest.id);
  assert.equal(saved.responses[event.id], 'attending');
  assert.equal(saved.firstName, 'Guest');
  assert.equal(saved.dietary, 'Vegetarian; peanut allergy');
  assert.ok(saved.respondedAt);
  assert.equal(workspace.wedding.guests.find((g) => g.isPlusOne).firstName, 'Plus');
  await c('/wedding', 'PATCH', { visibility: 'invite_only' });
  assert.equal((await publicClient(`/w/${w.slug}`)).status, 404);
  assert.equal((await publicClient(invitePath)).status, 200);
  await c(`/wedding/events/${event.id}`, 'DELETE', {});
  assert.equal((await publicClient(invitePath)).body.wedding.events.length, 0);
  await c('/wedding', 'PATCH', { published: false });
  assert.equal((await publicClient(invitePath)).status, 404);
});

test('CSV preview reports invalid and duplicate rows; import is all-or-nothing and supports column mapping', async () => {
  const c = client();
  await register(c, 'import@example.com');
  await c('/wedding', 'POST', weddingInput);
  const preview = await c('/wedding/guests/import/preview', 'POST', {
    csv: 'first_name,last_name,email\n"Anna, Marie",Lee,anna@example.com\n,Lee,bad\nBob,Tan,anna@example.com',
  });
  assert.equal(preview.status, 200);
  assert.equal(preview.body.rows.length, 1);
  assert.equal(preview.body.rows[0].firstName, 'Anna, Marie');
  assert.equal(preview.body.errors.length, 2);
  assert.equal(preview.body.errors[0].row, 3);
  const mapped = await c('/wedding/guests/import/preview', 'POST', {
    csv: 'Given,Surname,Contact\nZoë,陈,zoe@example.com',
    mapping: { firstName: 'Given', lastName: 'Surname', email: 'Contact' },
  });
  assert.equal(mapped.body.errors.length, 0);
  assert.equal(mapped.body.rows[0].firstName, 'Zoë');
  assert.equal(
    (
      await c('/wedding/guests/import', 'POST', {
        rows: [...mapped.body.rows, ...mapped.body.rows],
      })
    ).status,
    409,
  );
  assert.equal((await c('/workspace')).body.wedding.guests.length, 0);
  assert.equal(
    (await c('/wedding/guests/import', 'POST', { rows: mapped.body.rows })).body.imported,
    1,
  );
  assert.equal(
    (
      await c('/wedding/guests/import/preview', 'POST', {
        csv: 'first_name,email\nZoë,zoe@example.com',
      })
    ).body.errors.length,
    1,
  );
});

test('collaborators must possess the matching email invitation; permissions remain owner scoped', async () => {
  const owner = client(),
    helper = client(),
    stranger = client();
  await register(owner, 'owner@example.com');
  await owner('/wedding', 'POST', weddingInput);
  await register(helper, 'helper@example.com');
  await register(stranger, 'stranger@example.com');
  const invite = (await owner('/wedding/collaborators', 'POST', { email: 'helper@example.com' }))
    .body;
  assert.equal((await stranger(invite.path, 'POST', {})).status, 403);
  assert.equal((await helper(invite.path, 'POST', {})).status, 200);
  const helperSpace = (await helper('/workspace')).body;
  assert.equal(helperSpace.wedding.partner1, 'Alice');
  assert.equal((await helper('/wedding/events', 'POST', eventInput)).status, 201);
  assert.equal((await helper('/wedding', 'PATCH', { published: true })).status, 403);
  assert.equal(
    (await helper('/wedding/collaborators', 'POST', { email: 'another@example.com' })).status,
    403,
  );
  await owner(`/wedding/collaborators/${helperSpace.user.id}`, 'DELETE', {});
  assert.equal((await helper('/workspace')).body.wedding, null);
  assert.equal((await helper('/wedding/tasks', 'POST', { title: 'No access' })).status, 404);
});

test('vendors can only see their own leads; quotes calculate totals server-side and selection is idempotent', async () => {
  const couple = client(),
    vendor = client(),
    outsider = client(),
    unrelatedCouple = client();
  await register(couple, 'quotes-couple@example.com');
  await couple('/wedding', 'POST', weddingInput);
  await register(vendor, 'florist@example.com', 'vendor');
  await register(outsider, 'other-vendor@example.com', 'vendor');
  await register(unrelatedCouple, 'unrelated-couple@example.com');
  await unrelatedCouple('/wedding', 'POST', weddingInput);
  const input = {
    name: 'A real studio',
    category: 'Florals',
    city: 'Singapore',
    description: 'Flowers for lovely weddings.',
    price: 1000,
    currency: 'SGD',
    image: '/images/flowers.jpg',
    portfolio: [],
    packages: [],
  };
  const profile = (await vendor('/vendor/profile', 'PUT', input)).body;
  assert.equal(
    (await couple('/workspace')).body.vendors.some((v) => v.id === profile.id),
    false,
  );
  run('UPDATE vendors SET approved = 1 WHERE id = ?', profile.id);
  assert.equal(
    (await couple('/workspace')).body.vendors.some((v) => v.id === profile.id),
    true,
  );
  assert.equal((await outsider('/wedding', 'POST', weddingInput)).status, 403);
  const enquiry = (
    await couple('/wedding/enquiries', 'POST', {
      vendorId: profile.id,
      message: 'Seasonal flowers for our celebration please.',
    })
  ).body;
  assert.equal(
    (
      await couple('/wedding/enquiries', 'POST', {
        vendorId: profile.id,
        message: 'Please send another enquiry.',
      })
    ).status,
    409,
  );
  assert.equal((await outsider('/workspace')).body.enquiries.length, 0);
  const leads = (await vendor('/workspace')).body.enquiries;
  assert.equal(leads.length, 1);
  assert.equal(leads[0].wedding.totalBudget, undefined);
  assert.equal(leads[0].wedding.guests, undefined);
  const quoteInput = {
    title: 'Garden collection',
    description: 'Setup included.',
    expires: '2099-01-01',
    items: [
      { name: 'Bouquet', quantity: 1, price: 100.1 },
      { name: 'Tables', quantity: 3, price: 50.2 },
    ],
    total: 1,
  };
  assert.equal(
    (await outsider(`/vendor/enquiries/${enquiry.id}/quotes`, 'POST', quoteInput)).status,
    404,
  );
  assert.equal(
    (
      await vendor(`/vendor/enquiries/${enquiry.id}/quotes`, 'POST', {
        ...quoteInput,
        expires: '2000-01-01',
      })
    ).status,
    400,
  );
  const quote = (await vendor(`/vendor/enquiries/${enquiry.id}/quotes`, 'POST', quoteInput)).body;
  assert.equal(quote.total, 250.7);
  assert.equal(
    (await unrelatedCouple(`/wedding/quotes/${quote.id}/select`, 'POST', {})).status,
    404,
  );
  assert.equal((await outsider(`/quotes/${quote.id}`)).status, 404);
  assert.equal((await couple(`/quotes/${quote.id}/viewed`, 'POST', {})).status, 200);
  for (let i = 0; i < 2; i++)
    assert.equal((await couple(`/wedding/quotes/${quote.id}/select`, 'POST', {})).status, 200);
  let w = (await couple('/workspace')).body.wedding;
  assert.equal(w.selections.length, 1);
  assert.equal(budgetTotals(w).committed, 250.7);
  assert.equal(w.tasks.find((t) => t.category === 'Florals').done, true);
  assert.equal((await couple('/wedding', 'PATCH', { currency: 'USD' })).status, 400);
  const replacement = (
    await vendor(`/vendor/enquiries/${enquiry.id}/quotes`, 'POST', {
      ...quoteInput,
      items: [{ name: 'Revised flowers', quantity: 1, price: 400 }],
    })
  ).body;
  await couple(`/wedding/quotes/${replacement.id}/select`, 'POST', {});
  w = (await couple('/workspace')).body.wedding;
  assert.equal(w.selections.length, 1);
  assert.equal(budgetTotals(w).committed, 400);
  assert.equal((await couple(`/quotes/${quote.id}`)).body.status, 'superseded');
  const budget = w.budget.find((b) => b.name === 'Florals');
  await couple(`/wedding/budget/${budget.id}`, 'PATCH', { ...budget, committed: 100, paid: 50 });
  assert.equal(budgetTotals((await couple('/workspace')).body.wedding).committed, 500);
});

test('sample workspaces and sample vendors are isolated from each other and real accounts', async () => {
  const a = client(),
    b = client(),
    real = client();
  assert.equal((await a('/auth/demo', 'POST', {})).status, 200);
  await b('/auth/demo', 'POST', {});
  await register(real, 'real-person@example.com');
  const wa = (await a('/workspace')).body,
    wb = (await b('/workspace')).body;
  assert.equal(wa.vendors.length, 6);
  assert.equal(wb.vendors.length, 6);
  assert.notEqual(wa.wedding.id, wb.wedding.id);
  assert.equal(
    wa.vendors.some((v) => wb.vendors.some((other) => other.id === v.id)),
    false,
  );
  assert.equal(
    (await real('/workspace')).body.vendors.some((v) => v.demo),
    false,
  );
  assert.equal(
    (await a('/auth/demo-role', 'POST', { role: 'vendor', vendorId: wb.vendors[0].id })).status,
    404,
  );
  await a('/auth/demo-role', 'POST', { role: 'vendor' });
  const vendorSpace = (await a('/workspace')).body;
  assert.equal(vendorSpace.user.role, 'vendor');
  assert.equal(vendorSpace.enquiries.length, 1);
  await a('/auth/demo-role', 'POST', { role: 'couple' });
  assert.equal((await a('/workspace')).body.wedding.id, wa.wedding.id);
});

test('saved database records survive a process restart', () => {
  const directory = mkdtempSync(join(tmpdir(), 'ampersand-persistence-'));
  const env = { ...process.env, DATABASE_PATH: join(directory, 'test.sqlite') };
  try {
    execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const { run } = await import('./server/db.mjs'); run('INSERT INTO users (id,email,name,password_hash,role) VALUES (?,?,?,?,?)','persisted','persisted@example.com','Kept safely','hash','couple');",
      ],
      { cwd: process.cwd(), env, stdio: 'pipe' },
    );
    const output = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const { one } = await import('./server/db.mjs'); console.log(one('SELECT name FROM users WHERE id = ?','persisted').name);",
      ],
      { cwd: process.cwd(), env, encoding: 'utf8', stdio: 'pipe' },
    );
    assert.equal(output.trim(), 'Kept safely');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
