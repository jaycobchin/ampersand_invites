import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { scrypt, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { all, one, run, transaction, batch } from './db.mjs';
import {
  id,
  token,
  createWedding,
  publicWedding,
  quoteTotal,
  selectQuote,
  today,
} from './domain.mjs';
import {
  authSchema,
  weddingSchema,
  weddingPatch,
  schemas,
  vendorSchema,
  quoteSchema,
  rsvpSchema,
} from './validation.mjs';
import { seedDemo } from './demo.mjs';
import { atomicRoute } from './atomic-route.mjs';
import { allowedOrigins } from './origins.mjs';
const scryptAsync = promisify(scrypt);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (row) => (row ? JSON.parse(row.data) : null);
const fail = (status, message) => {
  const error = new Error(message);
  error.status = status;
  throw error;
};
const production = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';
export const app = express();
if (production) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(
  helmet({
    contentSecurityPolicy: production
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'https:', 'data:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
          },
        }
      : false,
    referrerPolicy: {
      policy: 'no-referrer',
    },
    crossOriginEmbedderPolicy: false,
    strictTransportSecurity: production ? undefined : false,
  }),
);
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Please wait a moment and try again.',
    },
  }),
);
app.use('/api', (req, res, next) => {
  if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) {
    const origin = req.get('origin');
    const allowed = allowedOrigins(req);
    if (production && !allowed.size)
      return res.status(503).json({ error: 'The application URL has not been configured.' });
    if (origin && !allowed.has(origin))
      return res.status(403).json({ error: 'This request came from an unrecognised website.' });
    if (req.headers['content-length'] !== '0' && !req.is('application/json'))
      return res.status(415).json({
        error: 'Please send JSON.',
      });
  }
  next();
});
app.use(
  express.json({
    limit: '1mb',
  }),
);
app.use('/api', async (req, _res, next) => {
  const session = req.headers.cookie
    ?.split(';')
    .map((x) => x.trim())
    .find((x) => x.startsWith('ampersand_session='))
    ?.slice(18);
  if (session)
    req.user = await one(
      'SELECT u.* FROM users u JOIN sessions s ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?',
      hash(session),
      Date.now(),
    );
  next();
});
const auth = (req, _res, next) => {
  if (!req.user)
    return next(
      Object.assign(new Error('Please sign in to continue.'), {
        status: 401,
      }),
    );
  next();
};
const couple = (req, _res, next) => {
  if (req.user.role !== 'couple')
    return next(
      Object.assign(new Error('A couple account is required.'), {
        status: 403,
      }),
    );
  next();
};
const weddingAccess = async (req, _res, next) => {
  const row = await one(
    'SELECT w.* FROM weddings w LEFT JOIN members m ON m.wedding_id = w.id WHERE w.owner_id = ? OR m.user_id = ? LIMIT 1',
    req.user.id,
    req.user.id,
  );
  if (!row)
    return next(
      Object.assign(new Error('Create your wedding first.'), {
        status: 404,
      }),
    );
  req.wedding = json(row);
  next();
};
async function saveWedding(w) {
  const current = await all('SELECT token, group_id FROM guest_tokens WHERE wedding_id = ?', w.id);
  const statements = [
    {
      sql: 'UPDATE weddings SET data = ?, slug = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      args: [JSON.stringify(w), w.slug, w.id],
    },
  ];
  for (const existing of current) {
    if (!w.groups.some((g) => g.id === existing.group_id && g.token === existing.token))
      statements.push({ sql: 'DELETE FROM guest_tokens WHERE token = ?', args: [existing.token] });
  }
  for (const group of w.groups) {
    if (!current.some((g) => g.group_id === group.id && g.token === group.token))
      statements.push({
        sql: 'INSERT INTO guest_tokens (token, wedding_id, group_id) VALUES (?, ?, ?)',
        args: [group.token, w.id, group.id],
      });
  }
  await batch(statements);
}
async function sessionFor(res, user) {
  const value = token();
  await run('DELETE FROM sessions WHERE expires_at < ?', Date.now());
  await run(
    'INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
    hash(value),
    user.id,
    Date.now() + 30 * 86400000,
  );
  res.cookie('ampersand_session', value, {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
    maxAge: 30 * 86400000,
  });
}
const safeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.demo_group ? 'Sample workspace' : user.email,
  role: user.role,
  demo: !!user.demo_group,
});
async function visibleVendors(user) {
  const rows = user?.demo_group
    ? await all(
        'SELECT v.* FROM vendors v JOIN users u ON u.id = v.owner_id WHERE v.approved = 1 AND u.demo_group = ?',
        user.demo_group,
      )
    : await all(
        'SELECT v.* FROM vendors v JOIN users u ON u.id = v.owner_id WHERE v.approved = 1 AND u.demo_group IS NULL',
      );
  return rows.map((row) => ({
    ...json(row),
    approved: true,
  }));
}
async function vendorFor(req) {
  const row = await one('SELECT * FROM vendors WHERE owner_id = ?', req.user.id);
  if (!row) fail(404, 'Create your business profile first.');
  return {
    ...json(row),
    approved: !!row.approved,
  };
}
async function quoteWithVendor(row) {
  return {
    ...json(row),
    vendor: json(
      await one(
        'SELECT v.* FROM vendors v JOIN enquiries e ON e.vendor_id = v.id WHERE e.id = ?',
        row.enquiry_id,
      ),
    ),
  };
}
async function workspace(req) {
  const user = safeUser(req.user);
  if (user.role === 'vendor') {
    const vendorRow = await one('SELECT * FROM vendors WHERE owner_id = ?', user.id);
    const vendor = vendorRow ? { ...json(vendorRow), approved: !!vendorRow.approved } : null;
    const rows = vendor
      ? await all(
          'SELECT e.*, w.data AS wedding_data FROM enquiries e JOIN weddings w ON w.id = e.wedding_id WHERE e.vendor_id = ?',
          vendor.id,
        )
      : [];
    const quotes = vendor
      ? await all(
          'SELECT q.* FROM quotes q JOIN enquiries e ON e.id = q.enquiry_id WHERE e.vendor_id = ?',
          vendor.id,
        )
      : [];
    const enquiries = rows.map((row) => {
      const w = JSON.parse(row.wedding_data);
      return {
        ...json(row),
        wedding: {
          partner1: w.partner1,
          partner2: w.partner2,
          date: w.date,
          city: w.city,
          guestEstimate: w.guestEstimate,
          currency: w.currency,
          events: w.events.map((e) => ({
            name: e.name,
            date: e.date,
            time: e.time,
            venue: e.venue,
          })),
        },
        quotes: quotes.filter((q) => q.enquiry_id === row.id).map(json),
      };
    });
    return { user, vendor, enquiries, vendors: [], quotes: [], wedding: null };
  }
  const row = await one(
    'SELECT w.* FROM weddings w LEFT JOIN members m ON m.wedding_id = w.id WHERE w.owner_id = ? OR m.user_id = ? LIMIT 1',
    user.id,
    user.id,
  );
  const wedding = json(row);
  if (wedding)
    wedding.members = await all(
      'SELECT u.id, u.name, u.email FROM users u JOIN members m ON u.id = m.user_id WHERE m.wedding_id = ?',
      wedding.id,
    );
  const quotes = wedding
    ? await all(
        'SELECT q.*, v.data AS vendor_data FROM quotes q JOIN enquiries e ON e.id = q.enquiry_id JOIN vendors v ON v.id = e.vendor_id WHERE e.wedding_id = ?',
        wedding.id,
      )
    : [];
  return {
    user,
    wedding,
    vendors: await visibleVendors(req.user),
    enquiries: wedding
      ? (await all('SELECT * FROM enquiries WHERE wedding_id = ?', wedding.id)).map(json)
      : [],
    quotes: quotes.map((row) => ({ ...json(row), vendor: JSON.parse(row.vendor_data) })),
  };
}

