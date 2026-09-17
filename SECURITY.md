# Security Policy

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report them privately through
[GitHub's private vulnerability reporting](https://github.com/MAPS-research/kiwi/security/advisories/new)
(Security → Report a vulnerability), which notifies the maintainers directly.

Please include as much as you can:

- the nature of the issue (authentication/authorization, data exposure,
  injection, dependency, misconfiguration, …)
- its impact, and who is affected
- steps to reproduce
- links to the relevant code, or to the vulnerable dependency

We aim to acknowledge reports within a week.

## Scope

Kiwi handles student coursework and course materials, so we are particularly
interested in reports concerning:

- cross-tenant data access between classes or users
- the Kiwi Apps bridge — an embedded app reaching data outside its granted
  scopes, or learning the identity of users other than its caller
- authentication, session handling, and JWT/JWKS verification
- API token and webhook authentication

## Deployment note

Kiwi ships with development defaults. Before running it in production, work
through the [production checklist](docs/administration.md#before-going-to-production)
— in particular strong secrets, RS256 JWT keys, `DEV_AUTH=false`, and never
`NO_AUTH=true`. Never commit a populated `.env`.

## Bug bounty

There is no bug bounty for this project.
