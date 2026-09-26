export const schema = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
    password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('couple', 'vendor')),
    demo_group TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS weddings (
    id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), slug TEXT UNIQUE NOT NULL,
    data TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS members (
    wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY(wedding_id, user_id)
  );
  CREATE TABLE IF NOT EXISTS collaborator_invites (
    token TEXT PRIMARY KEY, wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    email TEXT NOT NULL, expires_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS guest_tokens (
    token TEXT PRIMARY KEY, wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    group_id TEXT NOT NULL, UNIQUE(wedding_id, group_id)
  );
  CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY, owner_id TEXT UNIQUE NOT NULL REFERENCES users(id),
    approved INTEGER NOT NULL DEFAULT 0, data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS enquiries (
    id TEXT PRIMARY KEY, wedding_id TEXT NOT NULL REFERENCES weddings(id) ON DELETE CASCADE,
    vendor_id TEXT NOT NULL REFERENCES vendors(id), data TEXT NOT NULL,
    UNIQUE(wedding_id, vendor_id)
  );
  CREATE TABLE IF NOT EXISTS quotes (
    id TEXT PRIMARY KEY, enquiry_id TEXT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    data TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS auth_limits (
    key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, resets_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS members_user ON members(user_id);
  CREATE INDEX IF NOT EXISTS enquiries_vendor ON enquiries(vendor_id);
`;
