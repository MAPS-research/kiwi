---
name: kiwi-setup
description: Guide a person, step by step and in plain language, through installing, configuring, running and first using the Kiwi AI learning assistant (github.com/MAPS-research/kiwi) on their own computer — Docker services, backend, frontend, admin sign-in, then creating a class, uploading a PDF and chatting about it. Use this whenever someone wants to set up, install, run, start, restart, resume or check Kiwi locally, try Kiwi out, find the admin password, or is stuck on a Kiwi setup problem (ports in use, Docker, Node version, database, CORS, materials stuck processing, can't sign in), even if they don't say "setup". Also the starting point before contributing code to Kiwi.
license: MIT
compatibility: Needs a shell that can run bash scripts (macOS, Linux, or Windows through WSL2), git, Docker and internet access.
metadata:
  repository: https://github.com/MAPS-research/kiwi
---

# Setting up Kiwi with someone

Kiwi is an open-source AI learning assistant for university courses. Your job
is to get it running on this person's computer **and** to keep them oriented
the whole way: many people asking for this are instructors or researchers, not
developers. A setup they can't follow feels broken even when it works.

The finish line: they open http://localhost:3001 in their browser, sign in as
administrator, create a class, upload a PDF and get an answer about it.

All paths are relative to the repository root (the folder containing `kiwi/`,
`kiwi-ui/` and `docs/`). This skill lives in `.agents/skills/kiwi-setup/`;
its scripts are in `.agents/skills/kiwi-setup/scripts/`.

## Part 1 — How to talk to the person (read this first)

### Every step has a "before" and an "after" message

**Before** you run anything in a step, tell them in two to four sentences:

1. where you are: **"Step 4 of 8 — Starting the background services"**
2. what you're about to do, in everyday words
3. why: what problem this step solves, or what would go wrong without it
4. how long it may take, and whether they need to do anything

**After** the step, tell them:

1. the outcome in one plain sentence, marked ✅ (or ⚠️/❌)
2. anything they should note down (only the admin password, really)
3. what comes next

During anything slower than about a minute (downloads, installs), send a
one-line update when something visible happens, so silence doesn't read as a
hang. Each step below has suggested wording; adapt it, don't recite it.

**Use the person's language** — if they write in Chinese, every message to
them is in Chinese. Keep command output out of your messages unless they ask;
summarise it. Explain a technical word the first time you use it, with the
glossary at the end of this file.

### When they need to do something: a "your turn" message, then stop

Some things only the person can do: install an app, make a decision, get an
API key, open the browser. When that happens, send exactly this shape:

```
🙋 Your turn — <what, in a few words>

Why: <one sentence: what this unblocks>

What to do:
1. <concrete action, with exact link / menu path / file path>
2. ...

When you're done: reply "<a short phrase>"<, or paste X>.
If you get stuck: <the most likely snag and what to do about it>.
```

Then **end your turn and wait.** Don't continue with other steps, don't poll,
don't guess the answer. When they reply, **check** that it worked (the
doctor, or the check named in that step) before moving on. If the check
fails, say what you saw in plain words and send a corrected "your turn".

