# Share Ampersand Invites overseas

Use **Render** for this implementation. It serves the frontend and API together over HTTPS and keeps the SQLite database on a persistent disk. The Singapore region is configured; the public URL can be opened from overseas wherever Render is reachable.

## Deploy from GitHub

[Deploy this repository to Render](https://render.com/deploy?repo=https://github.com/jaycobchin/ampersand_invites)

1. Sign in to Render and connect the `jaycobchin/ampersand_invites` GitHub repository. For a private repository, grant Render access to that repository.
2. Choose **New → Blueprint**, or use the link above. Select this repository and its `main` branch.
3. Review the service in `render.yaml`: a Node web service in Singapore, the Starter instance, and a 1 GB persistent disk. This is a **paid** configuration; confirm the current total on Render before creating it.
4. Create the Blueprint. Render runs `npm ci && npm run build`, then `npm start`.
5. Open the generated `https://…onrender.com` URL. Choose **Take a little look around** to create a private sample workspace.
6. Send that public URL to your overseas reviewer. They do not need GitHub access, an account in the app, or a running copy on your laptop to try the sample workspace.

Each reviewer gets separate sample data. To review **the same real wedding**, create an account, set up a wedding, then use **Settings → Create invitation link** for a collaborator. Share that link yourself; the recipient must register or sign in with the email you invited. For guests, publish the wedding website and copy the household invitation link from **Guest list**.

## Runtime settings

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

Keep **one service instance**. This MVP uses a local SQLite database and is intended for a small pilot. Use PostgreSQL and a migration plan before scaling to multiple instances.

## Why this isn’t a free static-site deployment

The app has accounts, private guest data, and shared RSVP updates. It needs a running API and durable storage. Render’s free web service cannot attach the persistent disk this app needs, and an ephemeral filesystem would lose the database across restarts. GitHub Pages cannot run this API. Vercel would require adapting the storage to a hosted database rather than using this SQLite setup.

Render documents [Node deployments](https://render.com/docs/deploy-node-express-app), [persistent disks and their limitations](https://render.com/docs/disks), [Blueprints](https://render.com/docs/blueprint-spec), and [current pricing](https://render.com/pricing). A disk-backed service has a brief interruption during deployments; keep the review deployment separate from a later production deployment.

## Approve real vendors

New vendor accounts can create their profiles, packages, and portfolios. Listings become visible after review. In the Render service shell, run:

```sh
npm run vendor:approve -- vendor@example.com
```

Editing a real vendor’s profile returns it to review. Demo vendors are explicitly fictional and appear only inside their own sample workspace.

## Database backups

From the running service shell, create a consistent SQLite backup using the bundled command. Use a new destination filename each time:

```sh
npm run db:backup -- /var/data/backups/ampersand-2026-09-26.sqlite
```

Copy backups off the service through Render’s supported transfer tools. To restore, stop the service, preserve the current database and its WAL/SHM files, then replace the database with a verified backup. Do not copy only the live main `.sqlite` file while the app is running; recent data may be in its write-ahead log.

## Pilot boundaries

- Invitations and collaborator links are copied and shared manually. Email delivery, verification, password recovery, and reminders are not connected.
- Quotes and enquiries appear in the app. Payments and contracts are handled outside the platform.
- Photos use direct HTTPS image URLs; there is no file upload service.
- Moderation uses the approval command, not an admin dashboard.
- The API includes session authentication, validation, ownership checks, CSRF origin checks, and rate limits. Broader launch work includes account recovery, email ownership verification, monitoring, and data-retention policies.
- Sample data persists like other data. Demo mode is for fictional content; disabling demo creation does not delete existing sample workspaces.
