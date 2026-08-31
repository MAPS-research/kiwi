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

- Copy the .env.example to .env
  - change the LLM_CHAT_MODEL to the model you want to use, (we are using "gpt-4o" for now)
  - set Google Oauth Client ID: https://developers.google.com/identity/protocols/oauth2
    - Go to https://console.cloud.google.com/apis/credentials
    - +Create Credentials -> OAuth Client ID -> Type: Web application
    - set the name and Authorized redirect URIs = http://localhost:3000/auth/google
    - copy and paste your Client ID and Client secret to GOOGLE_CLIENT_ID  &  GOOGLE_CLIENT_SECRET
    - GOOGLE_DOMAIN="example.edu" (the domain of your org)
  - set LLM_API_KEY to your OpenAI key

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
$ npx prisma db push
```
### Run the app
```bash
$ npm run dev

# to view the database on the browser, run
$ npx prisma studio

```
- Once the app start running, go to http://localhost:3000/docs (Swagger),you can see the API description
- Set up the frontend app: see `../kiwi-ui`
- If you are unable to log in with Google OAuth and see the error message "403 Forbidden," please check whether your Google account session has expired in Chrome.

## License

MIT — see the [LICENSE](../LICENSE) at the repository root.
