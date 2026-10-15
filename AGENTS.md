# AGENTS.md

Orientation for AI coding agents working in this repository.

## Setting up or running Kiwi

If you are asked to install, set up, run, start, restart or check Kiwi on
someone's computer, or to help with a setup problem, read
[`.agents/skills/kiwi-setup/SKILL.md`](.agents/skills/kiwi-setup/SKILL.md)
and follow it. It is an [Agent Skill](https://agentskills.io): plain Markdown
with bash and Node helper scripts, written for any agent that can run shell
commands. It covers explaining each step to people without a technical
background and stopping when they need to act.

## Repository layout

| Directory | What it is | Agent notes |
|---|---|---|
| `kiwi/` | Backend: NestJS, Prisma, PostgreSQL/pgvector | [`kiwi/CLAUDE.md`](kiwi/CLAUDE.md) |
| `kiwi-ui/` | Frontend: React, Vite, MUI | [`kiwi-ui/CLAUDE.md`](kiwi-ui/CLAUDE.md) |
| `kiwi-app-sdk/` | SDK for embedded Kiwi Apps | [`kiwi-app-sdk/README.md`](kiwi-app-sdk/README.md) |
| `kiwi-app-developer-guide-example/` | Example Kiwi App | [`AGENTS.md`](kiwi-app-developer-guide-example/AGENTS.md) |
| `docs/` | Project documentation | [`docs/README.md`](docs/README.md) |

Those files apply to any agent, whatever their file name. Contribution rules
and the checks to run before a pull request are in
[`CONTRIBUTING.md`](CONTRIBUTING.md).
