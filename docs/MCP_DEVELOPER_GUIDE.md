# Kiwi MCP Client Developer Guide

This guide shows you how to write a client application that connects to and interacts with the Kiwi MCP server.

## Quick Start

### Server Information

- **Base URL**: `http://localhost:3000` (development) or your production URL
- **MCP Endpoint**: `/mcp`
- **Protocol Version**: `2024-11-05`
- **Transports**: SSE (Server-Sent Events) and Streamable HTTP

### Minimal Working Example

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Initialize client with SSE transport
const transport = new SSEClientTransport(
  new URL('http://localhost:3000/mcp/sse')
);

const client = new Client(
  { name: 'my-kiwi-client', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);

// Now you can use the client!
const result = await client.callTool({
  name: 'get_authenticated_user',
  arguments: {}
});
```

## Client Configuration

### Installing MCP Client SDK

```bash
npm install @modelcontextprotocol/sdk
```

### Choosing a Transport

Kiwi MCP supports two transports:

#### SSE (Server-Sent Events) - Recommended
```typescript
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport(
  new URL('http://localhost:3000/mcp/sse'),
  {
    // Optional: Add custom headers (e.g., for authentication)
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

#### Streamable HTTP
```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamable-http.js';

const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:3000/mcp/streamable-http'),
  {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  }
);
```

## Authentication

Kiwi MCP uses **OAuth 2.1 with PKCE** for authentication. JWTs are signed using **RS256** (asymmetric RSA keys), allowing external services to verify tokens without sharing secrets.

### JWT Verification (External Services)

External services can verify Kiwi JWTs by fetching the public key from the JWKS endpoint:

```python
# Python example using PyJWT
import jwt
import requests
from jwt import PyJWKClient

KIWI_JWKS_URL = "http://localhost:3000/.well-known/jwks.json"

# Fetch and cache public key on startup
jwks_client = PyJWKClient(KIWI_JWKS_URL)

def verify_token(token: str):
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=["RS256"],
        options={"verify_aud": False}
    )

# Usage
try:
    payload = verify_token(access_token)
    user_id = payload["sub"]
except jwt.InvalidTokenError as e:
    print(f"Invalid token: {e}")
```

```typescript
// TypeScript/Node.js example using jose
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('http://localhost:3000/.well-known/jwks.json')
);

async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ['RS256'],
  });
  return payload;
}

// Usage
const payload = await verifyToken(accessToken);
console.log('User ID:', payload.sub);
```

### OAuth Client Implementation

Here's how to implement OAuth 2.1 with PKCE in your client.

### Step 1: Discover OAuth Configuration

```typescript
async function discoverOAuthConfig(baseUrl: string) {
  const response = await fetch(`${baseUrl}/.well-known/oauth-authorization-server`);
  const config = await response.json();

  return {
    authorizationEndpoint: config.authorization_endpoint,
    tokenEndpoint: config.token_endpoint,
    registrationEndpoint: config.registration_endpoint,
  };
}

const config = await discoverOAuthConfig('http://localhost:3000');
```

### Step 2: Register Your OAuth Client

```typescript
async function registerClient(registrationEndpoint: string, redirectUri: string) {
  const response = await fetch(registrationEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none', // Public client with PKCE
      scope: 'openid profile email mcp:tools mcp:resources mcp:prompts',
      client_name: 'My Kiwi MCP Client'
    })
  });

  const data = await response.json();
  return {
    clientId: data.client_id,
    clientIdIssuedAt: data.client_id_issued_at,
  };
}

const { clientId } = await registerClient(
  config.registrationEndpoint,
  'http://localhost:8080/callback'
);
```

### Step 3: Generate PKCE Challenge

```typescript
import crypto from 'crypto';

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);
```

### Step 4: Redirect User to Authorization Endpoint

```typescript
function buildAuthorizationUrl(
  authEndpoint: string,
  clientId: string,
  redirectUri: string,
  codeChallenge: string,
  state: string
): string {
  const url = new URL(authEndpoint);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email mcp:tools mcp:resources mcp:prompts');
  return url.toString();
}

const state = crypto.randomBytes(16).toString('hex');
const authUrl = buildAuthorizationUrl(
  config.authorizationEndpoint,
  clientId,
  'http://localhost:8080/callback',
  codeChallenge,
  state
);

// Redirect user or open browser
console.log('Visit this URL:', authUrl);
```

### Step 5: Handle OAuth Callback and Exchange Code

```typescript
async function exchangeCodeForTokens(
  tokenEndpoint: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
  clientId: string
) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
      client_id: clientId
    })
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    tokenType: data.token_type
  };
}

// In your callback handler
const tokens = await exchangeCodeForTokens(
  config.tokenEndpoint,
  authorizationCode, // From callback URL parameter
  codeVerifier,      // Stored from Step 3
  'http://localhost:8080/callback',
  clientId
);
```

### Step 6: Refresh Tokens

```typescript
async function refreshAccessToken(
  tokenEndpoint: string,
  refreshToken: string
) {
  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${await response.text()}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  };
}

// Refresh tokens before they expire
const newTokens = await refreshAccessToken(
  config.tokenEndpoint,
  tokens.refreshToken
);
```

### Complete Authentication Manager

```typescript
class KiwiAuthManager {
  private clientId?: string;
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiry?: number;
  private config: any;

  constructor(private baseUrl: string) {}

  async initialize() {
    this.config = await discoverOAuthConfig(this.baseUrl);
    const { clientId } = await registerClient(
      this.config.registrationEndpoint,
      'http://localhost:8080/callback'
    );
    this.clientId = clientId;
  }

  async authenticate(): Promise<string> {
    // Generate PKCE
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString('hex');

    // Build auth URL
    const authUrl = buildAuthorizationUrl(
      this.config.authorizationEndpoint,
      this.clientId!,
      'http://localhost:8080/callback',
      codeChallenge,
      state
    );

    // Open browser or return URL
    console.log('Visit:', authUrl);

    // Wait for callback...
    const code = await this.waitForCallback(); // Implement based on your app

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(
      this.config.tokenEndpoint,
      code,
      codeVerifier,
      'http://localhost:8080/callback',
      this.clientId!
    );

    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiry = Date.now() + tokens.expiresIn * 1000;

    return this.accessToken;
  }

  async getAccessToken(): Promise<string> {
    // Check if token needs refresh
    if (!this.accessToken || Date.now() >= this.tokenExpiry! - 60000) {
      await this.refresh();
    }
    return this.accessToken!;
  }

  async refresh() {
    const tokens = await refreshAccessToken(
      this.config.tokenEndpoint,
      this.refreshToken!
    );
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    this.tokenExpiry = Date.now() + tokens.expiresIn * 1000;
  }

  private async waitForCallback(): Promise<string> {
    // Implement callback server or prompt user
    // This depends on your application type
    throw new Error('Not implemented');
  }
}
```

## Using MCP Tools

### Initialize Authenticated Client

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const authManager = new KiwiAuthManager('http://localhost:3000');
await authManager.initialize();
await authManager.authenticate();

const accessToken = await authManager.getAccessToken();

const transport = new SSEClientTransport(
  new URL('http://localhost:3000/mcp/sse'),
  {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  }
);

const client = new Client(
  { name: 'my-client', version: '1.0.0' },
  { capabilities: {} }
);

await client.connect(transport);
```

### Available Tools

#### 1. Get Authenticated User

Get information about the currently logged-in user.

```typescript
const result = await client.callTool({
  name: 'get_authenticated_user',
  arguments: {}
});

console.log(result.content[0].text);
// { "id": "user-123", "email": "student@example.edu", "systemRole": "student", ... }
```

#### 2. Get Class Roster

Get all enrolled users in a class (Admin or Professor only).

```typescript
const result = await client.callTool({
  name: 'get_class_roster',
  arguments: {
    classId: 'class-abc-123'
  }
});

const roster = JSON.parse(result.content[0].text);
console.log(`Total students: ${roster.totalStudents}`);
```

#### 3. Add Users to Class

Enroll users into a class by email addresses (Admin or Professor only).

```typescript
const result = await client.callTool({
  name: 'add_users_to_class',
  arguments: {
    classId: 'class-abc-123',
    userEmails: ['student1@example.edu', 'student2@example.edu']
  }
});

const enrollment = JSON.parse(result.content[0].text);
console.log(enrollment.message); // "Users enrolled successfully"
```

#### 4. Upload Document

Upload a file to storage (Admin only).

```typescript
import fs from 'fs';

const fileBuffer = fs.readFileSync('./lecture-notes.pdf');
const fileBase64 = fileBuffer.toString('base64');

const result = await client.callTool({
  name: 'upload_document',
  arguments: {
    fileName: 'lecture-notes.pdf',
    fileData: fileBase64,
    mimeType: 'application/pdf',
    storageKey: 'class-abc-123/lecture-notes.pdf' // optional
  }
});

const upload = JSON.parse(result.content[0].text);
console.log('Uploaded to:', upload.key);
console.log('Access URL:', upload.signedUrl);
```

#### 5. Get Document Signed URL

Get a temporary signed URL to access a document.

```typescript
const result = await client.callTool({
  name: 'get_document_signed_url',
  arguments: {
    key: 'class-abc-123/lecture-notes.pdf'
  }
});

const urlInfo = JSON.parse(result.content[0].text);
console.log('Download from:', urlInfo.signedUrl);
console.log('Expires in:', urlInfo.expiresIn);
```

#### 6. Chat (Non-Streaming)

Send a message to the AI assistant.

```typescript
const result = await client.callTool({
  name: 'chat',
  arguments: {
    input: 'Explain recursion in Python with an example'
  }
});

console.log(result.content[0].text);
// AI response text
```

With image:

```typescript
const imageBuffer = fs.readFileSync('./diagram.png');
const imageDataUrl = `data:image/png;base64,${imageBuffer.toString('base64')}`;

const result = await client.callTool({
  name: 'chat',
  arguments: {
    input: 'What does this diagram show?',
    image: imageDataUrl
  }
});
```

#### 7. Chat (Streaming)

Get streaming responses from the AI assistant.

```typescript
const result = await client.callTool({
  name: 'chat_stream',
  arguments: {
    input: 'Explain object-oriented programming'
  }
});

// Note: Streaming is handled by the MCP transport layer
// The result will contain the complete response
console.log(result.content[0].text);
```

### Error Handling

```typescript
try {
  const result = await client.callTool({
    name: 'add_users_to_class',
    arguments: { classId: 'invalid-id', userEmails: [] }
  });

  const response = JSON.parse(result.content[0].text);

  if (response.isError) {
    console.error('Tool error:', response.error);
    console.error('Details:', response.details);
  } else {
    // Success
    console.log(response);
  }
} catch (error) {
  console.error('Request failed:', error.message);
}
```

## Reading MCP Resources

### Available Resources

#### 1. List Classes

Get all classes the authenticated user is enrolled in.

```typescript
const result = await client.readResource({
  uri: 'kiwi://classes'
});

const classes = JSON.parse(result.contents[0].text);
console.log(`You're enrolled in ${classes.totalClasses} classes`);

for (const cls of classes.classes) {
  console.log(`- ${cls.name} (${cls.userRole})`);
}
```

#### 2. Class Documents

Get all documents for a specific class.

```typescript
const result = await client.readResource({
  uri: 'kiwi://class/class-abc-123/documents'
});

const docs = JSON.parse(result.contents[0].text);
console.log(`${docs.totalDocuments} documents available`);

for (const doc of docs.documents) {
  console.log(`- ${doc.fileName}: ${doc.fileUrl}`);
}
```

#### 3. Class Materials

Get comprehensive materials for a class.

```typescript
const result = await client.readResource({
  uri: 'kiwi://class/class-abc-123/materials'
});

const materials = JSON.parse(result.contents[0].text);
console.log(`Class: ${materials.className}`);
console.log(`Professor: ${materials.professorName}`);
console.log(`Documents: ${materials.materials.totalCount}`);
```

#### 4. Storage Document

Get a signed URL for a stored document.

```typescript
const result = await client.readResource({
  uri: 'kiwi://storage/document/class-abc-123/lecture-notes.pdf'
});

const doc = JSON.parse(result.contents[0].text);
console.log('Download:', doc.signedUrl);
```

#### 5. User Analytics

Get analytics for a user (own data, or any user if you're instructor/admin).

```typescript
const result = await client.readResource({
  uri: 'kiwi://analytics/user/user-123'
});

const analytics = JSON.parse(result.contents[0].text);
console.log(`Total interactions: ${analytics.interactionCount}`);
console.log(`Total tokens used: ${analytics.tokenUsage.totalTokens}`);
```

#### 6. Class Analytics

Get analytics for a class (Instructor/Admin/Professor only).

```typescript
const result = await client.readResource({
  uri: 'kiwi://analytics/class/class-abc-123'
});

const analytics = JSON.parse(result.contents[0].text);
console.log(`Unique users: ${analytics.metrics.uniqueUsers}`);
console.log(`Total interactions: ${analytics.metrics.totalInteractions}`);
```

#### 7. Top Token Users

Get top 10 users by token usage (Instructor/Admin only).

```typescript
const result = await client.readResource({
  uri: 'kiwi://analytics/top-token-users'
});

const topUsers = JSON.parse(result.contents[0].text);
for (const user of topUsers.topUsers) {
  console.log(`${user.email}: ${user.totalTokens} tokens`);
}
```

## Using MCP Prompts

### Available Prompts

#### 1. Default System Prompt

```typescript
const result = await client.getPrompt({
  name: 'default-system-prompt',
  arguments: {}
});

// Use in your AI application
const systemMessage = result.messages[0].content.text;
```

#### 2. Class Materials Prompt

For assisting with class materials.

```typescript
const result = await client.getPrompt({
  name: 'class-materials-prompt',
  arguments: {
    classId: 'class-abc-123' // optional
  }
});

const systemMessage = result.messages[0].content.text;
```

#### 3. Recitation Guidance Prompt

For guiding students through problems (emphasizes guidance over answers).

```typescript
const result = await client.getPrompt({
  name: 'recitation-guidance-prompt',
  arguments: {
    topic: 'loops' // optional
  }
});

const systemMessage = result.messages[0].content.text;
```

#### 4. Complete Assistant Prompt

Get a complete system prompt with mode-specific instructions.

```typescript
const result = await client.getPrompt({
  name: 'complete-assistant-prompt',
  arguments: {
    classId: 'class-abc-123',
    mode: 'class-materials' // 'default', 'class-materials', or 'recitation'
  }
});

// Returns multiple messages
for (const msg of result.messages) {
  console.log('System message:', msg.content.text);
}
```

## Complete Client Example

Here's a complete example application:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

class KiwiMCPClient {
  private client: Client;
  private authManager: KiwiAuthManager;

  constructor(baseUrl: string) {
    this.authManager = new KiwiAuthManager(baseUrl);
  }

  async connect() {
    // Initialize auth
    await this.authManager.initialize();
    await this.authManager.authenticate();

    // Get access token
    const accessToken = await this.authManager.getAccessToken();

    // Create transport with auth
    const transport = new SSEClientTransport(
      new URL(`${this.authManager.baseUrl}/mcp/sse`),
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );

    // Connect client
    this.client = new Client(
      { name: 'kiwi-client', version: '1.0.0' },
      { capabilities: {} }
    );

    await this.client.connect(transport);
  }

  async getCurrentUser() {
    const result = await this.client.callTool({
      name: 'get_authenticated_user',
      arguments: {}
    });
    return JSON.parse(result.content[0].text);
  }

  async getMyClasses() {
    const result = await this.client.readResource({
      uri: 'kiwi://classes'
    });
    return JSON.parse(result.contents[0].text);
  }

  async chat(message: string, imageDataUrl?: string) {
    const result = await this.client.callTool({
      name: 'chat',
      arguments: {
        input: message,
        ...(imageDataUrl && { image: imageDataUrl })
      }
    });
    return result.content[0].text;
  }

  async getClassDocuments(classId: string) {
    const result = await this.client.readResource({
      uri: `kiwi://class/${classId}/documents`
    });
    return JSON.parse(result.contents[0].text);
  }

  async enrollStudents(classId: string, emails: string[]) {
    const result = await this.client.callTool({
      name: 'add_users_to_class',
      arguments: { classId, userEmails: emails }
    });
    return JSON.parse(result.content[0].text);
  }

  async disconnect() {
    await this.client.close();
  }
}

