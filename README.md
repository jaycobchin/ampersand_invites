# Ampersand Invites — MVP

A working React + TypeScript wedding planning app, backed by a Node/Express API and persistent SQLite storage locally or hosted Turso storage on Vercel. Includes couple, guest, and vendor experiences, plus an isolated sample workspace for product reviews.

[Connect to Vercel](./DEPLOYMENT.md#connect-to-vercel) · [Render alternative](./DEPLOYMENT.md#alternative-render-with-a-persistent-disk) · [Hosting guide](./DEPLOYMENT.md)

[Demo and live setup](./DEPLOYMENT.md#demo-and-live-products): the same app can run as a sample-only demo and a live product with separate Vercel projects and Turso databases. `APP_MODE=demo` sends real signups to the live site; `APP_MODE=live` disables sample creation and links visitors to the demo.

## Run locally

Use **Node 24** and npm.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000**. Select **Take a little look around** to explore a sample wedding, or create your own account. The sample banner lets you move between the couple and vendor workspaces. Sample businesses are fictional and isolated from real accounts.

For a partner presentation, follow the [demo script and product review backlog](./11-demo-review.md). The sample banner lets you choose any demo vendor and restart with a fresh wedding. The sample includes two floral quotes with different inclusions for comparison.

The database is created automatically at `data/ampersand.sqlite`. Data survives browser refreshes and server restarts. No external database credentials are needed. Optional settings are documented in `.env.example`; copy it to `.env` to customise them. The database, `.env`, dependencies, and test artefacts are excluded from Git.

## Implemented workflows

- Email/password registration, login, and persistent sessions for couples and vendors.
- Wedding onboarding, date-relative checklist, dashboard, editable details, and email-scoped collaborator links.
- Multiple events with public or invitation-only visibility.
- Guest creation/editing/removal, household links, plus-ones, tags, event assignment, CSV import with column mapping and row validation, CSV export, and RSVP filters.
- Responsive guest invitations, per-event household RSVPs, plus-one names, dietary information, and response confirmation.
- Three wedding page themes, cover/story/FAQ editing, unique page addresses, preview, publishing, and invite-only pages.
- Custom checklist tasks, due dates, completion, editing, and deletion.
- Budget categories, targets, other commitments, payments, and automatic commitments from selected quotes.
- Approved vendor discovery, search, category/price filters, portfolios, active packages, shortlisting, and structured enquiries.
- Vendor profile/package editing, enquiry inbox and lead statuses, multi-item quotes, quote comparison, expiry handling, and vendor selection.

The dashboards refresh on focus and periodically so new guest replies and quotes appear. Invitations are shared by copying links. Email sending, password recovery, file uploads, payments, and an admin interface are not included in this pilot. See [deployment boundaries](./DEPLOYMENT.md#pilot-boundaries).

## Verify and build

```sh
npm test
npm run build
npm run test:e2e
```

Browser tests use a locally installed Chrome on macOS when available. Otherwise run `npx playwright install chromium` first. Tests create isolated databases and do not change your local wedding data. GitHub Actions also runs the build, API tests, and browser tests.

```sh
npm run build
npm start
```

`npm start` serves the built frontend and API from one process locally or on Render. On Vercel, `vercel.json` serves the frontend from the CDN and runs `api/index.mjs` as a function. Connect a Turso database before using accounts or RSVPs there. Vercel/Render deployment origins are detected automatically; set `APP_URL` when adding a custom domain.

## Project structure

| Path          | Purpose                                                                 |
| ------------- | ----------------------------------------------------------------------- |
| `src/`        | React screens, shared controls, styles, and frontend types              |
| `server/`     | Auth, API, validation, domain logic, schema, and isolated demo fixtures |
| `public/`     | Local photos, fonts, favicon, and guest import template                 |
| `tests/`      | API, access-control, persistence, and browser workflow tests            |
| `scripts/`    | Vendor moderation and consistent database backup commands               |
| `api/`        | Vercel serverless API entry point                                       |
| `vercel.json` | Vercel build, routing, function region, and headers                     |
| `render.yaml` | Deployable Render service with persistent storage                       |

Top-level accounts, sessions, memberships, invitation tokens, vendors, enquiries, and quotes use relational tables. Each wedding keeps its small pilot-sized guest/event/task/budget records in a JSON document, updated in SQLite transactions. Public serializers omit private wedding and guest fields. Local/Render SQLite uses one service instance. Vercel uses Turso, with ownership checks, reads, and mutations in a write transaction to preserve concurrent edits. Related writes and sample creation are batched to keep cloud transactions short. Move large wedding collections into separate relational tables when usage warrants it.

## Original product specification

Ampersand Invites is a wedding planning platform connecting **couples, guests, and wedding vendors** in one workflow.

The MVP is designed around a simple promise:

> **Plan the wedding. Invite your guests. Choose your vendors. All in one place.**

## Product pillars

1. **Couple workspace** — wedding setup, planning dashboard, checklist, budget, events, and collaborators.
2. **Guest management** — guest list, households, +1s, invitations, RSVP, dietary information, and event attendance.
3. **Wedding website & invite** — a public/private wedding page guests can use to view details and RSVP.
4. **Vendor marketplace** — couples discover, shortlist, enquire with, compare, and select vendors.
5. **Vendor workspace** — vendors maintain listings, receive enquiries, issue quotes, and manage lead status.

## MVP goal

Prove that couples will use one product to manage both **guest coordination** and **vendor selection**, and that vendors see value in responding to qualified wedding leads inside the platform.

## Suggested MVP stack

The specification is stack-agnostic. A practical implementation could use:

- Frontend: Next.js / React
- Backend: Next.js API routes, NestJS, or equivalent
- Database: PostgreSQL
- Auth: Clerk, Auth0, Supabase Auth, or equivalent
- File storage: S3-compatible object storage
- Email: Postmark, Resend, SendGrid, or equivalent
- Payments: Stripe in a later phase unless vendor deposits are included early

## Documents

- [01-product-requirements.md](./01-product-requirements.md)
- [02-mvp-scope.md](./02-mvp-scope.md)
- [03-user-roles-and-permissions.md](./03-user-roles-and-permissions.md)
- [04-user-flows.md](./04-user-flows.md)
- [05-data-model.md](./05-data-model.md)
- [06-api-outline.md](./06-api-outline.md)
- [07-ui-information-architecture.md](./07-ui-information-architecture.md)
- [08-backlog-and-acceptance-criteria.md](./08-backlog-and-acceptance-criteria.md)
- [09-analytics-and-success-metrics.md](./09-analytics-and-success-metrics.md)
- [10-roadmap.md](./10-roadmap.md)

## Key MVP assumptions

- One account can belong to multiple weddings in the future, but MVP may optimize for one active wedding per couple.
- A wedding can contain multiple events.
- Guests can be grouped into households or invitation groups.
- A guest may be invited to only some events.
- Vendors can belong to one or more service categories.
- Vendor availability is captured as an enquiry response in MVP; live calendar availability can come later.
- Vendor payments and contracts are not required for the first MVP unless explicitly added.
- Dietary information should be visible only to authorized wedding collaborators and relevant vendors when intentionally shared.
