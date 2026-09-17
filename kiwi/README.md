# Kiwi Framework

## Project Overview

This directory is the back-end service supporting the Kiwi system. The Kiwi Framework uses [Nest](https://github.com/nestjs/nest).

## Development Setup

### Prerequisites

- **Node.js**
- **Docker**

### Cloning the Repository

```bash
$ git clone <repository-url>
```

### Setup Libraries

```bash
# first, set up the docker by running:
$ npm run infra

# once complete, install Node Version Manager (NVM) to install a specific version of Node.js
$ nvm install

# use the same version of Node.js as this repo (.nvmrc)
$ nvm use

# Node Package Manager (npm) to install dependencies

$ npm install
```


### Setup Environment

- Copy `.env.example` to `.env`
  - set `LLM_API_KEY` to your OpenAI-compatible key, and `LLM_CHAT_MODEL` to the
    model you want to use
  - optionally set `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` for the admin
    account created by the seed (a password is generated if left empty)

### Google sign-in (Optional)

Password login works out of the box. To also allow Google sign-in:

- Go to https://console.cloud.google.com/apis/credentials
- **Create Credentials → OAuth client ID → Web application**
- Add `http://localhost:3000/auth/google` as an authorized redirect URI
- Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Set `GOOGLE_DOMAIN` to the Google Workspace domain(s) allowed to sign in,
  comma-separated, or `*` for any account
- In `kiwi-ui/.env`, set `VITE_ENABLE_GOOGLE_LOGIN=true`

Without `GOOGLE_CLIENT_ID`, the Google routes return 404 and the button is hidden.

### JWT Configuration (Optional)

Kiwi supports RS256 (asymmetric) JWT signing for secure token verification by external services.

**Development**: No configuration needed - ephemeral keys are auto-generated on startup.

**Production**: Set these environment variables:
```bash
# Generate RSA key pair
openssl genrsa -out private.pem 2048
openssl rsa -in private.pem -pubout -out public.pem

# Base64 encode and add to .env
JWT_PRIVATE_KEY=$(base64 < private.pem | tr -d '\n')
JWT_PUBLIC_KEY=$(base64 < public.pem | tr -d '\n')
```

External services can verify Kiwi JWTs by fetching the public key from `/.well-known/jwks.json`.

### Setup database
```bash
$ npx prisma migrate deploy
$ npx prisma db seed    # creates the admin account and prints its password
```
### Run the app
```bash
$ npm run dev

# to view the database on the browser, run
$ npx prisma studio

```
- Once the app start running, go to http://localhost:3000/docs (Swagger),you can see the API description
- Set up the frontend app: see `../kiwi-ui`
- If Google sign-in is enabled and returns "403 Forbidden", check whether your Google account session has expired in the browser.

## License

MIT — see the [LICENSE](../LICENSE) at the repository root.