// Usage
async function main() {
  const client = new KiwiMCPClient('http://localhost:3000');

  try {
    await client.connect();

    const user = await client.getCurrentUser();
    console.log('Logged in as:', user.email);

    const classes = await client.getMyClasses();
    console.log('My classes:', classes.classes.map(c => c.name));

    const answer = await client.chat('Explain Python list comprehensions');
    console.log('AI:', answer);

  } finally {
    await client.disconnect();
  }
}

main().catch(console.error);
```

## Troubleshooting

### Connection Issues

**Problem**: `Failed to connect to MCP server`

**Solution**:
- Verify server is running: `curl http://localhost:3000/mcp/capabilities`
- Check your base URL configuration
- Ensure network connectivity

### Authentication Errors

**Problem**: `401 Unauthorized`

**Solution**:
- Check if access token is expired - refresh it
- Verify token is included in `Authorization` header
- Ensure you have the required scopes

**Problem**: `Invalid redirect_uri`

**Solution**:
- Ensure redirect URI exactly matches what you registered
- Include protocol (http/https) and port
- Must be HTTPS (except localhost)

### Token Refresh Errors

**Problem**: `400 Bad Request - Unsupported grant_type`

**Solution**:
- Ensure you're sending `grant_type: 'refresh_token'`
- Include `refresh_token` parameter in request body

