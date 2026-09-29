# MCP server

Kiwi runs a [Model Context Protocol](https://modelcontextprotocol.io) (MCP)
server, so an external MCP client (an AI tool, an IDE, or an agent) can call
Kiwi tools, read class data, and fetch prompts on behalf of a signed-in user.
This guide is for developers connecting such a client. It covers the endpoints,
authentication, and a reference for every tool, resource, and prompt.

The server is built with [`@rekog/mcp-nest`](https://github.com/rekog-labs/MCP-Nest)
and is configured in `kiwi/src/mcp/mcp.module.ts`. Kiwi Apps (iframe-embedded
apps) use the same server with scope-limited app tokens; see the
[Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md).

## Quick start

This connects a TypeScript client over Streamable HTTP with a bearer token.

### 1. Get an access token

On a local development server started with `DEV_AUTH=true` (never in
production), `POST /auth/dev` returns a token valid for 24 hours:

```bash
curl -s -X POST http://localhost:3000/auth/dev
# {"access_token":"eyJ...","refresh_token":"eyJ...","token_type":"Bearer"}
```

Each call creates a **new admin user**, so use it only on a throwaway local
database. On any other server, get a token through the
[OAuth flow](#oauth-authorization-flow). Those tokens expire after 60 seconds,
so a real client must refresh them (see [Keeping tokens fresh](#keeping-tokens-fresh)).

### 2. Connect and call a tool

```bash
npm install @modelcontextprotocol/sdk
```

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const token = process.env.KIWI_TOKEN!;

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:3000/mcp'),
  { requestInit: { headers: { Authorization: `Bearer ${token}` } } },
);

const client = new Client({ name: 'my-kiwi-client', version: '1.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
console.log(tools.map((t) => t.name));

const result = await client.callTool({
  name: 'get_authenticated_user',
  arguments: {},
});
console.log(result.content);

await client.close();
```

Headers go in `requestInit.headers`. The transport has no top-level `headers`
option; passing one does nothing, and every request then fails with 401.

The SDK negotiates the protocol version during `initialize`; do not hardcode
one.

### 3. Or configure an MCP host

Hosts that take a URL plus headers (IDEs, desktop assistants) need:

- URL: `http://localhost:3000/mcp` (type "Streamable HTTP" / "HTTP", not "SSE")
- Header: `Authorization: Bearer <token>`

A static header works only with a long-lived development token. Against a real
server, use a host that supports MCP OAuth (see
[Using the SDK's OAuth support](#using-the-sdks-oauth-support)).

## Endpoints and transports

| Transport | Endpoints |
|---|---|
| Streamable HTTP | `POST /mcp`, `GET /mcp`, `DELETE /mcp` |

The server runs on MCP-Nest v2 and the MCP TypeScript SDK v2. It accepts
initialized 2025 protocol sessions (described below) and the sessionless
2026-07-28 protocol. The old HTTP+SSE transport (`GET /sse`,
`POST /messages`) is no longer served; clients that used it must switch to
Streamable HTTP at `/mcp`.

`/mcp` is claimed by a controller guarded by `SmartJwtAuthGuard`
(`kiwi/src/mcp/mcp-http.controller.ts`), so authentication runs on every
request, and a bearer token alone is enough there — no browser session is
needed.

There are no `/mcp/sse`, `/mcp/streamable-http`, `/mcp/rpc`, or
`/mcp/capabilities` endpoints. (`kiwi/src/mcp/mcp.controller.ts` declares some
of these but is not registered in any module.) Use the MCP `initialize`
handshake to discover capabilities.

### Sessions

The Streamable HTTP server is stateful:

- `initialize` (a `POST /mcp` with no `Mcp-Session-Id` header) creates a
  session and returns its ID in the `Mcp-Session-Id` response header. The SDK
  sends it on later requests automatically.
- Responses are sent as SSE-framed events (`event: message` / `data: {...}`),
  so requests must send `Accept: application/json, text/event-stream`. The SDK
  does this.
- `GET /mcp` opens the server-to-client notification stream. `DELETE /mcp` ends
  the session (`transport.terminateSession()` in the SDK).
- Every request needs a valid bearer token, and tools and resources run as
  the user (and app context) of the token sent with that request.
- Sessions live in the memory of one server process. After a restart, or if a
  load balancer routes the request to another instance, the server replies
  `404` with JSON-RPC error `-32001 Session not found`; the client must
  initialize again. Deployments with several instances need sticky routing
  for `/mcp`.

### Raw HTTP example

For debugging without the SDK:

```bash
curl -si http://localhost:3000/mcp \
  -H "Authorization: Bearer $KIWI_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2025-06-18","capabilities":{},
        "clientInfo":{"name":"curl","version":"0"}}}'
```

Copy the `mcp-session-id` response header into later requests, send the
`notifications/initialized` notification, and then call, for example,
`tools/list`. A raw client chooses its own `protocolVersion`, and the server
replies with the version it supports.

## Authentication

Every MCP request needs `Authorization: Bearer <token>`. The server accepts two
kinds of token:

| Token | Issued by | Access |
|---|---|---|
| User access token | `/auth/token` (OAuth), `/auth/login`, `/auth/dev` | Everything the user's roles allow |
| App token | `POST /api/kiwi-apps/:slug/token` (Kiwi Apps) | Limited by the app's granted scopes and bound to one class |

Refresh tokens are signed with the same key but are **not** accepted as bearer
tokens. The guard rejects any token that carries a `jti` claim.

| Lifetime | Value |
|---|---|
| Access token | 60 seconds (`expires_in: 60`). 24 hours when `DEV_AUTH=true` outside production. |
| Refresh token | 7 days |
| Authorization code | 10 minutes, single use |
| Pending authorization request | 10 minutes |

Tokens are signed with RS256 when `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` are
set, and with HS256 (`JWT_SECRET`) otherwise. See
[JWT configuration](./jwt-configuration.md) for key setup and for verifying
tokens in other services.

### OAuth authorization flow

Kiwi is an OAuth 2.1 authorization server for public clients: authorization
code grant with PKCE (`S256` only) and no client secret.

```
client                         Kiwi backend                     Kiwi frontend
  | GET /.well-known/oauth-protected-resource                        |
  | GET /.well-known/oauth-authorization-server                      |
  | POST /auth/clients/register  -> client_id                        |
  | open browser: GET /auth/authorize?... ---> 302 ----------------> /authorize?oauth_pending=true
  |                                                user signs in and clicks Authorize
  | <------------------- 302 redirect_uri?code=...&state=...         |
  | POST /auth/token (authorization_code + code_verifier)            |
  | <- access_token, refresh_token                                   |
  | POST /mcp  Authorization: Bearer <access_token>                  |
```

#### Discovery

| Endpoint | Returns |
|---|---|
| `GET /.well-known/oauth-protected-resource` | RFC 9728 metadata. `resource` is `${SERVER_URL}/mcp`; `authorization_servers` is `[SERVER_URL]`. |
| `GET /.well-known/oauth-protected-resource/<path>` | Same, with `resource` set to `${SERVER_URL}/<path>` (for example `/.well-known/oauth-protected-resource/mcp`). |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata: `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `jwks_uri`. Also served under `/<path>`. |
| `GET /.well-known/jwks.json` | Public signing key (meaningful only with RS256; see [JWT configuration](./jwt-configuration.md)). |

The authorization server metadata advertises
`response_types_supported: ["code"]`,
`grant_types_supported: ["authorization_code", "refresh_token"]`,
`code_challenge_methods_supported: ["S256"]`, and
`token_endpoint_auth_methods_supported: ["none"]`.

All URLs in the metadata are built from the `SERVER_URL` environment variable,
which defaults to `http://localhost:3000`. On any server not reached at that
address, set `SERVER_URL` to the public backend origin (for example
`https://kiwi-api.example.edu`), or clients will be sent to localhost. Clients
that check that `resource` matches the URL they connected to (the MCP SDK does)
also fail if it is wrong.

A `401` from `/mcp` does not include a `WWW-Authenticate` header, so clients
fall back to the well-known URLs at the server origin.

#### Register a client

`POST /auth/clients/register` (RFC 7591 dynamic registration, no
authentication). The body is JSON:

| Field | Required | Notes |
|---|---|---|
| `redirect_uris` | Yes | Array. Must be `https://`, except `localhost` and `127.0.0.1`, which must be `http://`. |
| `token_endpoint_auth_method` | No | Use `none` (the default). |
| `grant_types` | No | Default `["authorization_code", "refresh_token"]`. |
| `response_types` | No | Default `["code"]`. |
| `scope` | No | Stored but not enforced. Default `openid profile email`. |
| `client_name` | No | |

```bash
curl -s http://localhost:3000/auth/clients/register \
  -H 'Content-Type: application/json' \
  -d '{"redirect_uris":["http://localhost:8080/callback"],
       "token_endpoint_auth_method":"none","client_name":"My MCP client"}'
```

The response (`201`) contains `client_id`, `client_id_issued_at`, and the
stored registration fields.

#### Send the user to authorize

Open `GET /auth/authorize` in the user's browser with these query parameters:

| Parameter | Required | Notes |
|---|---|---|
| `client_id` | Yes | From registration |
| `redirect_uri` | Yes | Must exactly match a registered URI |
| `state` | Yes | Random value; returned unchanged on the redirect |
| `code_challenge` | Yes | `BASE64URL(SHA256(code_verifier))` |
| `code_challenge_method` | Yes | Must be `S256` |
| `response_type` | No | Must be `code` if present |
| `scope` | No | Stored, not enforced |

Missing parameters return `400 Missing required OAuth parameters`; an unknown
`client_id` returns `401`; an unregistered `redirect_uri` returns `400`.

Kiwi stores the request against the browser's backend session cookie and
redirects to `${FRONTEND_URL}/authorize?oauth_pending=true` (the first entry
if `FRONTEND_URL` lists several). On that page the user either confirms with
an existing Kiwi sign-in, signs in with email and password, or signs in with
Google if it is enabled. Kiwi then redirects the browser to
`redirect_uri?code=...&state=...`. Check that `state` matches before using the
code.

PKCE values in Node:

```typescript
import crypto from 'node:crypto';

const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
const state = crypto.randomBytes(16).toString('hex');
```

#### Exchange the code

`POST /auth/token` accepts JSON or `application/x-www-form-urlencoded`.

| Parameter | Required |
|---|---|
| `grant_type=authorization_code` | Yes |
| `code` | Yes |
| `code_verifier` | Yes |
| `redirect_uri` | Yes, same value as in the authorize request |
| `client_id` | Recommended; checked when present |

```bash
curl -s http://localhost:3000/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"grant_type":"authorization_code","code":"<code>",
       "code_verifier":"<verifier>","redirect_uri":"http://localhost:8080/callback",
       "client_id":"<client_id>"}'
```

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 60
}
```

Errors are `400` (`Missing required parameters`, `Invalid or expired
authorization code`, `redirect_uri mismatch`, `client_id mismatch`,
`Invalid code_verifier`) or `400 Unsupported grant_type`.

#### Refresh

```bash
curl -s http://localhost:3000/auth/token \
  -H 'Content-Type: application/json' \
  -d '{"grant_type":"refresh_token","refresh_token":"<refresh_token>","client_id":"<client_id>"}'
```

The response has the same shape as the code exchange and includes a **new**
refresh token. Refresh tokens rotate: Kiwi keeps only the most recent one, so
store the new token and discard the old one. A stale, revoked, or expired
refresh token returns `401 Invalid or expired refresh token`; start the
authorization flow again.

The refresh token Kiwi remembers is per user, not per client, and it is the
same one the web app uses. Signing in to the web app, or authorizing a second
client for the same user, invalidates the previous refresh token (see
[Known issues](#known-issues)). OAuth clients that Kiwi registers for its own
outbound MCP server connections (with `mcp_server_id`) are tracked separately;
external clients are not.

#### Keeping tokens fresh

With a 60-second lifetime, refresh a few seconds before expiry (for example,
10 seconds before), not a minute before, which would refresh on every call. A
static `requestInit` header goes stale after 60 seconds, so give the transport
a `fetch` function that adds the current token to each request:

```typescript
class KiwiTokens {
  private accessToken = '';
  private expiresAt = 0;

  constructor(
    private tokenUrl: string,
    private clientId: string,
    private refreshToken: string,
  ) {}

  async get(): Promise<string> {
    if (Date.now() >= this.expiresAt - 10_000) await this.refresh();
    return this.accessToken;
  }

  private async refresh() {
    const res = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: this.clientId,
      }),
    });
    if (!res.ok) throw new Error(`Refresh failed: ${res.status}`);
    const data = await res.json();
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token; // rotated; persist it
    this.expiresAt = Date.now() + data.expires_in * 1000;
  }
}

const tokens = new KiwiTokens(
  'https://kiwi-api.example.edu/auth/token',
  clientId,
  savedRefreshToken,
);

const transport = new StreamableHTTPClientTransport(
  new URL('https://kiwi-api.example.edu/mcp'),
  {
    fetch: async (url, init) => {
      const headers = new Headers(init?.headers);
      headers.set('Authorization', `Bearer ${await tokens.get()}`);
      return fetch(url, { ...init, headers });
    },
  },
);
```

Store refresh tokens where other code cannot read them (OS keychain,
server-side storage, encrypted at rest). Do not put tokens in URLs or browser
`localStorage`.

#### Using the SDK's OAuth support

The MCP SDK can run discovery, dynamic registration, PKCE, and refresh itself
when you pass an `authProvider` (an `OAuthClientProvider`) to
`StreamableHTTPClientTransport`. Kiwi requires a `state` parameter, so the
provider must implement `state()`. Register with
`token_endpoint_auth_method: "none"` in `clientMetadata`. Hosts with built-in
MCP OAuth support use the same endpoints.

### Scopes

Discovery metadata lists `openid`, `profile`, `email` (authorization server)
and additionally `mcp:tools`, `mcp:resources`, `mcp:prompts` (protected
resource). These are **not enforced** for user tokens: a user access token can
use every tool, resource, and prompt, subject to the per-item access rules
below.

App tokens are different. Some tools and resources check the app token's
scopes (listed in the reference below), and app tokens are bound to one class.
Scope names and how an app gets them are in the
[Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md).

## Access rules

Access rules below use these terms:

- **System role**: `user`, `instructor`, or `admin` (on the user record).
- **Enrollment role**: `student`, `professor`, or `instructor` (per class).
- **Professor of the class**: an enrollment with role `professor` in that
  class. An admin is not automatically a professor of every class.
- **Assigned instructor**: a user with system role `instructor` assigned to
  the class through instructor management, with the permission named.
- **Any authenticated user**: any valid user or app token.

Kiwi Apps never get the link between a user ID and a name or email. App tokens
see opaque user UUIDs only.

## Tools

All tools return a `CallToolResult`. On success the payload is in
`content[0].text`, either JSON (pretty-printed) or plain text as noted. On
failure the result has `isError: true` and `content[0].text` is a plain-text
message such as `Error: Insufficient permissions. ...`. See
[Handling errors](#handling-errors).

| Tool | Description | Who may call |
|---|---|---|
| `get_authenticated_user` | The caller's own user record | Any authenticated user |
| `get_class_roster` | Everyone enrolled in a class | Admin, professor of the class |
| `add_users_to_class` | Enroll users by email | Admin, professor of the class |
| `upload_document` | Upload a file to object storage | Admin |
| `get_document_signed_url` | Signed download URL for a storage key | Any authenticated user |
| `chat` | One-shot LLM completion | Any authenticated user |
| `chat_stream` | Same, generated with streaming on the server | Any authenticated user |
| `get_class_document_chunks` | Parsed text chunks of class documents | Class members and admins; app tokens with a scope |
| `get_experiment_schema` | JSON Schema of an experiment config | Any authenticated user |
| `validate_experiment_config` | Validate an experiment config | Any authenticated user |
| `create_experiment` | Create a draft experiment for a class | Any authenticated user |
| `kiwi_app_list_prompts` | List a Kiwi App's approved prompts | Any authenticated user |
| `kiwi_app_chat` | Run a Kiwi App's approved prompt | Any user; app tokens need a scope |
| `kiwi_app_contextual_chat` | Run an approved prompt with student learning context | App tokens only, with two scopes |

Source: `kiwi/src/mcp/tools/`.

### get_authenticated_user

No parameters. Returns:

```json
{ "id": "…", "email": "…", "systemRole": "user", "consent": true, "oauth": false }
```

### get_class_roster

| Parameter | Type | Required |
|---|---|---|
| `classId` | string | Yes |

Returns `{ classId, totalStudents, totalProfessors, users }`, where each user
is `{ userId, role, researchNotes, email }`. `researchNotes` is a JSON string.

### add_users_to_class

| Parameter | Type | Required |
|---|---|---|
| `classId` | string | Yes |
| `userEmails` | string[] (valid emails, at least one) | Yes |

Emails without a Kiwi account become pending enrollments. Returns
`{ message, classId, enrolledEmails, summary }`. Reports progress if the client
sends a progress token.

### upload_document

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `fileName` | string | Yes | Including extension |
| `fileData` | string | Yes | Base64-encoded content |
| `mimeType` | string | No | Default `application/octet-stream` |
| `storageKey` | string | No | Default `fileName` |

Returns `{ message, key, fileName, size, mimeType, signedUrl }`. This stores
the object only; it does not attach it to a class or index it for retrieval.

### get_document_signed_url

| Parameter | Type | Required |
|---|---|---|
| `key` | string | Yes |

Returns `{ key, signedUrl, expiresIn: "4 hours", note }`. The same data is
available as the `kiwi://storage/document/{key}` resource.

### chat and chat_stream

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `input` | string | Yes | User message |
| `image` | string | No | Image as a data URL, e.g. `data:image/png;base64,...` |

Sends a single user message to the default LLM with no system prompt, no
history, and no class context. Returns the reply as **plain text** (not JSON).
`chat_stream` streams from the LLM on the server and returns the full text in
one result; the client does not receive tokens incrementally (it gets progress
notifications if it sends a progress token). This is not Kiwi's student chat;
see [Prompts](./prompts.md) for how that is assembled.

### get_class_document_chunks

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `classId` | string | Yes | |
| `documentIds` | string[] (max 50) | No | Default: all available class documents |
| `cursor` | string | No | `nextCursor` from a previous page |
| `limit` | integer 1–200 | No | Chunks per page across documents; default 50 |

Access: with a user token, the caller must be an admin, an assigned
instructor, or enrolled in the class. With an app token, the token needs
`class:materials:chunks:read` and must have been issued for `classId`.

Returns:

```json
{
  "classId": "…",
  "documents": [
    {
      "documentId": "…",
      "fileName": "week1.pdf",
      "totalChunks": 42,
      "chunks": [
        { "chunkId": "…", "index": 0, "pageNumber": 1, "type": "text", "text": "…" }
      ]
    }
  ],
  "nextCursor": "…",
  "hasMore": true
}
```

Documents are ordered by ID and chunks by position. Image and table chunks
return their text description, never image data.

### get_experiment_schema

No parameters. Returns the JSON Schema (as JSON text) for an experiment
config: variants, engine choice, system prompts, and assignment strategy.

### validate_experiment_config

| Parameter | Type | Required |
|---|---|---|
| `config` | object | Yes |

Returns `{ "ok": true, "config": {...} }` with the parsed config, or
`{ "ok": false, "issues": ... }`. Invalid configs are reported this way, not
with `isError`.

### create_experiment

| Parameter | Type | Required |
|---|---|---|
| `classId` | string | Yes |
| `config` | object | Yes |

Validates the config, binds it to `classId`, and creates the experiment with
status `draft`, owned by the caller. Returns the experiment record as JSON.
Activation is a separate manual step in the Kiwi UI.

### kiwi_app_list_prompts

| Parameter | Type | Required |
|---|---|---|
| `appSlug` | string | Yes |

Returns `{ appSlug, totalPrompts, prompts: [{ promptId, name, description }] }`
for the app's admin-approved prompts.

### kiwi_app_chat

| Parameter | Type | Required |
|---|---|---|
| `appSlug` | string | Yes |
| `promptId` | string | Yes |
| `userMessage` | string | Yes |
| `image` | string (data URL) | No |

Runs the app's approved system prompt (with its stored temperature and max
tokens) against `userMessage`. Returns the LLM reply as plain text. An unknown
app or prompt returns an error; a prompt that is not yet approved returns
`Error: Prompt "<id>" is not active. ...`.

With an app token, the token needs `llm:prompt:<promptId>` and must belong to
`appSlug`.

### kiwi_app_contextual_chat

Only app tokens may call this tool. The token needs both
`llm:prompt:<promptId>` and `context:student_learning:read`, must belong to
`appSlug`, and must be bound to a class. The student and class always come
from the token.

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `appSlug` | string | Yes | |
| `promptId` | string | Yes | Approved prompt |
| `userMessage` | string (max 8000) | No | Task message |
| `contextRequest.kind` | `"student_learning_context"` | Yes | |
| `contextRequest.scope` | `"current_user_current_class"` | Yes | |
| `contextRequest.timeWindowDays` | integer 1–90 | No | Default 14 |
| `contextRequest.include` | array of `recent_questions`, `weak_concepts`, `relevant_materials` | Yes | At least one |
| `contextRequest.retrievalQuery` | string (max 500) | No | Query for `relevant_materials` |
| `outputSchema` | object | No | JSON Schema (root type `object`) the output must match |

Kiwi assembles the context on the server and returns only the LLM output as
text. `weak_concepts` is a class-wide aggregate, not per-student data. The
assembled context is never returned.

## Resources

Read resources with `resources/read` (`client.readResource({ uri })`). Every
resource returns one content item with `mimeType: "application/json"` and a
JSON `text`.

All ten resources are registered as plain resources, so `resources/list`
returns them all, including templated URIs with literal `{placeholders}`, and
`resources/templates/list` is empty. Replace the placeholders yourself.

Placeholders match a single path segment. Encode any value that contains `/`
with `encodeURIComponent` (this matters for storage keys).

When access is denied or something fails, most resources still return a
normal result whose JSON is `{ "error": "..." }`. Check for an `error` field
(see [Handling errors](#handling-errors)).

| URI | Returns | Who may read |
|---|---|---|
| `kiwi://classes` | Classes the caller is enrolled in | Any authenticated user |
| `kiwi://class/{classId}/documents` | Class documents | Enrolled in the class |
| `kiwi://class/{classId}/materials` | Class info plus documents | Enrolled in the class |
| `kiwi://storage/document/{key}` | Signed URL for a storage key | Any authenticated user |
| `kiwi://users/{userId}` | Basic profile | Any user; app tokens need `user:profile:read` |
| `kiwi://users/{userId}/role/{classId}` | Enrollment role in a class | Any user; app tokens need `class:info:read` |
| `kiwi://users/{userId}/enrollments` | All enrollments | Any user; app tokens need `class:enrollments:read` |
| `kiwi://analytics/user/{userId}` | Interactions and token usage | That user, or an admin |
| `kiwi://analytics/class/{classId}` | Class interactions | Admin, professor of the class, assigned instructor with `canViewAnalytics` |
| `kiwi://analytics/top-token-users` | Top 10 users by tokens | Admin |

Source: `kiwi/src/mcp/resources/`.

### kiwi://classes

```json
{
  "totalClasses": 1,
  "classes": [
    {
      "id": "…",
      "name": "Intro to Programming",
      "description": "…",
      "professorName": "…",
      "metadata": { },
      "professorId": "…",
      "createdDate": "…",
      "userRole": "student"
    }
  ]
}
```

`name`, `description`, and `professorName` come from the class metadata;
`userRole` is the caller's enrollment role.

### kiwi://class/{classId}/documents

Access requires an enrollment in the class; admins who are not enrolled are
denied.

```json
{
  "classId": "…",
  "totalDocuments": 1,
  "documents": [
    { "id": "…", "fileName": "week1.pdf", "fileUrl": "https://…", "isStudent": true, "isLlm": true, "materialType": "…" }
  ]
}
```

`fileUrl` is a signed URL.

### kiwi://class/{classId}/materials

Same access rule. Returns
`{ classId, className, description, professorName, materials: { documents, totalCount } }`,
where `documents` has the same item shape as above.

### kiwi://storage/document/{key}

Returns `{ key, signedUrl, expiresIn: "4 hours", note }`. Encode the key:

```typescript
const key = encodeURIComponent('class-abc/lecture-notes.pdf');
const res = await client.readResource({ uri: `kiwi://storage/document/${key}` });
```

### kiwi://users/{userId}

Returns `{ id, systemRole }`, plus `email` only when the caller is that user
or an admin. App tokens never receive `email`, even for their own user.

### kiwi://users/{userId}/role/{classId}

Returns `{ userId, classId, role, enrolled }`. `role` is the enrollment role,
or `null` when `enrolled` is `false`. Instructor assignments and admin status
are not reflected here.

### kiwi://users/{userId}/enrollments

Returns `{ userId, totalEnrollments, enrollments: [{ classId, role }] }`.

### kiwi://analytics/user/{userId}

Returns:

```json
{
  "userId": "…",
  "interactions": [ ],
  "interactionCount": 12,
  "tokenUsage": [
    {
      "id": "session-id",
      "sessionStartTime": "…",
      "sessionEndTime": "…",
      "tokensUsed": 1234,
      "actionSummary": { "frontend-interaction-chat-…": 3 }
    }
  ]
}
```

`tokenUsage` is an array of the user's sessions, newest first.
`actionSummary` counts chat-related interaction types in that session.

### kiwi://analytics/class/{classId}

Returns `{ classId, metrics: { uniqueUsers, totalInteractions }, interactions }`
with every interaction recorded for the class (including server actions),
oldest first. The payload can be large for an active class.

### kiwi://analytics/top-token-users

Returns
`{ topUsers: [{ userId, email, tokensUsed, sessionCount }], count }`, the ten
users with the highest total tokens across sessions.

## Prompts

Kiwi exposes four prompts. They are the legacy default system prompts from
`kiwi/src/student/student.prompts.ts`, not what Kiwi's own chat currently
sends; see [Prompts](./prompts.md) for that. Source:
`kiwi/src/mcp/prompts/system-prompts.provider.ts`.

| Prompt | Arguments | Messages returned |
|---|---|---|
| `default-system-prompt` | none | The default assistant instructions |
| `class-materials-prompt` | `classId` (optional) | Class-materials instructions, with `Current class context: <classId>` appended if given |
| `recitation-guidance-prompt` | `topic` (optional) | Recitation instructions (guide, never answer), with `Current topic focus: <topic>` appended if given |
| `complete-assistant-prompt` | `classId`, `mode` (both optional) | The default instructions, plus the class-materials (`mode: "class-materials"`, with `Class ID: <classId>` if given) or recitation (`mode: "recitation"`) instructions. `mode` defaults to `default`. |

Each message is `{ role: "system", content: { type: "text", text } }`.

Always send an `arguments` object, even if empty. The server passes the
arguments straight to the handler, and prompts that take arguments fail when
`arguments` is missing.

### Known issue: `system` role

The MCP schema allows only `user` and `assistant` as prompt message roles.
Kiwi returns `system`, so strict clients reject these prompts. The TypeScript
SDK's `client.getPrompt()` throws a validation error. Until this is fixed, send
the request with a looser result schema:

```typescript
import { z } from 'zod';

const prompt = await client.request(
  {
    method: 'prompts/get',
    params: { name: 'default-system-prompt', arguments: {} },
  },
  z.object({
    messages: z.array(
      z.object({
        role: z.string(),
        content: z.object({ type: z.literal('text'), text: z.string() }),
      }),
    ),
  }).passthrough(),
);

const systemText = prompt.messages.map((m) => m.content.text).join('\n\n');
```

## Handling errors

Errors arrive in three ways:

1. **HTTP errors** before MCP runs: `401` for a missing, expired, or refresh
   token, and `404` / `-32001` for an unknown session. The SDK throws. On
   `401`, refresh the token and retry. On `404`, reconnect.
2. **JSON-RPC errors**: unknown tool (`-32601`) or arguments that fail the
   tool's schema (`-32602 Invalid parameters: ...`). `client.callTool` throws
   an `McpError`.
3. **Tool and resource failures** (permissions, not found, backend errors)
   come back as ordinary results:
   - tools: `isError: true` and a plain-text message in `content[0].text`;
   - resources: JSON `{ "error": "..." }` in `contents[0].text`.

```typescript
import { McpError } from '@modelcontextprotocol/sdk/types.js';

try {
  const result = await client.callTool({
    name: 'get_class_roster',
    arguments: { classId },
  });
  const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? '';

  if (result.isError) {
    // Plain text, e.g. "Error: Insufficient permissions. Only admins and
    // class professors can view the roster."
    console.error(text);
  } else {
    const roster = JSON.parse(text);
    console.log(roster.totalStudents);
  }
} catch (err) {
  if (err instanceof McpError) {
    console.error('Protocol error', err.code, err.message);
  } else {
    throw err; // network or HTTP error
  }
}

const res = await client.readResource({ uri: `kiwi://class/${classId}/documents` });
const body = JSON.parse(res.contents[0].text as string);
if (body.error) console.error(body.error);
```

`chat`, `chat_stream`, `kiwi_app_chat`, and `kiwi_app_contextual_chat` return
plain text on success, so do not `JSON.parse` their output.

## Troubleshooting

**Check that the server is up and its metadata is right.**

```bash
curl http://localhost:3000/.well-known/oauth-protected-resource
```

`resource` should be your server's public URL plus `/mcp`. If it shows
`http://localhost:3000` on a deployed server, set `SERVER_URL`.

**`401 Unauthorized` on `/mcp`**

- The token expired. Access tokens last 60 seconds; refresh before each call
  (see [Keeping tokens fresh](#keeping-tokens-fresh)).
- The header is missing. With the TypeScript SDK, put it in
  `requestInit.headers` or add it in a custom `fetch`, not in a `headers`
  option.
- You sent the refresh token instead of the access token.
- The server restarted without persistent `JWT_PRIVATE_KEY`/`JWT_PUBLIC_KEY`
  (or with a changed `JWT_SECRET`), so older tokens no longer verify.

**`401 User's session is not initialized`**

You are calling a path other than `/mcp` (for example the removed `/sse` or
`/messages` endpoints) with a bearer token and no browser session. Use
Streamable HTTP at `/mcp`.

**`404` / `Session not found`**

The server restarted, or the request reached a different instance. Reconnect
(create a new transport and call `client.connect`). With several instances,
configure sticky routing for `/mcp`.

**`400 Bad Request: Mcp-Session-Id header is required`**

A non-initialize request was sent without a session ID. Send `initialize`
first.

**Authorization problems**

- `400 Invalid redirect_uri`: the value must match a registered URI exactly,
  including scheme, host, port, and path. Use `http://` for `localhost` and
  `127.0.0.1`, and `https://` for everything else.
- `400 Missing required OAuth parameters`: include `state`,
  `code_challenge`, and `code_challenge_method=S256`.
- `400 No pending OAuth authorization request` on the Kiwi authorize page: the
  pending request expired (10 minutes) or the browser lost the backend
  session cookie. Start again from `/auth/authorize` in the same browser.
- The authorize page opens on the wrong site: check `FRONTEND_URL`. Kiwi
  redirects to its first entry.
- `401 Invalid or expired refresh token`: the refresh token was rotated by
  another sign-in for the same user, or it expired. Authorize again.

**Permission errors in tool results**

Check the caller's system role and enrollment role against
[Access rules](#access-rules). Admins are not treated as enrolled in every
class; the class document and materials resources require an enrollment.

**Prompts fail in the client**

See [Known issue: `system` role](#known-issue-system-role), and always send
`arguments: {}`.

**Browser-based clients and CORS**

Kiwi allows cross-origin requests only from origins listed in `FRONTEND_URL`.
Browser clients on other origins should call Kiwi through their own backend.

## Known issues

- Prompt messages use the `system` role, which the MCP schema does not allow.
  See [Known issue: `system` role](#known-issue-system-role).
- External OAuth clients share the user's single refresh-token slot with the
  web app, so each new sign-in or authorization invalidates the previous
  refresh token.
- The authorization server metadata lists `revocation_endpoint` as
  `/auth/refresh-token`, which is not a token revocation endpoint.

Report security problems privately as described in
[SECURITY.md](../SECURITY.md), not in public issues.

## Getting help

- Bugs and feature requests: [GitHub issues](https://github.com/MAPS-research/kiwi/issues)
- Security reports: [SECURITY.md](../SECURITY.md)
- Protocol details: [modelcontextprotocol.io](https://modelcontextprotocol.io)
- Related docs: [JWT configuration](./jwt-configuration.md),
  [Prompts](./prompts.md),
  [Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md)
