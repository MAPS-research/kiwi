# AGENTS.md

Rules for coding agents working on Kiwi Apps in this folder. A Kiwi App is a
page that Kiwi embeds in an iframe. Full details are in
[KIWI_APP_DEVELOPER_GUIDE.md](./KIWI_APP_DEVELOPER_GUIDE.md). If this file and
the guide disagree, the guide is correct.

## References

- [KIWI_APP_DEVELOPER_GUIDE.md](./KIWI_APP_DEVELOPER_GUIDE.md): concepts,
  registration, bridge protocol, scopes, troubleshooting.
- [SDK README](../kiwi-app-sdk/README.md): the SDK API.
- [BRIDGE-OPS.md](../kiwi-app-sdk/BRIDGE-OPS.md): data ops and the scopes they
  need.
- [hello-kiwi-app/index.html](./hello-kiwi-app/index.html): the example app to
  copy from.

## Running

```bash
cd kiwi-app-developer-guide-example   # serve this folder, not hello-kiwi-app/
python3 -m http.server 8000           # open http://localhost:8000/hello-kiwi-app/
```

The example has no build step. Outside Kiwi it runs in Simulator mode.

## Rules

- **Never expose user identity.** Apps get opaque user IDs only. Don't add code
  or docs that turn an ID into a name or an email, and don't ask for an endpoint
  that does. When people need telling apart, use a shortened ID or a label the
  app assigns.
- **Use the SDK** (`@maps-research/kiwi-app-sdk`) rather than writing your own
  `postMessage` code. Call `kiwi.ready()` first, then render from the context
  it returns.
- **Read data through bridge ops** (`kiwi.documentChunks`,
  `kiwi.contextualChat`, `kiwi.call`), not through direct backend calls. A
  frontend-only app needs no token, no CORS entry and no backend URL.
- **Don't call `requestToken()`, and don't declare the `mcp` capability,**
  unless the app really calls a backend directly. Never store a token or write
  it to logs.
- **Use `userRole` from the context** for role checks. Don't call
  `/api/permissions/class-role`.
- **Keep the Simulator working.** Every example must still run without a
  backend.
- **Keep registration scripted.** Update `register.sh` when the app's scopes,
  UIs or prompts change. Request only the scopes the app uses.
- **Remember `uiUrl` must match exactly.** It must be the exact URL the app is
  served from, because the host drops messages from any other origin.
- **Expect prompt changes to need re-approval.** Changing a prompt's
  `systemPrompt` text turns the prompt off until an admin approves it again.
- **Don't make up MCP endpoints.** Only full MCP clients use MCP, through the
  server described in [docs/mcp.md](../docs/mcp.md). Iframe apps use bridge
  ops.
- **Never commit secrets.** That includes registration secrets, tokens and
  `.env` files.

## Before finishing

- The app still works embedded in Kiwi and in Simulator mode.
- If you changed messages, ops, scopes or run steps, update the guide, and the
  example README if it covers them.