**Problem**: `401 Invalid or revoked refresh token`

**Solution**:
- Token may have been revoked - re-authenticate
- Check token hasn't expired
- Ensure you're using the latest refresh token (they rotate)

### Permission Errors

**Problem**: `403 Forbidden - Insufficient permissions`

**Solution**:
- Check your user role (student/professor/instructor/admin)
- Verify you're enrolled in the class you're accessing
- Some tools require admin/professor access only

### CORS Errors (Browser Clients)

**Problem**: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solution**:
- Server must add your origin to `FRONTEND_URL` environment variable
- For development, use a proxy or backend-to-backend calls
- OAuth flows may require redirect through backend

## Security Best Practices

### Storing Tokens

**Never store tokens in:**
- Browser localStorage (vulnerable to XSS)
- URL parameters or query strings
- Client-side cookies without httpOnly flag

**Recommended storage:**
- Server-side session storage
- Secure HTTP-only cookies (set by backend)
- OS keychain for desktop apps
- Encrypted storage for mobile apps

### Token Refresh Strategy

```typescript
class SecureTokenManager {
  private accessToken?: string;
  private refreshToken?: string;
  private tokenExpiry: number = 0;

  async getAccessToken(): Promise<string> {
    // Refresh if token expires in < 1 minute
    if (Date.now() >= this.tokenExpiry - 60000) {
      await this.refresh();
    }
    return this.accessToken!;
  }

  async refresh() {
    // Implement refresh logic
    // Update this.accessToken, this.refreshToken, this.tokenExpiry
  }

  clearTokens() {
    this.accessToken = undefined;
    this.refreshToken = undefined;
    this.tokenExpiry = 0;
  }
}
```

