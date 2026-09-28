# Share Ampersand Invites overseas

The app supports **Vercel + Turso** as well as Render with a persistent disk. Vercel hosts the React frontend and Express API; Turso stores accounts, weddings, and RSVPs. The Vercel function is configured in Tokyo (`hnd1`) to run near the hosted database.

## Demo and live products

Both Vercel projects use `jaycobchin/ampersand_invites`, the repository root, and the `main` production branch. Each has its own database and server environment variables:

| Setting                                   | Demo                                        | Live                                             |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| Vercel project                            | `ampersand-invites-demo`                    | `ampersand-invites`                              |
| Public address                            | `https://ampersand-invites-demo.vercel.app` | `https://ampersand-invites.vercel.app`           |
| Turso database                            | `ampersand-invites-demo`                    | `ampersand-invites-db` (existing data preserved) |
| `APP_MODE`                                | `demo`                                      | `live`                                           |
| `ENABLE_DEMO`                             | `true`                                      | `false`                                          |
| `APP_URL`                                 | Demo public address                         | Live public address                              |
| `LIVE_APP_URL`                            | Live public address                         | Unset                                            |
| `DEMO_APP_URL`                            | Unset                                       | Demo public address                              |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Demo database credentials                   | Live database credentials                        |

Demo mode opens fictional sample weddings and sends sign-in and registration links to the live site. The API rejects real account registration on the demo. Live mode supports real accounts and links to the demo; it rejects sample creation and sample role switching even if `ENABLE_DEMO` is accidentally enabled. Old sample sessions are signed out on the live site. Existing sample records in the old database are preserved, not migrated or deleted.

Website links contain only the destination origin, without account details or invitation tokens. Use full `https://` origins with no path, query, or fragment. `/register` and `/login` open the corresponding forms on the live site. Local development can leave `APP_MODE` unset to retain both real accounts and samples in the usual local app.

Each project's database credentials are scoped to **Production**. Preview deployments need their own test database before their APIs can be used; do not connect them to the live database. Non-secret mode and website URL settings can apply to Production and Preview. Redeploy after changing environment variables.

After committing and pushing the workspace to `main`, Vercel automatically rebuilds both connected projects. A deployment from local files does **not** push those files to GitHub. To deploy local changes explicitly, sign in with `npx vercel login`, then target the intended project:

```sh
npx vercel deploy --project ampersand-invites-demo --prod
npx vercel deploy --project ampersand-invites --prod
```

For custom domains, add each address under its project's **Settings → Domains**, follow the DNS instructions, and update `APP_URL` and the other project's link variable. The projects' production URLs should open without a Vercel sign-in; preview and individual deployment URLs can remain protected.

## Connect to Vercel

