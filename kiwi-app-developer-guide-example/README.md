# Kiwi App Examples

This repository is a reference workspace for building external Kiwi Apps.

A Kiwi App is a separately hosted web app that Kiwi embeds in an iframe. The app
communicates with Kiwi through `window.postMessage`; with a scoped app token it
can also call Kiwi's REST and MCP APIs.

## What Is In This Repo

- `KIWI_APP_DEVELOPER_GUIDE.md`: the source of truth for the Kiwi App protocol,
  registration flow, REST/MCP access, and troubleshooting notes.
- `AGENTS.md`: repo-level instructions for coding agents.
- `hello-kiwi-app/`: a zero-build, single-file reference app.
- `hello-kiwi-app/index.html`: the main demo app. It works standalone through a
  built-in Simulator and also works embedded in Kiwi after registration.
- `hello-kiwi-app/register.sh`: helper script for whitelist, registration, and
  class-enable steps.

## Quick Start

Run the reference app as a static site:

```bash
cd hello-kiwi-app
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

If the app is opened outside Kiwi, it automatically uses Simulator mode and
fakes context, token, streaming AI, and MCP replies locally. This is the fastest
way to inspect the bridge protocol without starting a Kiwi backend.

For live Kiwi embedding, read `KIWI_APP_DEVELOPER_GUIDE.md` first, then adapt:

```bash
cd hello-kiwi-app
ADMIN_TOKEN=eyJ... CLASS_ID=<classId> APP_URL=http://localhost:8000 ./register.sh
```

The live registration flow is:

```text
admin whitelist -> public app register -> admin/instructor enable in class
```

## Using AGENTS.md With Coding Agents

`AGENTS.md` is the shared instruction file for this repo. It is plain Markdown,
so keep the file readable by humans and agents. Put stable repository rules
there, and keep long protocol details in `KIWI_APP_DEVELOPER_GUIDE.md`.

### OpenAI Codex

Codex reads `AGENTS.md` automatically when launched from this repository.

Useful checks:

```bash
codex "Summarize the active project instructions."
codex --cd hello-kiwi-app "Summarize the active project instructions."
```

For personal defaults across all repos, use:

```text
~/.codex/AGENTS.md
```

Project-level instructions should stay in this repo's `AGENTS.md`.

### Claude Code

Many Claude Code setups use `CLAUDE.md` as the automatic project memory file. To
reuse this repo's `AGENTS.md` without duplicating rules, add a small
`CLAUDE.md` file at the repo root:

```md
@AGENTS.md
```

Alternatively, create a symlink:

```bash
ln -s AGENTS.md CLAUDE.md
```

Do not maintain separate, divergent copies of the same instructions.

### Gemini CLI

Configure Gemini CLI to load `AGENTS.md` by adding `.gemini/settings.json`:

```json
{
  "context": {
    "fileName": "AGENTS.md"
  }
}
```

Then start Gemini CLI from the repository root.

### Aider

Configure Aider to read this file by adding `.aider.conf.yml`:

```yaml
read: AGENTS.md
```

Then run Aider from the repository root so paths in the instructions resolve
correctly.

### Cursor, Windsurf, VS Code, And Other Agents

If the tool supports `AGENTS.md` directly, start it from the repository root and
confirm it loaded the file. If it only supports a proprietary rules file, keep
that file as a thin pointer to `AGENTS.md` instead of copying the instructions.

Examples:

```md
Read and follow ./AGENTS.md.
```

or:

```md
@AGENTS.md
```

Use whichever include syntax your tool supports.

## How To Keep Agent Instructions Healthy

- Keep `AGENTS.md` short enough to be loaded reliably.
- Put durable workflow rules in `AGENTS.md`.
- Put detailed Kiwi protocol reference material in `KIWI_APP_DEVELOPER_GUIDE.md`.
- Add nested `AGENTS.md` files only when a subdirectory needs different rules.
- Avoid storing secrets, JWTs, app registration secrets, or local environment
  values in agent instruction files.

## Development Notes

- The reference app has no package install or build step.
- Standalone Simulator mode should keep working after every app change.
- Live REST/MCP calls require CORS configuration in the Kiwi backend.
- Bridge AI through `kiwi:askAI` does not need CORS.
- New apps should generally copy `hello-kiwi-app/index.html` first, then simplify
  or extend it.