app.get('/api/health', async (_req, res) => {
  await one('SELECT 1');
  res.json({
    status: 'ok',
  });
});
app.get('/api/config', (_req, res) =>
  res.json({
    demoEnabled: process.env.ENABLE_DEMO !== 'false',
  }),
);
app.post('/api/auth/:action', async (req, res) => {
  const action = req.params.action;
  if (!['register', 'login', 'logout', 'demo', 'demo-role'].includes(action))
    fail(404, 'Not found.');
  if (action === 'logout') {
    const value = req.headers.cookie
      ?.split(';')
      .map((x) => x.trim())
      .find((x) => x.startsWith('ampersand_session='))
      ?.slice(18);
    if (value) await run('DELETE FROM sessions WHERE token_hash = ?', hash(value));
    res.clearCookie('ampersand_session', {
      path: '/',
    });
    return res.json({
      ok: true,
    });
  }
  const limitKey = hash(req.ip || 'unknown');
  await transaction(async () => {
    await run('DELETE FROM auth_limits WHERE resets_at < ?', Date.now());
    const limit = await one('SELECT * FROM auth_limits WHERE key = ?', limitKey);
    if (limit && limit.attempts >= (process.env.NODE_ENV === 'test' ? 1000 : 30))
      fail(429, 'Too many attempts. Please try again in 15 minutes.');
    await run(
      'INSERT INTO auth_limits (key, attempts, resets_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1',
      limitKey,
      Date.now() + 900000,
    );
  });
  if (action === 'demo') {
    if (process.env.ENABLE_DEMO === 'false') fail(404, 'The demo is unavailable.');
    const user = await transaction(seedDemo);
    await sessionFor(res, user);
    return res.json({
      user: safeUser(user),
    });
  }
  if (action === 'demo-role') {
    if (!req.user?.demo_group) fail(403, 'This action is only available in a sample workspace.');
    const target = z.enum(['couple', 'vendor']).parse(req.body.role);
    const vendorId = z.string().optional().parse(req.body.vendorId);
    const user =
      target === 'vendor' && vendorId
        ? await one(
            'SELECT u.* FROM users u JOIN vendors v ON u.id = v.owner_id WHERE u.demo_group = ? AND v.id = ?',
            req.user.demo_group,
            vendorId,
          )
        : await one(
            'SELECT * FROM users WHERE demo_group = ? AND role = ? LIMIT 1',
            req.user.demo_group,
            target,
          );
    if (!user) fail(404, 'Sample account not found.');
    await sessionFor(res, user);
    return res.json({
      user: safeUser(user),
    });
  }
  const input = authSchema.parse(req.body);
  if (action === 'register') {
    if (!input.name || !input.role) fail(400, 'Your name and account type are required.');
    if (await one('SELECT id FROM users WHERE email = ?', input.email))
      fail(409, 'An account with this email already exists. Please sign in.');
    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${(await scryptAsync(input.password, salt, 64)).toString('hex')}`;
    const user = {
      id: id(),
      ...input,
    };
    try {
      await run(
        'INSERT INTO users (id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        user.id,
        input.email,
        input.name,
        passwordHash,
        input.role,
      );
    } catch (error) {
      if (String(error).includes('UNIQUE')) fail(409, 'An account with this email already exists.');
      throw error;
    }
    await sessionFor(res, user);
    return res.status(201).json({
      user: safeUser(user),
    });
  }
  const user = await one('SELECT * FROM users WHERE email = ? AND demo_group IS NULL', input.email);
  const [salt, expected] = (user?.password_hash || `${'0'.repeat(32)}:${'0'.repeat(128)}`).split(
    ':',
  );
  const actual = await scryptAsync(input.password, salt, 64);
  if (!user || !timingSafeEqual(Buffer.from(expected, 'hex'), actual))
    fail(401, 'Email or password is incorrect.');
  await sessionFor(res, user);
  res.json({
    user: safeUser(user),
  });
});
app.get('/api/workspace', auth, async (req, res) =>
  res.json(await transaction(() => workspace(req), 'read')),
);
app.post(
  '/api/wedding',
  atomicRoute(auth, couple, async (req, res) => {
    if (
      await one(
        'SELECT id FROM weddings WHERE owner_id = ? UNION SELECT wedding_id FROM members WHERE user_id = ?',
        req.user.id,
        req.user.id,
      )
    )
      fail(409, 'Your account already has a wedding.');
    const w = createWedding(weddingSchema.parse(req.body), req.user.id);
    await run(
      'INSERT INTO weddings (id, owner_id, slug, data) VALUES (?, ?, ?, ?)',
      w.id,
      req.user.id,
      w.slug,
      JSON.stringify(w),
    );
    res.status(201).json(w);
  }),
);
app.patch(
  '/api/wedding',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const input = weddingPatch.parse(req.body);
    if (
      input.currency &&
      input.currency !== req.wedding.currency &&
      (req.wedding.selections.length ||
        req.wedding.budget.some((b) => b.committed || b.paid) ||
        (await one('SELECT id FROM enquiries WHERE wedding_id = ?', req.wedding.id)))
    )
      fail(
        400,
        'Your wedding has commitments or enquiries in its current currency. Keep that currency so quotes and budget totals stay accurate.',
      );
    if (
      req.wedding.ownerId !== req.user.id &&
      ['published', 'slug', 'visibility'].some((key) => key in input)
    )
      fail(403, 'Only the wedding owner can change publishing settings.');
    if (
      input.slug &&
      (await one('SELECT id FROM weddings WHERE slug = ? AND id != ?', input.slug, req.wedding.id))
    )
      fail(409, 'That website address is already taken.');
    Object.assign(req.wedding, input);
    await transaction(async () => await saveWedding(req.wedding));
    res.json(req.wedding);
  }),
);
function addGuest(w, input, guestId) {
  if (input.eventIds.some((eventId) => !w.events.some((e) => e.id === eventId)))
    fail(400, 'One of these events no longer exists.');
  if (
    input.email &&
    w.guests.some((g) => g.id !== guestId && g.email.toLowerCase() === input.email.toLowerCase())
  )
    fail(409, `${input.email} is already on your guest list.`);
  const existing = w.guests.find((g) => g.id === guestId);
  if (existing?.isPlusOne) fail(400, 'Edit the primary guest to manage their plus-one.');
  const groupName = input.group || `${input.firstName} ${input.lastName}`.trim();
  let group = w.groups.find((g) => g.name.toLowerCase() === groupName.toLowerCase());
  if (!group) {
    group = {
      id: id(),
      name: groupName,
      token: token(),
    };
    w.groups.push(group);
  }
  const guest = {
    ...input,
    id: guestId || id(),
    groupId: group.id,
    responses: Object.fromEntries(
      input.eventIds.map((e) => [e, existing?.responses[e] || 'pending']),
    ),
    isPlusOne: false,
    invitedAt: existing?.invitedAt || null,
    respondedAt: existing?.respondedAt || null,
  };
  delete guest.group;
  if (existing) w.guests[w.guests.indexOf(existing)] = guest;
  else w.guests.push(guest);
  const plus = w.guests.find((g) => g.parentId === guest.id);
  if (input.plusOne) {
    const plusGuest = {
      id: plus?.id || id(),
      firstName: plus?.firstName || `Guest of ${input.firstName}`,
      lastName: plus?.lastName || '',
      email: '',
      phone: '',
      groupId: group.id,
      tags: input.tags,
      dietary: plus?.dietary || '',
      eventIds: input.eventIds,
      responses: Object.fromEntries(
        input.eventIds.map((e) => [e, plus?.responses[e] || 'pending']),
      ),
      plusOne: false,
      isPlusOne: true,
      parentId: guest.id,
      invitedAt: plus?.invitedAt || null,
    };
    if (plus) w.guests[w.guests.indexOf(plus)] = plusGuest;
    else w.guests.push(plusGuest);
  } else w.guests = w.guests.filter((g) => g.parentId !== guest.id);
  w.groups = w.groups.filter((g) => w.guests.some((guest) => guest.groupId === g.id));
  return guest;
}
app.post(
  '/api/wedding/guests/import/preview',
  atomicRoute(auth, couple, weddingAccess, (req, res) => {
    const { csv, mapping = {} } = z
      .object({
        csv: z.string().max(500000),
        mapping: z.record(z.string(), z.string()).optional(),
      })
      .parse(req.body);
    let records;
    try {
      records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
        bom: true,
        trim: true,
      });
    } catch {
      fail(400, 'The CSV could not be read. Check the headers and quoted fields.');
    }
    if (records.length > 500) fail(400, 'Please import at most 500 guests at a time.');
    const headers = Object.keys(records[0] || {});
    const aliases = {
      firstName: ['first_name', 'first name', 'firstname'],
      lastName: ['last_name', 'last name', 'lastname'],
      email: ['email'],
      phone: ['phone', 'mobile'],
      group: ['group', 'household'],
      tags: ['tags'],
    };
    const resolved = Object.fromEntries(
      Object.entries(aliases).map(([key, names]) => [
        key,
        mapping[key] || headers.find((h) => names.includes(h.toLowerCase())) || '',
      ]),
    );
    const errors = [],
      rows = [],
      seen = new Set(req.wedding.guests.filter((g) => g.email).map((g) => g.email.toLowerCase()));
    records.forEach((record, index) => {
      const input = {
        ...Object.fromEntries(
          Object.entries(resolved).map(([key, header]) => [key, record[header] || '']),
        ),
        dietary: '',
        eventIds: req.wedding.events.map((e) => e.id),
        plusOne: false,
      };
      const result = schemas.guests.safeParse(input);
      if (!result.success)
        errors.push({
          row: index + 2,
          message: result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
      else if (input.email && seen.has(input.email.toLowerCase()))
        errors.push({
          row: index + 2,
          message: `Duplicate email: ${input.email}`,
        });
      else {
        rows.push(result.data);
        if (input.email) seen.add(input.email.toLowerCase());
      }
    });
    res.json({
      headers,
      mapping: resolved,
      rows,
      errors,
      total: records.length,
    });
  }),
);
app.post(
  '/api/wedding/guests/import',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const rows = z.array(schemas.guests).min(1).max(500).parse(req.body.rows);
    await transaction(async () => {
      rows.forEach((row) => addGuest(req.wedding, row));
      await saveWedding(req.wedding);
    });
    res.json({
      imported: rows.length,
    });
  }),
);
app.post(
  '/api/wedding/groups/:groupId/invite',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const group = req.wedding.groups.find((g) => g.id === req.params.groupId);
    if (!group) fail(404, 'Invitation group not found.');
    if (!req.wedding.published)
      fail(400, 'Publish your wedding website before sharing invitations.');
    req.wedding.guests
      .filter((g) => g.groupId === group.id)
      .forEach((g) => (g.invitedAt = new Date().toISOString()));
    await transaction(async () => await saveWedding(req.wedding));
    res.json({
      path: `/invite/${group.token}`,
    });
  }),
);
app.post(
  '/api/wedding/collaborators',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    if (req.wedding.ownerId !== req.user.id)
      fail(403, 'Only the wedding owner can invite collaborators.');
    const email = z.email().parse(req.body.email).toLowerCase();
    const value = token();
    await run(
      'INSERT INTO collaborator_invites (token, wedding_id, email, expires_at) VALUES (?, ?, ?, ?)',
      value,
      req.wedding.id,
      email,
      Date.now() + 7 * 86400000,
    );
    res.json({
      path: `/join/${value}`,
      email,
    });
  }),
);
app.post(
  '/api/join/:token',
  atomicRoute(auth, couple, async (req, res) => {
    const invitation = await one(
      'SELECT * FROM collaborator_invites WHERE token = ? AND expires_at > ?',
      req.params.token,
      Date.now(),
    );
    if (!invitation || invitation.email !== req.user.email)
      fail(
        403,
        'Sign in with the email this invitation was created for. The link may also have expired.',
      );
    if (
      await one(
        'SELECT id FROM weddings WHERE owner_id = ? UNION SELECT wedding_id FROM members WHERE user_id = ?',
        req.user.id,
        req.user.id,
      )
    )
      fail(409, 'This account already belongs to a wedding. Use a separate account to join.');
    await transaction(async () => {
      await run(
        'INSERT INTO members (wedding_id, user_id) VALUES (?, ?)',
        invitation.wedding_id,
        req.user.id,
      );
      await run('DELETE FROM collaborator_invites WHERE token = ?', req.params.token);
    });
    res.json({
      ok: true,
    });
  }),
);
app.delete(
  '/api/wedding/collaborators/:userId',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    if (req.wedding.ownerId !== req.user.id)
      fail(403, 'Only the wedding owner can remove collaborators.');
    await run(
      'DELETE FROM members WHERE wedding_id = ? AND user_id = ?',
      req.wedding.id,
      req.params.userId,
    );
    res.json({
      ok: true,
    });
  }),
);
app.post(
  '/api/wedding/shortlist/:vendorId',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    if (!(await visibleVendors(req.user)).some((v) => v.id === req.params.vendorId))
      fail(404, 'Vendor not found.');
    const list = req.wedding.shortlist;
    req.wedding.shortlist = list.includes(req.params.vendorId)
      ? list.filter((v) => v !== req.params.vendorId)
      : [...list, req.params.vendorId];
    await transaction(async () => await saveWedding(req.wedding));
    res.json({
      ok: true,
    });
  }),
);
app.post(
  '/api/wedding/enquiries',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const input = z
      .object({
        vendorId: z.uuid(),
        message: z.string().trim().min(10).max(4000),
      })
      .parse(req.body);
    const vendor = (await visibleVendors(req.user)).find((v) => v.id === input.vendorId);
    if (!vendor) fail(404, 'Vendor not found.');
    if (vendor.currency !== req.wedding.currency)
      fail(400, 'Choose a vendor quoting in your wedding currency.');
    if (
      await one(
        'SELECT id FROM enquiries WHERE wedding_id = ? AND vendor_id = ?',
        req.wedding.id,
        vendor.id,
      )
    )
      fail(409, 'You already have an enquiry with this vendor. Find it in My vendors.');
    const enquiry = {
      ...input,
      id: id(),
      weddingId: req.wedding.id,
      status: 'new',
      createdAt: new Date().toISOString(),
    };
    await run(
      'INSERT INTO enquiries (id, wedding_id, vendor_id, data) VALUES (?, ?, ?, ?)',
      enquiry.id,
      req.wedding.id,
      vendor.id,
      JSON.stringify(enquiry),
    );
    res.status(201).json(enquiry);
  }),
);
app.post(
  '/api/wedding/quotes/:quoteId/select',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const row = await one(
      'SELECT q.* FROM quotes q JOIN enquiries e ON e.id = q.enquiry_id WHERE q.id = ? AND e.wedding_id = ?',
      req.params.quoteId,
      req.wedding.id,
    );
    if (!row) fail(404, 'Quote not found.');
    const quote = json(row),
      enquiry = json(await one('SELECT * FROM enquiries WHERE id = ?', row.enquiry_id));
    const vendor = json(await one('SELECT * FROM vendors WHERE id = ?', enquiry.vendorId));
    if (req.wedding.selections.some((s) => s.quoteId === quote.id) && quote.status === 'selected')
      return res.json({
        ok: true,
      });
    if (quote.currency !== req.wedding.currency)
      fail(400, 'The quote currency must match your wedding budget.');
    if (!['sent', 'viewed', 'selected'].includes(quote.status))
      fail(400, 'Please request a current quote from this vendor.');
    if (quote.expires < today())
      fail(400, 'This quote has expired. Please request an updated quote.');
    await transaction(async () => {
      const old = req.wedding.selections.find((s) => s.vendorId === vendor.id);
      if (old && old.quoteId !== quote.id) {
        const previous = json(await one('SELECT * FROM quotes WHERE id = ?', old.quoteId));
        previous.status = 'superseded';
        await run('UPDATE quotes SET data = ? WHERE id = ?', JSON.stringify(previous), previous.id);
      }
      selectQuote(req.wedding, quote, enquiry, vendor);
      await saveWedding(req.wedding);
      quote.status = 'selected';
      enquiry.status = 'selected';
      await run('UPDATE quotes SET data = ? WHERE id = ?', JSON.stringify(quote), quote.id);
      await run('UPDATE enquiries SET data = ? WHERE id = ?', JSON.stringify(enquiry), enquiry.id);
    });
    res.json({
      ok: true,
    });
  }),
);
app.post(
  '/api/wedding/:collection',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const collection = req.params.collection;
    if (!Object.hasOwn(schemas, collection)) fail(404, 'Not found.');
    const input = schemas[collection].parse(req.body);
    if (
      collection === 'budget' &&
      req.wedding.budget.some((b) => b.name.toLowerCase() === input.name.toLowerCase())
    )
      fail(409, 'This budget category already exists. Edit the existing category.');
    const item = await transaction(async () => {
      const item =
        collection === 'guests'
          ? addGuest(req.wedding, input)
          : {
              ...input,
              id: id(),
            };
      if (collection !== 'guests') req.wedding[collection].push(item);
      await saveWedding(req.wedding);
      return item;
    });
    res.status(201).json(item);
  }),
);
app.patch(
  '/api/wedding/:collection/:itemId',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const { collection, itemId } = req.params;
    if (!Object.hasOwn(schemas, collection)) fail(404, 'Not found.');
    const existing = req.wedding[collection].find((item) => item.id === itemId);
    if (!existing) fail(404, 'This item no longer exists.');
    const input = schemas[collection].parse(req.body);
    if (collection === 'budget' && input.name !== existing.name)
      fail(400, 'Budget category names cannot be changed after creation.');
    await transaction(async () => {
      if (collection === 'guests') addGuest(req.wedding, input, itemId);
      else Object.assign(existing, input);
      await saveWedding(req.wedding);
    });
    res.json({
      ok: true,
    });
  }),
);
app.delete(
  '/api/wedding/:collection/:itemId',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const { collection, itemId } = req.params;
    if (!Object.hasOwn(schemas, collection) || collection === 'budget') fail(404, 'Not found.');
    const existing = req.wedding[collection].find((item) => item.id === itemId);
    if (!existing) fail(404, 'This item no longer exists.');
    if (collection === 'guests' && existing.isPlusOne)
      fail(400, 'Edit the primary guest to remove their plus-one.');
    req.wedding[collection] = req.wedding[collection].filter(
      (item) => item.id !== itemId && item.parentId !== itemId,
    );
    if (collection === 'events')
      req.wedding.guests.forEach((g) => {
        g.eventIds = g.eventIds.filter((e) => e !== itemId);
        delete g.responses[itemId];
      });
    if (collection === 'guests')
      req.wedding.groups = req.wedding.groups.filter((group) =>
        req.wedding.guests.some((g) => g.groupId === group.id),
      );
    await transaction(async () => await saveWedding(req.wedding));
    res.json({
      ok: true,
    });
  }),
);
app.get('/api/w/:slug', async (req, res) => {
  const w = json(await one('SELECT * FROM weddings WHERE slug = ?', req.params.slug));
  const member =
    w &&
    req.user &&
    (w.ownerId === req.user.id ||
      (await one(
        'SELECT user_id FROM members WHERE wedding_id = ? AND user_id = ?',
        w.id,
        req.user.id,
      )));
  if (!w || ((!w.published || w.visibility === 'invite_only') && !member))
    fail(404, 'This wedding page is private or has not been published yet.');
  res.json({
    wedding: publicWedding(w, member ? w.events.map((e) => e.id) : []),
    preview: !!member && !w.published,
  });
});
async function invitation(value) {
  const row = await one('SELECT * FROM guest_tokens WHERE token = ?', value);
  const w = row ? json(await one('SELECT * FROM weddings WHERE id = ?', row.wedding_id)) : null;
  if (!w || !w.published)
    fail(404, 'This invitation is unavailable. Please ask the couple for a current link.');
  return {
    w,
    guests: w.guests.filter((g) => g.groupId === row.group_id),
  };
}
app.get('/api/invite/:token', async (req, res) => {
  const { w, guests } = await invitation(req.params.token);
  const eventIds = [...new Set(guests.flatMap((g) => g.eventIds))];
  const wedding = publicWedding(w, eventIds);
  wedding.events = wedding.events.filter((e) => eventIds.includes(e.id));
  res.json({
    wedding,
    guests: guests.map((g) => ({
      id: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      dietary: g.dietary,
      eventIds: g.eventIds,
      responses: g.responses,
      isPlusOne: g.isPlusOne,
    })),
  });
});
app.post(
  '/api/invite/:token/rsvp',
  atomicRoute(async (req, res) => {
    const { w, guests } = await invitation(req.params.token);
    const input = rsvpSchema.parse(req.body);
    if (new Set(input.guests.map((g) => g.id)).size !== input.guests.length)
      fail(400, 'Each guest should appear once.');
    for (const response of input.guests) {
      const guest = guests.find((g) => g.id === response.id);
      if (!guest || Object.keys(response.responses).some((e) => !guest.eventIds.includes(e)))
        fail(403, 'This response is outside your invitation.');
      if (guest.eventIds.some((e) => !response.responses[e]))
        fail(400, 'Please respond to every event for each guest.');
      guest.responses = response.responses;
      guest.dietary = response.dietary;
      if (guest.isPlusOne) {
        guest.firstName = response.firstName;
        guest.lastName = response.lastName;
      }
      guest.respondedAt = new Date().toISOString();
    }
    if (guests.some((g) => !input.guests.some((answer) => answer.id === g.id)))
      fail(400, 'Please include everyone on your invitation.');
    await transaction(async () => await saveWedding(w));
    res.json({
      ok: true,
      message: 'Your response has been saved. Thank you!',
    });
  }),
);
app.put(
  '/api/vendor/profile',
  atomicRoute(auth, async (req, res) => {
    if (req.user.role !== 'vendor') fail(403, 'A vendor account is required.');
    const input = vendorSchema.parse(req.body);
    const existing = await one('SELECT * FROM vendors WHERE owner_id = ?', req.user.id);
    const vendor = {
      ...input,
      id: existing?.id || id(),
      demo: !!req.user.demo_group,
      packages: input.packages.map((p) => ({
        ...p,
        id: p.id || id(),
      })),
    };
    await run(
      'INSERT INTO vendors (id, owner_id, approved, data) VALUES (?, ?, ?, ?) ON CONFLICT(owner_id) DO UPDATE SET data = excluded.data, approved = excluded.approved',
      vendor.id,
      req.user.id,
      req.user.demo_group ? 1 : 0,
      JSON.stringify(vendor),
    );
    res.json(vendor);
  }),
);
app.patch(
  '/api/vendor/enquiries/:enquiryId',
  atomicRoute(auth, async (req, res) => {
    const vendor = await vendorFor(req);
    const row = await one(
      'SELECT * FROM enquiries WHERE id = ? AND vendor_id = ?',
      req.params.enquiryId,
      vendor.id,
    );
    if (!row) fail(404, 'Enquiry not found.');
    const status = z
      .enum(['new', 'viewed', 'responded', 'declined', 'lost'])
      .parse(req.body.status);
    const enquiry = json(row);
    if (enquiry.status === 'selected')
      fail(400, 'This vendor has already been selected by the couple.');
    enquiry.status = status;
    enquiry.updatedAt = new Date().toISOString();
    await run('UPDATE enquiries SET data = ? WHERE id = ?', JSON.stringify(enquiry), row.id);
    res.json(enquiry);
  }),
);
app.post(
  '/api/vendor/enquiries/:enquiryId/quotes',
  atomicRoute(auth, async (req, res) => {
    const vendor = await vendorFor(req);
    const row = await one(
      'SELECT * FROM enquiries WHERE id = ? AND vendor_id = ?',
      req.params.enquiryId,
      vendor.id,
    );
    if (!row) fail(404, 'Enquiry not found.');
    const input = quoteSchema.parse(req.body);
    if (input.expires < today()) fail(400, 'Choose an expiry date today or later.');
    const enquiry = json(row),
      wedding = json(await one('SELECT * FROM weddings WHERE id = ?', row.wedding_id));
    if (vendor.currency !== wedding.currency)
      fail(400, 'Set your profile currency to match this wedding before quoting.');
    const quote = {
      ...input,
      id: id(),
      enquiryId: row.id,
      total: quoteTotal(input.items),
      currency: vendor.currency,
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    if (quote.total > 100000000) fail(400, 'The quote total is too large.');
    await transaction(async () => {
      await run(
        'INSERT INTO quotes (id, enquiry_id, data) VALUES (?, ?, ?)',
        quote.id,
        row.id,
        JSON.stringify(quote),
      );
      if (enquiry.status !== 'selected') enquiry.status = 'quoted';
      await run('UPDATE enquiries SET data = ? WHERE id = ?', JSON.stringify(enquiry), row.id);
    });
    res.status(201).json(quote);
  }),
);
app.get('/api/quotes/:quoteId', auth, async (req, res) => {
  const row = await one(
    'SELECT q.*, e.wedding_id, v.owner_id AS vendor_owner FROM quotes q JOIN enquiries e ON e.id = q.enquiry_id JOIN vendors v ON v.id = e.vendor_id WHERE q.id = ?',
    req.params.quoteId,
  );
  if (!row) fail(404, 'Quote not found.');
  const w = await one('SELECT owner_id FROM weddings WHERE id = ?', row.wedding_id);
  const member =
    w.owner_id === req.user.id ||
    (await one(
      'SELECT user_id FROM members WHERE wedding_id = ? AND user_id = ?',
      row.wedding_id,
      req.user.id,
    ));
  if (!member && row.vendor_owner !== req.user.id) fail(404, 'Quote not found.');
  const quote = json(row);
  res.json({
    ...quote,
    vendor: (await quoteWithVendor(row)).vendor,
  });
});
app.post(
  '/api/quotes/:quoteId/viewed',
  atomicRoute(auth, couple, weddingAccess, async (req, res) => {
    const row = await one(
      'SELECT q.* FROM quotes q JOIN enquiries e ON e.id = q.enquiry_id WHERE q.id = ? AND e.wedding_id = ?',
      req.params.quoteId,
      req.wedding.id,
    );
    if (!row) fail(404, 'Quote not found.');
    const quote = json(row);
    if (quote.status === 'sent') {
      quote.status = 'viewed';
      await run('UPDATE quotes SET data = ? WHERE id = ?', JSON.stringify(quote), quote.id);
    }
    res.json({
      ok: true,
    });
  }),
);
app.use('/api', (_req, res) =>
  res.status(404).json({
    error: 'This endpoint does not exist.',
  }),
);
app.use((error, _req, res, _next) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({
      error: error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
    });
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({
      error: 'The request contains invalid JSON.',
    });
  if (error.type === 'entity.too.large')
    return res.status(413).json({
      error: 'This upload is too large.',
    });
  if (!error.status) console.error(error);
  res.status(error.status || 500).json({
    error: error.status ? error.message : 'Something went wrong. Please try again.',
  });
});
