# Kiwi Apps: manual QA checklist

A short end-to-end check of the Kiwi Apps feature on a local instance, using
the Hello Kiwi reference app. Run it before a release or after changing the
app bridge, app tokens, or the admin pages. It takes about 15 minutes.

## Setup

1. Start Kiwi as described in the [README](../README.md#quick-start), with
   `SEED_ADMIN_PASSWORD` set when you run `npx prisma db seed`.
2. Create a student with a password: sign in as `admin@example.com`, open
   **Admin → User Management → Add users**, and add
   `qa-student@example.edu` to the class `seed-class-001`. Note the password.
3. Serve the example app from `kiwi-app-developer-guide-example/`:

   ```bash
   python3 -m http.server 8000
   ```

   Check that <http://localhost:8000/hello-kiwi-app/> loads and shows
   "simulated".
4. Register the app:

   ```bash
   cd kiwi-app-developer-guide-example
   KIWI=http://localhost:3000 ADMIN_PASSWORD=<admin password> \
     CLASS_ID=seed-class-001 ./hello-kiwi-app/register.sh
   ```

   All four steps should succeed. Running it a second time should also succeed
   (step 1 reports that the entry already exists).

## Admin pages

- [ ] **Admin → App Registry** lists `demo` in the whitelist with status
      Approved. The registration secret is never shown after creation.
- [ ] Editing the entry shows its maximum scopes:
      `class:materials:chunks:read`, `context:student_learning:read`,
      `llm:prompt:weekly-summary`.
- [ ] Under **Registered Apps**, expanding `demo` shows the prompt
      **Weekly Study Summary** as Approved.
- [ ] **Revoke** the prompt: it changes to Revoked and offers Approve again.
      Approve it again.
- [ ] **Admin → (class) → Class Apps** lists Hello Kiwi. **Edit App Settings**
      shows its tab label.
- [ ] Adding a whitelist entry with a secret shorter than 32 characters is
      refused.

## Student view

Sign in as `qa-student@example.edu` in a private window.

- [ ] The class shows a **Hello Kiwi** tab, and the app shows "Live
      (embedded)" and "handshake: connected".
- [ ] The context panel shows the class, the student's user ID, role
      `student`, and capabilities `ai`.
- [ ] **No name or email reaches the app.** In the app's event log, the
      `kiwi:context` message contains `userId` but no `username`, `email` or
      name field.
- [ ] **Walk** (document chunks) returns without an error. With no processed
      documents in the class the list is empty.
- [ ] **Get** (contextual coaching) returns an answer when an LLM provider is
      configured, or a clear error when it is not.
- [ ] **Ask Kiwi** streams an answer when an LLM provider is configured.
- [ ] The navigation and chat-display buttons move the Kiwi page and change
      the chat panel.

## Access checks

Using the same student session (browser developer tools, or `curl` with the
session cookie and bearer token):

- [ ] Changing the class app (`PATCH /api/classes/seed-class-001/apps/<appId>`)
      is refused.
- [ ] Minting a token with an app token
      (`POST /api/kiwi-apps/demo/token` with `Authorization: Bearer <app token>`)
      is refused.

As the admin:

- [ ] Revoke the prompt, reload the class page as the student, and check that
      **Get** now fails. Approve the prompt again.
- [ ] Disable the app for the class, reload as the student, and check that the
      tab is gone. Re-enable it with `register.sh` or the Class Apps page.

## Clean up

Stop the static server. The app, whitelist entry and student remain in the
database; remove them from the admin pages if needed.