If you need **several things at the same point** (step 3 can need a
decision, a key and a password), put them in one message as numbered items
①②③ and say how to answer all of them in one reply ("e.g. A, key added,
generate"). One round trip beats three.

For **decisions**, give two or three options, mark the one you recommend,
and say what each means for them in practice ("your other project keeps
running" beats "non-destructive").

### When something fails

Say what failed in one sentence, what it means for them, and what you'll do
about it. Look it up in [references/troubleshooting.md](references/troubleshooting.md)
before improvising. Never fix a problem by deleting their data (see the rules
below). If you're stuck after two attempts, say so and ask.

### Start and finish with the map

At the start, show the plan so they know what's coming:

```
Here's the plan (about 20–30 minutes, mostly waiting for downloads):
1. Get the Kiwi code                    5. Set up the backend (server + database)
2. Check your computer                  6. Set up the frontend (the web pages)
3. Choose settings (needs your API key) 7. Sign in for the first time
4. Start the background services        8. A short tour: class → PDF → chat
I'll tell you before and after each step, and stop whenever I need you.
```

If you're resuming, show the same list with ✅ on finished steps. At the end,
show it all ticked, plus how to start and stop Kiwi later.

## Part 2 — Rules that protect their computer

- **Never delete Docker volumes** — no `docker compose down -v`, no
  `docker volume rm`. Their database, uploaded files and a 1 GB parser model
  cache live there. To stop things, use `docker compose stop`.
- **Never run `npx prisma db push`, `migrate dev` or `migrate reset`.** Only
  `npx prisma migrate deploy`. `db push` skips the SQL that creates the
  vector indexes, so search silently breaks; the others can wipe the database.
- **Keep secrets out of the chat and out of git.** Write `.env` values with
  `scripts/set-env.sh` (it never prints them). Don't print `.env` files. The
  only secret you show is the admin password, because they need it.
- **Ask before touching anything that isn't Kiwi's**: another project's
  containers, their global Node, Docker settings, shell profile.
- **Leave `DEV_AUTH=false`.** Turned on, anyone who can reach the server can
  make themselves administrator.

## Part 3 — The steps

**Always start with the doctor**, and run it again after each step:

```bash
bash .agents/skills/kiwi-setup/scripts/doctor.sh
```

It only reads, never changes anything. It checks tools, ports, settings,
Docker services, database and running servers, and ends with a `NEXT` line
naming the first thing to do. Setups get interrupted; the doctor tells you
which step to resume at, so you never redo or skip work.

**Shell sessions don't carry over** between your commands in most agents. If
the doctor says the Node on PATH is the wrong version, put the prefix it
prints in front of every `npm`/`npx` command
(e.g. `source ~/.nvm/nvm.sh && nvm use v24.21.0 >/dev/null && npm install`).
`scripts/dev-servers.sh` handles this by itself.

### Step 0 — Understand what they want (no number shown to them)

If unclear, ask one question: try Kiwi on this computer, or prepare it for
real students? For real use, still do this local setup first, then go through
`docs/administration.md#before-going-to-production` together. Then show the
plan.

### Step 1 — Get the Kiwi code

*Say first:* "Step 1 of 8 — Getting the Kiwi code. I'll download Kiwi's
source code from GitHub into a folder on your computer. Everything else runs
from that folder. Takes under a minute."

Skip if the doctor finds the repository. Otherwise ask where they'd like it
(default: the current folder), then:

```bash
git clone https://github.com/MAPS-research/kiwi.git
```

*Say after:* "✅ The code is in `<path>`. Next I'll check that your computer
has what Kiwi needs."

### Step 2 — Check the computer

*Say first:* "Step 2 of 8 — Checking your computer. Kiwi needs Docker (runs
its database and helpers in sealed boxes called containers), a specific
version of Node.js (runs Kiwi's own code), and a few free network ports. I'll
check all of this without changing anything."

Run the doctor and read sections 1–2. For each problem, in this order:

- **Docker missing or not running** → 🙋 their turn. Installing it needs their
  admin password and a graphical installer:
  Docker Desktop from https://www.docker.com/products/docker-desktop/ (macOS,
  Windows) or https://docs.docker.com/engine/install/ (Linux). If it's
  installed but stopped: open Docker Desktop and wait until it says it's
  running. Reply "Docker is running". Check: doctor section 1.
- **Docker memory under 8 GB** → 🙋 their turn: Docker Desktop → Settings →
  Resources → Memory to 8 GB or more → Apply & restart. Why: the document
  reader (Xberg) alone may use 6 GB and gets killed without it.
- **Wrong Node version** → you can fix it, but it installs software, so ask
  first. With nvm present: `source ~/.nvm/nvm.sh && nvm install v24.21.0`
  (use the version in `kiwi/.nvmrc`). This adds a version without replacing
  the one they use elsewhere. Without nvm, offer to install it from
  https://github.com/nvm-sh/nvm#installing-and-updating (it edits their shell
  profile — say so).