### PKCE Implementation

Always use PKCE for public clients (no client secret):

```typescript
// Generate cryptographically secure random code verifier
const codeVerifier = crypto.randomBytes(32).toString('base64url');

// Use SHA-256 for code challenge (not plain)
const codeChallenge = crypto
  .createHash('sha256')
  .update(codeVerifier)
  .digest('base64url');
```

### Handling Secrets

If you have a confidential client:

```typescript
// NEVER expose client_secret in browser/frontend code
// Only use on backend/server

// Backend only:
const tokens = await fetch(tokenEndpoint, {
  method: 'POST',
  headers: {
    'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
  },
  body: JSON.stringify({ /* ... */ })
});
```

## Next Steps

1. **Explore Examples**: Check `examples/` directory for complete applications
2. **Read MCP Docs**: Visit [MCP documentation](https://modelcontextprotocol.io) for protocol details
3. **Join Community**: Connect with other developers building on Kiwi MCP
4. **Report Issues**: File bugs or feature requests on GitHub

## API Reference Quick Link

- **Tools**: 8 available (see "Using MCP Tools" section)
- **Resources**: 7 available (see "Reading MCP Resources" section)
- **Prompts**: 4 available (see "Using MCP Prompts" section)
- **Scopes**: `openid`, `profile`, `email`, `mcp:tools`, `mcp:resources`, `mcp:prompts`
- **OAuth Discovery Endpoints**:
  - `/.well-known/oauth-authorization-server` - OAuth server metadata (RFC 8414)
  - `/.well-known/oauth-protected-resource` - Protected resource metadata (RFC 9728)
  - `/.well-known/jwks.json` - JSON Web Key Set for RS256 public key verification
