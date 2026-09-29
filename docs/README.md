# Kiwi documentation

Start with the [project README](../README.md) for what Kiwi is and how to run
it locally.

## Running Kiwi

- [Administration](administration.md) — the first admin, accounts and roles,
  Google sign-in, branding, and a production checklist.
- [How prompts work](prompts.md) — built-in, class-level and experiment
  instructions, and who can change them.
- [JWT configuration](jwt-configuration.md) — token signing and verifying Kiwi
  tokens from other services.
- [Document parsers](parsers.md) — Xberg or Unstructured for parsing uploads.
- [Object storage](object-storage.md) — RustFS, MinIO or S3 for uploaded files,
  CORS, and moving from MinIO.
- [Embeddings](embeddings.md) — embedding providers and re-embedding documents.
- [Email](email.md) — SMTP settings, templates, and the email endpoints.
- [Webhooks](webhooks.md) — receiving enrollment and other events from
  external systems.

## Teaching with Kiwi

- [Learning experiments](../kiwi-ui/docs/experiments.md) — A/B testing chat
  settings in a class.

## Building on Kiwi

- [MCP server](mcp.md) — connecting AI clients to Kiwi over the Model Context
  Protocol.
- [Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md)
  — embedding your own app in Kiwi, with the
  [Hello Kiwi example](../kiwi-app-developer-guide-example/hello-kiwi-app/README.md).
- [Kiwi App SDK](../kiwi-app-sdk/README.md) and its
  [operation reference](../kiwi-app-sdk/BRIDGE-OPS.md).

## Contributing

- [Contributing guide](../CONTRIBUTING.md)
- [Backend development](development.md) — modules, migrations, seeding,
  feature flags, exploring the API.
- [Frontend](../kiwi-ui/README.md) and its [testing notes](../kiwi-ui/TESTING.md).
- [Kiwi Apps host internals](../kiwi-ui/KIWI-APPS.md)
- [Kiwi Apps manual QA checklist](kiwi-apps-qa-checklist.md)

The documentation in this directory is licensed CC BY 4.0 (see
[LICENSE](LICENSE)).