- **Port taken** → 🙋 their turn, a decision. Name who holds it (the doctor
  says), explain a port is like a numbered door that only one program can use
  at a time, and offer the options in
  [references/configuration.md → Port conflicts](references/configuration.md#port-conflicts):
  move Kiwi to other doors (recommended: nothing else is affected) or stop the
  other program. Apply their choice, then re-run the doctor.

*Say after:* "✅ Your computer is ready: Docker <version>, Node <version>,
all ports free<, Kiwi will use ports X/Y instead of …>. Next: settings, where
I'll need an API key from you."

### Step 3 — Choose settings

*Say first:* "Step 3 of 8 — Settings. Kiwi keeps its settings in a file
called `kiwi/.env`. Most defaults already fit. Two things need you: an API
key for the AI model that powers the assistant, and optionally your own
administrator password. I'll also generate secret keys that protect sign-ins."

```bash
[ -f kiwi/.env ] || cp kiwi/.env.example kiwi/.env
bash .agents/skills/kiwi-setup/scripts/set-env.sh kiwi/.env JWT_SECRET --random
bash .agents/skills/kiwi-setup/scripts/set-env.sh kiwi/.env SESSION_SECRET --random
```

**If the doctor warned about another Kiwi checkout** sharing containers →
🙋 their turn, a decision: *share* that copy's database (its data and its old
admin password come along) or *start fresh* (recommended for a new install;
the old data stays untouched). For fresh:
`set-env.sh kiwi/.env COMPOSE_PROJECT_NAME kiwi-<short-name>`.

**The API key** → 🙋 their turn. First ask which AI provider they'll use. For
OpenAI (the default):

```
🙋 Your turn — an OpenAI API key

Why: Kiwi's assistant uses an AI model to answer questions and to index
your course materials. The key lets Kiwi use your OpenAI account (usage is
billed to that account, typically cents for testing).

What to do:
1. Go to https://platform.openai.com/api-keys and sign in.
2. Click "Create new secret key" and copy it (starts with "sk-").
   The account needs a payment method or credit.
3. Either:
   a) open <full path>/kiwi/.env in a text editor, find the line
      LLM_API_KEY="" and paste the key between the quotes, save; or
   b) paste the key here and I'll put it in the file for you
      (it will then be in this chat's history).

When you're done: reply "key added", or paste the key.
If you get stuck: an "insufficient quota" error later means the account has
no credit — add some under Billing.
```

For another provider, read [references/configuration.md → LLM providers](references/configuration.md#llm-providers)
before writing anything: the embedding model must produce 1536-number
vectors, and you'll also set `LLM_BASE_URL` and model names. If they pasted
the key, write it with
`printf '%s' '<key>' | bash .agents/skills/kiwi-setup/scripts/set-env.sh kiwi/.env LLM_API_KEY --stdin`.

**Check the key now**, not after an hour of installing:

```bash
node .agents/skills/kiwi-setup/scripts/check-llm.mjs
```

If it fails, translate its reason ("the key was rejected", "no credit",
"wrong number of dimensions") and send a new "your turn".

**No key yet?** That's fine: steps 4–7 don't need one. Say so, mark step 3
"key pending" in the plan, and ask again before the tour (step 8), which does.
Uploads and chat are the only things that need it.

**Admin password (optional)** — ask in the same message as the key: "Do you
want to choose the administrator password, or shall Kiwi generate one?" If
they give it to you, write it with `set-env.sh … SEED_ADMIN_PASSWORD --stdin`.
If they'd rather edit `kiwi/.env` themselves, tell them to wrap the password
in single quotes (`SEED_ADMIN_PASSWORD='…'`) so characters like `$` and `#`
survive, and to avoid `'` in it.

*Say after:* "✅ Settings saved, and your API key works (tested with one tiny
request). Next I'll start Kiwi's background services — the first time
involves a ~2 GB download."

### Step 4 — Start the background services

*Say first:* "Step 4 of 8 — Background services. Kiwi relies on a database
(stores users, classes and the searchable text of your materials), a job
queue, file storage for PDFs, and a document reader that turns PDFs into
text. Docker runs each in its own container. First time: about 2 GB to
download, usually 3–10 minutes. You don't need to do anything."

