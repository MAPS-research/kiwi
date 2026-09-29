# Inbound webhooks

Kiwi can receive events from external systems, such as a registration system
that asks for students to be enrolled. This document is for operators and
integrators setting up such a connection. The code lives in
`kiwi/src/webhooks/` and `kiwi/src/api-tokens/`.

## What the feature does

The webhook system is an **inbound receiver**. An external system sends an HTTP
`POST` to a webhook URL on Kiwi, authenticated with an API token.

- Kiwi does not emit events of its own. Nothing in the app fires `user.created`,
  `class.created` or the other event names when those things happen.
- Only `user.enroll` has an effect. It is queued for approval, and on approval
  the user is enrolled in a class.
- Any other subscribed event is recorded as a "delivery" and handed to a BullMQ
  worker (`kiwi/src/webhooks/webhook-delivery.service.ts`). The worker only logs
  the payload and marks the delivery `success`. It makes no outbound HTTP
  request.
- Each webhook has a `secret`, but Kiwi never checks it. HMAC signatures and an
  `X-Webhook-Signature` header are **not implemented**. The API token is the
  only authentication.

## Setup

Management endpoints need a signed-in user: a bearer access token plus the
session cookie (see [Exploring the API](development.md#exploring-the-api)).

### 1. Create a webhook

`POST /webhooks` is allowed for admins and for users who are a professor in at
least one class.

```http
POST /webhooks
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "events": ["user.enroll"]
}
```

`events` lists the event names to accept; `"*"` accepts all. `secret` is
optional and generated if omitted. It is returned only in this response, and
nothing uses it.

Response (`201`):

```json
{
  "id": "3f0c9a52-8d6e-4a55-9a7e-0b1c2d3e4f50",
  "url": "/webhooks/webhook/3f0c9a52-8d6e-4a55-9a7e-0b1c2d3e4f50",
  "events": ["user.enroll"],
  "isActive": true,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "secret": "9b1e..."
}
```

The receiver URL is always `/webhooks/webhook/<webhook id>`.

### 2. Create an API token

`POST /api-tokens` is open to any signed-in user, but only for a webhook that
user created.

```http
POST /api-tokens
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "name": "Registration system",
  "webhookId": "3f0c9a52-8d6e-4a55-9a7e-0b1c2d3e4f50",
  "expiresAt": "2027-01-01T00:00:00Z"
}
```

`expiresAt` and `scopes` are optional. `scopes` defaults to
`["webhook:receive"]`; scopes are stored but not enforced.

Response (`201`):

```json
{
  "id": "a1d4...",
  "name": "Registration system",
  "scopes": ["webhook:receive"],
  "expiresAt": "2027-01-01T00:00:00.000Z",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "webhookId": "3f0c9a52-8d6e-4a55-9a7e-0b1c2d3e4f50",
  "token": "5c2f..."
}
```

- The token is 64 hex characters (32 random bytes). Kiwi stores only a bcrypt
  hash, so the raw value appears only in this response.
- A webhook has at most one token. Creating a new one deletes the old one; this
  is how you rotate a token.
- `GET /api-tokens`, `GET /api-tokens/:id`, `PATCH /api-tokens/:id` (`name`,
  `scopes`, `isActive`) and `DELETE /api-tokens/:id` (permanent) act on your own
  tokens only.

### 3. Send events

The external system posts to the webhook URL with the token:

```http
POST /webhooks/webhook/3f0c9a52-8d6e-4a55-9a7e-0b1c2d3e4f50
Authorization: Bearer 5c2f...
Content-Type: application/json

{
  "event": "user.enroll",
  "data": {
    "email": "student@example.edu",
    "classId": "seed-class-001"
  }
}
```

The request gets `401` if the token is missing, unknown, inactive or expired,
belongs to a different webhook, or the webhook is inactive.

Successful responses are `201`:

| Case | Body |
|---|---|
| `user.enroll` | `{"message": "User enrollment event received and pending admin approval", "eventId": "<id>", "status": "pending_approval"}` |

A `user.enroll` whose `data` lacks a string `email` and `classId` is refused
with `400`, and one naming a class that doesn't exist with `404`, so the sender
sees the mistake instead of the approver.
| Any other subscribed event | `{"message": "Webhook event received and queued for processing", "deliveryId": "<id>"}` |
| Event not in the webhook's `events` | `{"message": "Event ignored - not subscribed"}` |

Swagger lists further event names (`user.created`, `user.updated`,
`class.created`, `class.enrollment`, `interaction.created`, `document.uploaded`,
`test.event`). They are accepted but only produce the logged delivery. The
receiver does not validate their `data`.

## Enrollment approval

A `user.enroll` event is stored as a `WebhookEvent` with status `pending`. Its
`data` must contain `email` and `classId`.

Who can list, view, approve and reject an event:

- `user.enroll` with a `classId`: admins, and managers of that class (a
  `professor` enrollment or an instructor assignment). The endpoints also
  require the caller to pass the professor check described under
  [Endpoint reference](#endpoint-reference).
- Any other event, or one without a `classId`: admins only.

Events you may not act on return `404`.

| Endpoint | Purpose |
|---|---|
| `GET /webhooks/events/pending` | Pending events you may act on, as `{"events": [...], "total": n}` |
| `GET /webhooks/events/:id` | One event, with its webhook and the approver's id and email |
| `POST /webhooks/events/:id/approve` | Approve and execute; returns `{"message": "...", "outcome": "..."}` for `user.enroll` (see below) |
| `POST /webhooks/events/:id/reject` | Reject, with optional body `{"reason": "..."}`; returns the updated event |

Approving or rejecting an event that is not `pending` returns `400`.

On approval Kiwi:

1. Checks that the class exists.
2. Adds the email to the whitelist, or re-enables a disabled entry.
3. If an account has that email, enrolls it as `student` (outcome
   `enrolled`, or `already_enrolled`).
4. Otherwise records a pending enrollment for the email and creates no
   account (outcome `pending_first_login`). The person is enrolled when their
   account first appears: at their first Google sign-in, or when an admin
   creates a password account for that email (Admin → User Management).
5. Marks the event `executed`.

The pending list (`GET /webhooks/events/pending`) marks each `user.enroll`
event with `userExists`, so an approver can tell an existing account from a
new person.

If a step fails, the event becomes `failed` with an `errorMessage`, and the
approve call returns the error.

```
pending → approved → executed
                   ↘ failed
pending → rejected
```

## Endpoint reference

"Professor" means an admin, or a user with a `professor` enrollment in any
class. "Owner" means the user who created the webhook. A failed role check
returns `401`; a failed ownership check returns `403`.

| Method and path | Access |
|---|---|
| `POST /webhooks` | Professor |
| `GET /webhooks` | Professor; lists your own webhooks with a token summary and delivery count |
| `GET /webhooks/:id` | Admin who owns it; includes the 10 most recent deliveries, not the secret |
| `PATCH /webhooks/:id` | Admin who owns it; body `events` and/or `isActive` |
| `DELETE /webhooks/:id` | Admin who owns it; soft delete (sets `isActive` to `false`) |
| `GET /webhooks/:id/deliveries` | Owner; the 100 most recent delivery records |
| `GET /webhooks/:id/events` | Admin who owns it; the 50 most recent `WebhookEvent` rows |
| `POST /webhooks/trigger-test` | Admin; see below |
| `POST /webhooks/webhook/:webhookId` | API token only, no user session |
| `GET /webhooks/events/pending`, `GET /webhooks/events/:id`, `POST /webhooks/events/:id/approve`, `POST /webhooks/events/:id/reject` | Professor, then scoped per event as above |
| `GET /webhooks/events/:id/audit` | Professor; approval and rejection history of one event |
| `GET /webhooks/audit` | Professor; all audit records. Query: `action`, `page`, `limit` (max 100), `startDate`, `endDate` |
| `GET /webhooks/audit/my` | Professor; records of actions you performed. Query: `action`, `page`, `limit` |

Audit records hold the action (`approved` or `rejected`), who performed it, an
optional reason, and the caller's IP address and user agent.

### Test trigger

`POST /webhooks/trigger-test` with `{"event": "...", "data": {...}}` runs the
receiver logic, without a token, for every active webhook subscribed to that
event. It returns `{"event": "...", "webhooksTriggered": n}`. Triggering
`user.enroll` this way creates a pending event on each subscribed webhook.

## Security notes

- Treat API tokens like passwords, and use HTTPS in production.
- Rotate a token by creating a new one for the same webhook. Disable a webhook
  with `PATCH /webhooks/:id` and `{"isActive": false}`.
- Signature verification, IP allowlists, rate limiting and retries are not
  implemented.
