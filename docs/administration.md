# Administration

This page is for people who run a Kiwi instance: creating the first admin,
managing accounts and roles, turning on Google sign-in, and preparing a
deployment for real users.

## Roles

Kiwi has two kinds of roles.

**System roles** apply across the whole instance:

| System role | Can |
|---|---|
| `user` | Use the classes they're enrolled in (students, and professors — see below) |
| `instructor` | Open the admin area and manage the classes they're assigned to |
| `admin` | Everything, in every class |

**Class roles** come from an enrollment in one class: `student`, `professor`
or `instructor`. A user with a `professor` enrollment can manage that class
(its instructions, materials and experiments) but not other classes.

Instructors are assigned to classes separately, each with its own
permissions (for example, managing materials or viewing analytics).

## The first admin

`npx prisma db seed` (run from `kiwi/`) creates an admin account:

- Email: `SEED_ADMIN_EMAIL` (default `admin@example.com`).
- Password: `SEED_ADMIN_PASSWORD` if set; otherwise one is generated and
  printed once when the seed finishes.

Running the seed again never changes an existing admin's password unless
`SEED_ADMIN_PASSWORD` is set, so it's safe to re-run. It also creates
`instructor@example.com`, `student@example.com` and a class with the ID
`seed-class-001`; those two users have no password and are meant for Google
sign-in or for resetting from the admin area.

If you load a database snapshot (`prisma/seed-data.json`) instead, the admin
step is skipped; see [development.md](development.md#seeding).

## Adding people

In **Admin → User Management → Add users** you can:

- **Create password accounts** — enter emails and a class; Kiwi generates a
  password for each and shows it once. Share it with the person securely.
- **Whitelist Google accounts** — people on the whitelist can sign in with
  Google (if Google sign-in is enabled). Emails on the domain in
  `VITE_SSO_EMAIL_DOMAIN` are treated as Google accounts and whitelisted
  rather than given a password.

From the same page you can reset passwords, change system roles, and assign
instructors to classes with their permissions. Students are enrolled from
**Admin → (class) → Enroll Students**. There is no self-service sign-up with a password: the
Register page tells visitors to ask an administrator, or offers Google sign-up
when Google is enabled.

The equivalent API calls (admin only; they need a signed-in session as well
as the bearer token):

| Action | Endpoint |
|---|---|
| Create a password account in a class | `POST /auth/register` `{email, password, classId}` |
| Reset a password | `POST /auth/resetpassword` `{email, password}` |
| Change a system role | `POST /auth/change-role` `{email, role}` (`user`, `instructor`, `admin`) |
| Whitelist emails for Google | `POST /whitelist/create` |

## Making someone an admin

- **In the app:** User Management → change the person's role to admin.
- **Before they have an account:** from `kiwi/`, run

  ```bash
  npx ts-node prisma/createPendingAdmin.ts person@example.edu
  ```

  This whitelists the email and grants admin the first time the person signs
  in. They still need a way to sign in: Google, or a password account created
  for them.
- **For an existing account, from the command line:**

  ```bash
  npx ts-node prisma/addAdmin.ts person@example.edu
  ```

## Google sign-in (optional)

Password sign-in works out of the box. To also allow Google:

1. Create an OAuth client ID ("Web application") in the Google Cloud console,
   with `https://<backend>/auth/google` as an authorized redirect URI
   (`http://localhost:3000/auth/google` locally).
2. In `kiwi/.env`, set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_CALLBACK_URL`, and `GOOGLE_DOMAIN` (comma-separated Google
   Workspace domains, or `*`).
3. In `kiwi-ui/.env`, set `VITE_ENABLE_GOOGLE_LOGIN=true` and rebuild the UI.
4. Whitelist the people who may sign in (User Management).

Only whitelisted emails can sign in with Google. `GOOGLE_DOMAIN` is checked
only for Google Workspace accounts; personal Gmail accounts are limited by the
whitelist alone.

Without `GOOGLE_CLIENT_ID` the Google routes return 404 and the button stays
hidden. For a Google-only deployment, also set
`VITE_DISABLE_PASSWORD_LOGIN=true`.

## Branding

Kiwi ships unbranded. Set these in `kiwi-ui/.env` before building the UI:
`VITE_INSTITUTION_NAME`, `VITE_SUPPORT_EMAIL`, `VITE_LOGO_URL`,
`VITE_LOGO_LIGHT_URL`, `VITE_SSO_EMAIL_DOMAIN`. On the backend,
`INSTITUTION_NAME`, `SUPPORT_EMAIL` and `ONBOARDING_GUIDE_URL` are used in the
welcome email. See [`kiwi-ui/.env.example`](../kiwi-ui/.env.example).

## Research consent

If your deployment is part of a study, set `VITE_CONSENT_FORM_URL` to your
consent document (a PDF URL). Users then must accept it before using the app.
Leave it empty to turn the consent step off.

## Before going to production

- [ ] Set strong, unique `JWT_SECRET` and `SESSION_SECRET`, and configure
      `JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY` (RS256). See
      [jwt-configuration.md](jwt-configuration.md).
- [ ] Keep `DEV_AUTH=false`. With it on, `POST /auth/dev` creates an admin for
      anyone. (It is always refused when `NODE_ENV=production`.)
- [ ] Never set `NO_AUTH=true`; it disables authorization checks.
- [ ] Set `NODE_ENV=production` and `API_DOMAIN` to the backend's domain, so
      session cookies are marked secure and the reverse proxy is trusted.
- [ ] Set `FRONTEND_URL` to the exact UI origin(s), and `SERVER_URL` to the
      backend's public URL.
- [ ] Replace the local database, Redis and MinIO credentials from
      `.env.example`; set `ENCRYPTION_KEY`.
- [ ] Serve both the UI and the backend over HTTPS.
- [ ] Configure SMTP and set `EMAIL_TEST_MODE=false` if you want email.
- [ ] Run the document parser (`docker compose --profile parser up -d`, or your
      own Unstructured API) and point `UNSTRUCTURED_API_URL` at it.
- [ ] Back up the database regularly
      ([development.md](development.md#backups)).

Report security problems as described in [SECURITY.md](../SECURITY.md).