1. Sign in to [Vercel](https://vercel.com/new), choose **Add New → Project**, and import `jaycobchin/ampersand_invites` from GitHub. Grant Vercel access to that repository if prompted. Use the existing repository, not a new copy.
2. Keep the repository root as the root directory. `vercel.json` selects **Vite**, `npm run build`, output directory `dist`, and the API routes. The Node version is **24.x**. `npm start` is for local/Render hosting and is not the Vercel build command.
3. In your new Vercel project, open **Storage → Create Database**, select **Turso**, review the available plans, create a database in Tokyo (`hnd1`), and connect it to this project. The [Turso marketplace integration](https://vercel.com/marketplace/tursocloud/database) supplies `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`. Keep both server-only; do not prefix them with `VITE_` or commit them to Git.
4. Ensure both database variables apply to **Production**, then **redeploy**. The app creates its schema automatically when it first connects. Do not set `DATABASE_PATH` on Vercel or copy the local database into a deployment.
5. Open the deployment URL and check `/api/health` returns `{"status":"ok"}`. On the demo, use **Take a little look around**. Before using real accounts in live mode, complete [account email setup](./12-live-launch.md), then verify signup and recovery with an address you control. If the database has not been connected, the API returns a setup error instead of silently using temporary storage.
6. Share the project's production `https://…vercel.app` URL. Test it in a signed-out/incognito browser first; if your project's deployment protection requires a Vercel login, adjust that project's access setting before sharing with your reviewer.

The first deployment may display the landing page before the database is connected; accounts and the sample workspace become available after step 4. Vercel project creation, provider setup, and an actual deployment require an authenticated Vercel account. Repository configuration alone does not create a live project.

### Connect through the CLI

The same setup can be done from this directory after signing in. Link to an existing project if you already imported the repository:

```sh
npx vercel login
npx vercel link
npx vercel git connect https://github.com/jaycobchin/ampersand_invites.git
npx vercel integration add tursocloud/database
npx vercel --prod
```

The integration command asks for the resource details and billing plan. Review that choice before creating the resource. See Vercel's [integration CLI documentation](https://vercel.com/docs/cli/integration).

### Vercel environment settings

| Setting              | Purpose                                                    |
| -------------------- | ---------------------------------------------------------- |
| `TURSO_DATABASE_URL` | Hosted database URL, supplied by the Turso integration     |
| `TURSO_AUTH_TOKEN`   | Database authentication token, supplied by the integration |
| `ENABLE_DEMO`        | Optional; defaults to `true` for a review deployment       |
| `APP_URL`            | Optional custom domain, e.g. `https://invites.example.com` |

Vercel's exact deployment, branch, and production URLs are accepted automatically for same-origin requests. Custom domains use `APP_URL`; arbitrary `*.vercel.app` origins are not trusted. Use a separate Turso database for Preview environments if you enable preview deployments, so testing does not write to production data.

Your existing local database remains at `data/ampersand.sqlite`; it is **not uploaded automatically**. Vercel starts with its own hosted database. Local development still works without Turso credentials. To move real local data later, take a consistent backup and import it through Turso's database tools before opening the hosted app to users.

## Alternative: Render with a persistent disk

Render runs the frontend and API as one Node service. This option uses your service's persistent SQLite file instead of Turso.

### Deploy Render from GitHub

[Deploy this repository to Render](https://render.com/deploy?repo=https://github.com/jaycobchin/ampersand_invites)

1. Sign in to Render and connect the `jaycobchin/ampersand_invites` GitHub repository. For a private repository, grant Render access to that repository.
2. Choose **New → Blueprint**, or use the link above. Select this repository and its `main` branch.
3. Review the service in `render.yaml`: a Node web service in Singapore, the Starter instance, and a 1 GB persistent disk. This is a **paid** configuration; confirm the current total on Render before creating it.
4. Create the Blueprint. Render runs `npm ci && npm run build`, then `npm start`.
5. Open the generated `https://…onrender.com` URL. Choose **Take a little look around** to create a private sample workspace.
6. Send that public URL to your overseas reviewer. They do not need GitHub access, an account in the app, or a running copy on your laptop to try the sample workspace.

Each reviewer gets separate sample data. To review **the same real wedding**, create an account, set up a wedding, then use **Settings → Create invitation link** for a collaborator. Share that link yourself; the recipient must register or sign in with the email you invited. For guests, publish the wedding website and copy the household invitation link from **Guest list**.

### Render runtime settings

| Setting       | Value / purpose                                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node          | Latest Node 24 release; configured by `NODE_VERSION=24`                                                                                              |
| Build         | `npm ci && npm run build`                                                                                                                            |
| Start         | `npm start`                                                                                                                                          |
| Health check  | `/api/health`                                                                                                                                        |
| Database      | `DATABASE_PATH=/var/data/ampersand.sqlite`                                                                                                           |
| Disk          | 1 GB, mounted at `/var/data`                                                                                                                         |
| Demo          | `ENABLE_DEMO=true` for a review deployment; `false` hides and disables creation of sample workspaces                                                 |
| Public origin | Render’s `RENDER_EXTERNAL_URL` is used automatically. Set `APP_URL=https://your-domain.example` without a trailing slash if you add a custom domain. |

Keep **one Render service instance** when using its local SQLite database. The Turso-backed Vercel option uses database transactions to coordinate writes across function instances.

## Why this isn’t a free static-site deployment

The app has accounts, private guest data, and shared RSVP updates. It needs a running API and durable storage. Render’s free web service cannot attach the persistent disk this app needs, and an ephemeral filesystem would lose the database across restarts. GitHub Pages cannot run this API. Vercel uses the hosted Turso database described above.

Render documents [Node deployments](https://render.com/docs/deploy-node-express-app), [persistent disks and their limitations](https://render.com/docs/disks), [Blueprints](https://render.com/docs/blueprint-spec), and [current pricing](https://render.com/pricing). A disk-backed service has a brief interruption during deployments; keep the review deployment separate from a later production deployment.

## Approve real vendors

New vendor accounts can create their profiles, packages, and portfolios. Listings become visible after review. For Render, use the service shell. For Vercel, run locally with the hosted database variables set in your private `.env` file:

```sh
npm run vendor:approve -- vendor@example.com
```

Editing a real vendor’s profile returns it to review. Demo vendors are explicitly fictional and appear only inside their own sample workspace.

## Database backups

For Vercel/Turso, use Turso’s backup/export tools. The command below is only for local or Render SQLite files and refuses to run when a Turso connection is configured.

From the running service shell, create a consistent SQLite backup using the bundled command. Use a new destination filename each time:

```sh
npm run db:backup -- /var/data/backups/ampersand-2026-09-26.sqlite
```

Copy backups off the service through Render’s supported transfer tools. To restore, stop the service, preserve the current database and its WAL/SHM files, then replace the database with a verified backup. Do not copy only the live main `.sqlite` file while the app is running; recent data may be in its write-ahead log.

## Pilot boundaries

- Invitations and collaborator links are copied and shared manually. Account verification, password recovery, and enquiry/quote/selection notifications are implemented using Resend. Configure the sender, encryption key, and scheduled retries before deploying live mode; see [live launch setup](./12-live-launch.md). Guest invitation emails and reminder campaigns remain manual.
- Quotes and enquiries appear in the app. Payments and contracts are handled outside the platform.
- Photos use direct HTTPS image URLs; there is no file upload service.
- Moderation uses the approval command, not an admin dashboard.
- The API includes session authentication, email verification in live mode, password recovery, validation, ownership checks, CSRF origin checks, and rate limits. Production operations still need monitoring, a tested backup/restore process, and an agreed data-retention policy.
- Sample data persists like other data. Demo mode is for fictional content; disabling demo creation does not delete existing sample workspaces.
