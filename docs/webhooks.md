# Webhook System Documentation

## Overview

The Kiwi Framework now includes a webhook system that allows external services to receive real-time notifications when certain events occur in the system. Each webhook endpoint is protected by an API token for secure authentication. Certain sensitive events, such as user enrollment, require admin approval before being executed.

## Features

- **UUID-based webhook endpoints**: Each webhook has a unique UUID in its URL path
- **API Token Authentication**: Each webhook endpoint has exactly one API token for secure access
- **Event Subscription**: Webhooks can subscribe to specific events or all events (using `*`)
- **Delivery Logging**: All webhook deliveries are logged for auditing and debugging
- **Queue-based Processing**: Webhook events are processed asynchronously using BullMQ
- **Admin Approval Workflow**: Sensitive events like user enrollment require admin approval

## API Endpoints

### Webhooks Management

#### Create Webhook
```http
POST /webhooks
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "events": ["user.created", "class.enrollment"],
  "secret": "optional-secret-for-hmac-validation"
}
```

Response:
```json
{
  "id": "webhook-uuid",
  "url": "/webhooks/webhook/unique-uuid",
  "events": ["user.created", "class.enrollment"],
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "secret": "your-webhook-secret"
}
```

#### List Webhooks
```http
GET /webhooks
Authorization: Bearer {jwt-token}
```

#### Get Webhook Details
```http
GET /webhooks/{id}
Authorization: Bearer {jwt-token}
```

#### Update Webhook
```http
PATCH /webhooks/{id}
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "events": ["user.created", "document.uploaded"],
  "isActive": false
}
```

#### Delete Webhook
```http
DELETE /webhooks/{id}
Authorization: Bearer {jwt-token}
```

### API Tokens Management

#### Create API Token
```http
POST /api-tokens
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "name": "Production Webhook Token",
  "webhookId": "webhook-uuid",
  "scopes": ["webhook:receive"],
  "expiresAt": "2025-01-01T00:00:00Z" // optional
}
```

Response:
```json
{
  "id": "token-uuid",
  "name": "Production Webhook Token",
  "token": "raw-token-only-shown-once",
  "scopes": ["webhook:receive"],
  "webhookId": "webhook-uuid",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Important**: The raw token is only shown once when created. Store it securely!

#### List API Tokens
```http
GET /api-tokens
Authorization: Bearer {jwt-token}
```

#### Update API Token
```http
PATCH /api-tokens/{id}
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "name": "Updated Token Name",
  "isActive": false
}
```

#### Delete API Token
```http
DELETE /api-tokens/{id}
Authorization: Bearer {jwt-token}
```

## Receiving Webhook Events

External services send events to your webhook endpoint using the API token:

```http
POST /webhooks/webhook/{webhook-uuid}
Authorization: Bearer {api-token}
Content-Type: application/json
X-Webhook-Signature: {hmac-sha256-signature} // optional

{
  "event": "user.created",
  "data": {
    "user": {
      "id": "user-123",
      "email": "user@example.com",
      "systemRole": "user"
    },
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## Available Events

The following events can be subscribed to:

- `user.created` - When a new user is created
- `user.updated` - When user information is updated
- `user.enroll` - Request to enroll a user (requires admin approval)
- `class.created` - When a new class is created
- `class.enrollment` - When a user enrolls in a class
- `interaction.created` - When a new user interaction is recorded
- `document.uploaded` - When a document is uploaded
- `test.event` - For testing webhook functionality
- `*` - Subscribe to all events

## User Enrollment Webhook

### Overview

The `user.enroll` event allows external services to request user enrollment in classes. This is particularly useful for integrating with external registration systems. Unlike other events, `user.enroll` requires admin approval before execution.

### Sending an Enrollment Request

```http
POST /webhooks/webhook/{webhook-uuid}
Authorization: Bearer {api-token}
Content-Type: application/json

{
  "event": "user.enroll",
  "data": {
    "email": "student@example.com",
    "classId": "class-uuid-123"
  }
}
```

### Approval Workflow

1. **Event Reception**: The webhook receives the `user.enroll` event and stores it with `pending` status
2. **Admin Review**: Admin users can view pending events via the admin endpoints
3. **Approval/Rejection**: Admin approves or rejects the enrollment request
4. **Execution**: Upon approval, the system:
   - Adds the user to the whitelist (if not already present)
   - Creates a user account (if not already exists)
   - Enrolls the user in the specified class
   - Updates the event status to `executed`

### Admin Endpoints for Event Management

#### List Pending Events
```http
GET /webhooks/events/pending
Authorization: Bearer {admin-jwt-token}
```

#### Get Event Details
```http
GET /webhooks/events/{event-id}
Authorization: Bearer {admin-jwt-token}
```

#### Approve Event
```http
POST /webhooks/events/{event-id}/approve
Authorization: Bearer {admin-jwt-token}
```

#### Reject Event
```http
POST /webhooks/events/{event-id}/reject
Authorization: Bearer {admin-jwt-token}
```

#### Get Events for a Webhook
```http
GET /webhooks/{webhook-id}/events
Authorization: Bearer {jwt-token}
```

### Event Status Flow

```
pending → approved → executed (success)
       ↘ rejected (admin rejection)
       ↘ failed (execution error)
```

## Security Considerations

1. **API Token Storage**: Store API tokens securely and never expose them in client-side code
2. **HTTPS**: Always use HTTPS in production to encrypt token transmission
3. **Token Rotation**: Regularly rotate API tokens by deleting old ones and creating new ones
4. **IP Whitelisting**: Consider implementing IP whitelisting for additional security (future feature)
5. **HMAC Validation**: Use the webhook secret to validate payload integrity (optional)
6. **Rate Limiting**: Implement rate limiting on your webhook endpoints to prevent abuse

## Testing Webhooks

### Using the Test Endpoint

You can trigger test events to verify your webhook is working:

```http
POST /webhooks/trigger-test
Authorization: Bearer {jwt-token}
Content-Type: application/json

{
  "event": "test.event",
  "data": {
    "message": "Testing webhook",
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

### Local Development

For local development, you can use tools like ngrok to expose your local webhook endpoint:

```bash
# Start your local server
npm run start:dev

# In another terminal, expose it with ngrok
ngrok http 3000

# Use the ngrok URL for webhook testing
```

## Implementation Example

See the example files in `/frontend-examples/`:
- `WebhookManager.tsx` - React component for managing webhooks
- `webhook-client-example.ts` - Example TypeScript client for sending webhook events

## Current Limitations

1. **Logging Only**: Currently, webhook events are only logged to the console. In production, you would modify the `WebhookDeliveryService` to make actual HTTP requests to external URLs.

2. **One Token Per Webhook**: Each webhook endpoint can only have one active API token at a time. Creating a new token will replace the existing one.

3. **No Retry Logic**: Failed webhook deliveries are not automatically retried (this can be added in the `WebhookDeliveryService`).

## Future Enhancements

Potential improvements for the webhook system:

- [ ] Actual HTTP delivery to external URLs
- [ ] Retry logic with exponential backoff
- [ ] Webhook event filtering by resource IDs
- [ ] IP whitelisting for additional security
- [ ] Webhook health checks
- [ ] Event batching for high-volume scenarios
- [ ] Webhook templates for common integrations
- [ ] Rate limiting per webhook endpoint
- [ ] Detailed delivery metrics and analytics