```bash
cd kiwi && docker compose up -d
```

Re-run the doctor until section 4 passes. The document reader (`xberg`) shows
"health check still starting" for about a minute after it starts — normal.
`oss-init` showing *exited* with code 0 is also normal: it's a one-time job
that creates the storage bucket. Failures → `docker compose logs <service>`
and [references/troubleshooting.md](references/troubleshooting.md).

*Say after:* "✅ All five background services are running. Next: the backend
— Kiwi's server, plus setting up the database and your admin account."

### Step 5 — Set up the backend

*Say first:* "Step 5 of 8 — The backend. This is Kiwi's server: it handles
sign-ins, classes, the AI assistant and file processing. I'll install its
building blocks (a few minutes), create the database tables, create your
administrator account, and start the server."

From `kiwi/`, with the Node prefix if needed:

```bash
npm install
npx prisma migrate deploy      # creates/updates the database tables
npx prisma db seed             # creates the admin account
```

**Read the seed's last lines** (from `Admin login`). It shows the admin email
(default `admin@example.com`) and one of:

- a generated password marked *shown once* → give it to them in a clearly
  separated block and ask them to save it in a password manager now — it
  can't be shown again;
- `from SEED_ADMIN_PASSWORD` → the one they chose;
- `unchanged (already set)` → this database already had an admin (earlier
  install or shared checkout). If they don't know that password, set
  `SEED_ADMIN_PASSWORD` and run the seed again; that resets only the password.

Start the server in the background (it keeps running after this command):

```bash
bash .agents/skills/kiwi-setup/scripts/dev-servers.sh start backend
```

It waits until the server answers (usually 10–60 seconds) and prints the end
of the log if it doesn't. Then, **in a separate command**, run
`dev-servers.sh status`: some agents kill background processes when a command
ends. If the backend is gone, use a 🙋 your turn instead: ask them to open a
new terminal window, run `cd <path>/kiwi && npm run start:dev`, and leave that
window open.

Some output looks alarming but is normal on a fresh local install — mention
it only if they see it, or briefly if you quote the log:

- npm: "install scripts not yet covered by allowScripts" — newer npm skips
  dependencies' install scripts; none of the listed ones are needed.
- backend log: `Engine … is disabled: API key is not configured` (until
  there's a key; always for Qwen), `Generating ephemeral keys` (JWT, fine
  locally), `[CTX-CEILING] no context window known`, a duplicate-DTO warning,
  and `[EmailService] Email transporter verification failed` — email is in
  test mode by default and only logged, so there are no SMTP credentials.

*Say after:* "✅ The server is running and your admin account exists.
📌 Save this: email `admin@example.com`, password `<…>`. Next: the web pages
you'll actually use."

### Step 6 — Set up the frontend

*Say first:* "Step 6 of 8 — The frontend: the web pages you'll open in your
browser. Installing its building blocks takes a few minutes, then I'll start
it."

```bash
[ -f kiwi-ui/.env ] || cp kiwi-ui/.env.example kiwi-ui/.env
(cd kiwi-ui && npm install)
bash .agents/skills/kiwi-setup/scripts/dev-servers.sh start frontend
```

Same fallback as step 5 if background processes don't survive
(`cd <path>/kiwi-ui && npm run dev` in a terminal they keep open).

*Say after:* "✅ The web app is running. Next: you sign in for the first time."

### Step 7 — First sign-in

Run the doctor — every check should pass (mention warnings briefly). Then:

```
🙋 Your turn — sign in to Kiwi

Why: this confirms the whole chain works — browser → web pages → server →
database.

What to do:
1. Open http://localhost:3001 in your browser.
2. Sign in with admin@example.com and the password from step 5.

When you're done: reply "I'm in" (or tell me what you see instead).
If you get stuck: "Invalid credentials" → tell me, I can reset the password.
A blank page or a network error → tell me, I'll check the logs.
```

If you have browser tools, you can offer to do this yourself while they
watch — still ask first.

*Say after:* "✅ You're signed in as administrator — Kiwi is installed.
Would you like a 5-minute tour: create a class, upload a PDF, and ask the
assistant about it? That's the real test that everything works."

