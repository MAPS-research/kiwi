# Backend Plugins

## Codegen

The plugin can be run by running
```bash
docker compose up -f compose.yml -f compose.plugins.yml --profile codegen up -d
```

Required environment variables:
CODEGEN_API_URL=http://codegen-app:8000
CODEGEN_POSTGRES_USER=
CODEGEN_POSTGRES_PASSWORD=
CODEGEN_POSTGRES_DB=

### Development
During development, you can access the codegen app at http://localhost:8001.