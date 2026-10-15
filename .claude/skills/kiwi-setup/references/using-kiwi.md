# First use: a guided tour

Use this after setup to get the person from "it's running" to "I've seen it
work". Go at their pace, one stage at a time, and let them do the clicking
unless they ask you to drive. If you are driving a browser, read the page
before clicking — labels below are from the current UI but may drift.

## Who's who

| System role | Can |
|---|---|
| `user` | Use the classes they're enrolled in (students) |
| `instructor` | Open the admin area and manage classes they're assigned to |
| `admin` | Everything, in every class |

Within a class, an enrollment carries a class role: `student`, `professor` or
`instructor`. Whoever creates a class is enrolled in it as its professor.

## 1. Create a class

Signed in as admin at http://localhost:3001: use the create-class action in the
top navigation (it opens `/admin/new-class`). Fill in Class Name, Description,
Professor Name and Professor Email. The class then appears on the home page and
under Admin → Classes.

(The seed also made `Seed Test Class` with a placeholder text material; it's
fine to ignore.)

## 2. Give the assistant course guidance (optional)

Admin → the class → edit metadata. The class instructions are added to the
assistant's system prompt for that class — tone, what to emphasise, what not to
give away. `docs/prompts.md` explains how the built-in, class and experiment
instructions combine.

## 3. Upload materials

Admin → the class → **Manage Materials**. Upload a lecture or a recitation as a
PDF (PDF is the only accepted type). A material can carry a **student copy**,
an **answer key** (the tutor sees it; students don't) and **references**.

After upload the file goes through the pipeline on the server — parse with
Xberg, chunk, embed — and shows *Processing* until it's ready. The page can be
closed meanwhile. A short PDF takes well under a minute; a long scanned one can
take several (OCR). If it ends in *Processing failed* or never leaves
*Processing*, see [troubleshooting.md](troubleshooting.md#materials-never-finish-processing).

## 4. Chat

Open the class from the home page (http://localhost:3001 → the class) and ask
something only the uploaded material could answer. A grounded answer that
cites the material means parsing, embedding and retrieval all work end to end
— that's the real "setup succeeded" moment.

## 5. See it as a student

The seeded `student@example.com` has no password (it's meant for Google
sign-in). Simplest: create a real test student.

1. Admin → **User Management** → **Add users** → **Create password accounts**:
   enter an email and pick the class. Kiwi generates a password and shows it
   once — pass it on.
2. Sign in as that student in a private/incognito window, so the admin session
   stays put.

Students can also be enrolled from Admin → the class → **Enroll Students**.
Passwords can be reset from User Management. There is no password self-sign-up
— that's by design; only Google sign-up is self-service, when enabled.

## Where to go from here

- **Analytics** — Admin → the class → professor analytics, or Admin → Analytics.
- **Learning experiments** (A/B testing chat settings) —
  `kiwi-ui/docs/experiments.md`.
- **Connecting AI clients over MCP** — `docs/mcp.md`.
- **Embedding your own app in Kiwi** —
  `kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md`.
- **Exploring the API** — Swagger at http://localhost:3000/docs; how to
  authenticate is in `docs/development.md#exploring-the-api`.
- **Accounts, roles, making someone admin** — `docs/administration.md`.
