# Ampersand real-user pilot

Reviewed 28 September 2026. The existing live site responds successfully at `https://ampersand-invites.vercel.app`; the demo has a separate project and database. The email launch changes in this workspace have **not been deployed**. Production currently has no Resend sender/API configuration or email queue encryption key.

## First release

Use the existing product for a small, supported pilot: create a wedding, publish its invitation, collect household RSVPs, manage the budget, and receive quotes from approved vendors. Contracts and payments remain direct arrangements between couples and vendors. Guest invitation links are shared manually.

The new account flow is:

1. Register with a name, email, password, and account type.
2. Open the emailed verification link and enter the signup password. This proves both mailbox ownership and knowledge of the password; opening someone else's unsolicited signup email cannot activate their chosen credentials.
3. Sign in again to create a wedding or business profile.
4. Use **Forgot your password?** to recover access. A successful reset invalidates every earlier session and unused account link, and verifies the recovered email address.

Existing real accounts must verify their addresses too. They can sign in and use **Resend verification email**, or recover their account if they no longer know the password. Guest RSVP links continue to work without an account.

## Configure the live project

Set these **server-only Production** environment variables on `ampersand-invites`. Keep the demo project's email credentials unset. Preview deployments need isolated test data and a test sender.

| Variable                                 | Required value                                                                                                |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `APP_MODE`                               | `live`                                                                                                        |
| `APP_URL`                                | The exact public HTTPS origin, currently `https://ampersand-invites.vercel.app`. No path, query, or fragment. |
| `RESEND_API_KEY`                         | A sending key from the selected Resend account.                                                               |
| `EMAIL_FROM`                             | A sender on a verified domain, for example `Ampersand Invites <hello@your-domain.com>`.                       |
| `EMAIL_ENCRYPTION_KEY`                   | A random 32-byte key, encoded as 64 hexadecimal characters.                                                   |
| `CRON_SECRET`                            | A separate random secret, at least 32 characters, for the email retry endpoint.                               |
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | Existing live database credentials.                                                                           |

Generate each random secret separately and put it directly in the hosting environment:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not rotate the encryption key while messages remain queued: older payloads need their original key. Sent messages have their payload cleared. Expired unsent payloads are cleared on the next delivery-worker run. Account tokens are stored as hashes; queued messages containing links are encrypted with AES-256-GCM.

Resend setup: [verified sending domains](https://resend.com/docs/dashboard/domains/introduction), [send API](https://resend.com/docs/api-reference/emails/send-email), and [idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys).

## Run delivery retries

The app attempts delivery after saving an account action, enquiry, quote, or selection. A provider failure leaves the encrypted message queued and preserves the saved action. Schedule this request **every minute** using a scheduler that supports an Authorization header:

```text
GET https://ampersand-invites.vercel.app/api/internal/deliver-email
Authorization: Bearer <CRON_SECRET>
```

The endpoint sends at most five due messages per call. It returns only sent/failed counts. Check nonzero failure counts and scheduler failures in operations monitoring. Use a hosting plan/scheduler that supports the interval; the repository does not silently create a paid scheduler or assume one is active.

For a server with the same environment configuration, an operator can also retry up to 20 due messages with:

```sh
npm run email:deliver
```

Messages use stable idempotency keys and retry for no more than 23 hours (password reset messages expire after 30 minutes). Mail is an alert channel; the app remains the source of truth for enquiries and quotes. An expired reset or verification message requires a fresh request. Resends are limited to one per minute and five per hour per account and purpose.

## Deploy and verify

Complete sender setup before replacing the current live deployment. Live mode deliberately refuses new registration when email configuration is incomplete; existing unverified users would be unable to open their workspace until it is configured.

```sh
npm test
npm run build
npm run test:e2e
```

With the Production environment available securely, `npm run launch:check` checks mode, required email settings, retry secret, hosted database settings, and database connectivity. It does not prove sender-domain verification, actual delivery, scheduler execution, or backups.

Deploy the reviewed files to `ampersand-invites`, then test with an address controlled by the operator: receive a verification email, open the link, sign in, recover the account, and confirm the old password/session no longer works. Complete one hosted invitation/RSVP and vendor quote workflow. Confirm a due failed email is retried by the scheduler and the database backup can be restored separately.

No live email has been sent during implementation: automated tests use a fake mail transport and isolated databases.

## Pilot operations

Approve real vendor profiles using the existing `npm run vendor:approve` command. Decide who handles user support and vendor approvals before sharing the pilot with participants. Photo entry still uses HTTPS image URLs. Keep the initial pilot free while collecting feedback on actual invitation/RSVP and vendor usage; charging, file uploads, and a moderation dashboard can be separate releases.

The remaining external setup is the sender domain/address, a Resend sending key, the two generated secrets, a running retry schedule, and hosted delivery/restore verification. These details cannot be inferred from the source repository.