### Step 8 — The tour

Follow [references/using-kiwi.md](references/using-kiwi.md). It has the same
before/after shape. The person needs a PDF of their own (lecture slides,
notes) — ask for it in a "your turn".

If the key was left for later, ask for it first (same "your turn" as step 3),
run `check-llm.mjs`, then restart the backend so it picks the key up — it
reads `kiwi/.env` only at start:
`bash .agents/skills/kiwi-setup/scripts/dev-servers.sh stop backend` then
`… start backend`.

### Wrap-up message

Show the plan with every step ✅, then:

- **Use Kiwi:** http://localhost:3001 — admin@example.com / the saved password
- **Stop Kiwi** (data is kept):
  `bash .agents/skills/kiwi-setup/scripts/dev-servers.sh stop` and
  `cd kiwi && docker compose stop`
- **Start Kiwi again:** Docker Desktop running, then `cd kiwi && docker compose up -d`
  and `bash .agents/skills/kiwi-setup/scripts/dev-servers.sh start`
- **Something wrong?** Ask an agent to "check my Kiwi setup" — the doctor
  shows what's down.
- **After updating the code** (`git pull`): `npm install` in `kiwi/` and
  `kiwi-ui/`, and `npx prisma migrate deploy` in `kiwi/`, before starting.
- **Anything you changed outside Kiwi**, and how to undo it — e.g. if you
  stopped another project to free a port: how to start it again, and that it
  can't run at the same time as Kiwi on those ports.
- **Anything still pending**, such as the API key, and what it unlocks.

If they stop before the tour, give this message anyway, with the unfinished
steps marked ⬜.

## Part 4 — Reference

### Plain-language glossary

Use these when a term first comes up.

| Term | Say something like |
|---|---|
| Repository / repo | The folder with Kiwi's source code, downloaded from GitHub |
| Docker, container | An app that runs other programs in sealed boxes, so they don't clash with what's on your computer |
| Port | A numbered door on your computer; each program listens at its own, and only one program can use a door at a time |
| Node.js, npm | The engine that runs Kiwi's code, and the tool that downloads its building blocks |
| Backend / server | The part that does the work behind the scenes: accounts, classes, the AI |
| Frontend | The web pages you open in the browser |
| Database | Where Kiwi stores users, classes and the searchable text of your materials |
| Migration | Instructions that create or update the database's tables |
| Seed | Filling a fresh database with starting data — here, the admin account |
| API key | A password that lets Kiwi use your AI provider account; usage is billed there |
| Embedding | Turning text into numbers so Kiwi can find the passages relevant to a question |
| `.env` file | A settings file; it holds secrets, so it never leaves your computer |
| localhost | "This computer" — the address only you can reach |

### What's running, and where

| Part | Port | Started by |
|---|---|---|
| Web app (frontend) | 3001 | `dev-servers.sh start frontend` |
| Server (backend), API docs at /docs | 3000 | `dev-servers.sh start backend` |
| Database (PostgreSQL + pgvector) | 5432 | `docker compose up -d` in `kiwi/` |
| Job queue (Redis) | 6379 | 〃 |
| File storage (RustFS), console at :9001 | 9000 | 〃 |
| Document reader (Xberg) | 8002 | 〃 |
| Database browser (Adminer) | 8081 | 〃 |

### Scripts

| Script | What it does |
|---|---|
| `scripts/doctor.sh` | Read-only check of everything; names the next step |
| `scripts/set-env.sh FILE KEY [value\|--random\|--stdin]` | Sets a `.env` value without printing it |
| `scripts/check-llm.mjs` | Tests the API key, embedding size and chat model |
| `scripts/dev-servers.sh start\|stop\|status\|logs` | Runs the backend and frontend in the background |

### More

- Something broken → [references/troubleshooting.md](references/troubleshooting.md)
- Ports, other AI providers, Qwen, Google sign-in, branding, email,
  production → [references/configuration.md](references/configuration.md)
- Using Kiwi → [references/using-kiwi.md](references/using-kiwi.md)
- Project docs, checked against the code → `docs/README.md`
