# Hello Kiwi

An example Kiwi App in a single HTML file, built on
[`@maps-research/kiwi-app-sdk`](../../kiwi-app-sdk/README.md). To start your own
app, copy [`index.html`](./index.html) along with the SDK file it loads. The
[developer guide](../KIWI_APP_DEVELOPER_GUIDE.md) explains the protocol this
app demonstrates.

The app only ever talks to Kiwi's host page, never to the Kiwi backend. When the
app requests data, for example with `kiwi.documentChunks` or
`kiwi.contextualChat`, the host makes the backend call with its own app token.
As a result, the app needs no token, no CORS entry and no backend URL.

## Run it

The page loads the SDK from `../kiwi-app-sdk/kiwi-app-sdk.js`. For that path to
work, serve the parent folder, not this one:

```bash
cd kiwi-app-developer-guide-example
python3 -m http.server 8000
```

Then open <http://localhost:8000/hello-kiwi-app/>. Kiwi isn't embedding the page
here, so the SDK runs its Simulator: it fakes Kiwi's context, AI answers and
data responses. The **Event Log** shows every message the app sends and
receives, and marks the simulated ones. The mode pill in the top bar switches
between Simulator and Live.

## Enable it in Kiwi

You need:

- the Kiwi backend, by default at `http://localhost:3000`;
- the Kiwi UI, running as usual;
- an admin account.

On a fresh database, `npx prisma db seed` (run in `kiwi/`) creates the admin
account `admin@example.com` and the class `seed-class-001`. It also prints the
admin password, unless you set one with `SEED_ADMIN_PASSWORD`.

With the static server still running, register the app:

```bash
cd kiwi-app-developer-guide-example/hello-kiwi-app
ADMIN_PASSWORD=... CLASS_ID=seed-class-001 ./register.sh
```

The script signs in as the admin and runs four steps:

1. Whitelists the slug `demo`. It grants the scopes
   `class:materials:chunks:read`, `context:student_learning:read` and
   `llm:prompt:weekly-summary`.
2. Registers the app. This covers its `class-tab` UI, the `ai` capability and
   the `weekly-summary` prompt.
3. Approves the prompt.
4. Enables the app in the class.

Optional settings: `KIWI`, `ADMIN_EMAIL`, `APP_URL`, `SLUG`, `SECRET` and
`PROMPT_ID`. The script's header describes them. If `SECRET` is set, it must be
at least 32 characters.

Open the class in Kiwi. A **Hello Kiwi** tab appears. It shows the context Kiwi
sends, including an opaque `userId` and the viewer's `userRole`. The
document-chunks card also loads data from the class.

If the class has no documents, the document-chunks card comes back empty. The
contextual-chat card also needs an AI provider configured on the backend.

## If it doesn't work

- **`APP_URL` must match exactly.** The default is
  `http://localhost:8000/hello-kiwi-app/`. It must be the exact address you
  open the page at. The host only accepts messages from that URL's origin, so
  any other origin looks like "`kiwi:context` never arrives".
- **An existing whitelist entry isn't changed.** Step 1 only creates new
  entries. If the slug is already whitelisted, the entry keeps its original
  secret and scopes. An admin can change them with
  `PATCH /api/kiwi-apps/whitelist/demo`.
- **Changing the prompt text turns the prompt off.** It stays off until an admin
  approves it again, so run `register.sh` again with `ADMIN_PASSWORD` set.
- **The user needs a role in the class.** Otherwise Kiwi won't issue a token,
  and the data cards fail with `token_error`.
- **Scope changes need a page reload.** The Kiwi page keeps its token for up to
  an hour, so reload it after changing scopes.

For other problems, see the guide's
[troubleshooting table](../KIWI_APP_DEVELOPER_GUIDE.md#troubleshooting).

## What it demonstrates

| Section | Feature | SDK call |
| --- | --- | --- |
| 1 · Connect | Connection to Kiwi and the context it sends | `kiwi.ready()`, `kiwi.onContext()` |
| 2 · Use Kiwi's AI | Streaming AI answers | `kiwi.askAI(prompt, { onChunk })` |
| 2 · Use Kiwi's AI | Telling Kiwi's AI what the user is doing | `kiwi.updateContext(text)` |
| 3 · Class content & coaching | Paging through the class's document chunks | `kiwi.documentChunks({ limit, cursor })` |
| 3 · Class content & coaching | Running an approved prompt over the student's learning context | `kiwi.contextualChat({ promptId, contextRequest })` |
| 4 · Drive Kiwi's UI | Moving the Kiwi page and changing the chat layout, with confirmation | `kiwi.navigate(...)`, `kiwi.setChatDisplayMode(mode)` |
