# Step 8 — The tour: class → PDF → chat

This takes the person from "it's installed" to "I've seen it work". Keep the
same rhythm as the setup: say what's next and why, hand over with a "your
turn" message, wait, check, confirm. Most of this happens in *their* browser,
so most steps are theirs. If you have browser tools and they'd rather watch,
offer to drive — and read the page before clicking, since labels can drift.

Short version of who can do what, in case they ask:

| Role | Can |
|---|---|
| Student (`user`) | Use the classes they're enrolled in |
| Instructor | Open the admin area and manage the classes they're assigned to |
| Administrator (`admin`) | Everything, in every class |

Whoever creates a class is automatically enrolled in it as its professor.

## 8a — Create a class

*Say first:* "Tour 1 of 4 — Create a class. In Kiwi, everything — materials,
students, the assistant's instructions — belongs to a class. Let's make a
test one."

```
🙋 Your turn — create a class

What to do:
1. In Kiwi (http://localhost:3001), use the button for creating a class in
   the top bar (it opens /admin/new-class).
2. Fill in Class Name (e.g. "Test Class"), a short Description, and your
   name and email as professor. Save.

When you're done: reply "class created".
```

*Check:* they can see the class on the home page or under Admin → Classes.
(A "Seed Test Class" also exists from setup; it can be ignored.)

*Say after:* "✅ Your class exists. Next: give it some course material."

## 8b — Upload a PDF

*Say first:* "Tour 2 of 4 — Upload material. When you upload a PDF, Kiwi
reads it, splits it into passages and indexes them, so the assistant can
quote the right part when a student asks. This takes from a few seconds to a
few minutes depending on the PDF."

```
🙋 Your turn — upload a PDF

Why: the assistant answers from your course materials, so it needs at least one.

What to do:
1. Admin → your class → Manage Materials.
2. Upload a PDF as a lecture — lecture slides or notes work best. Only PDF
   files are accepted. A short one (under 20 pages) is quickest for a test.
3. It shows "Processing" — you can leave the page meanwhile.

When you're done: reply "uploaded".
```

*Check while they wait:* watch `bash .agents/skills/kiwi-setup/scripts/dev-servers.sh logs backend`
for the document's processing, or ask them to refresh the materials page. A
short text PDF is usually ready within a minute; a long scanned one (needs
OCR) can take several. If it ends in "Processing failed" or doesn't move for
10 minutes → [troubleshooting.md → Materials never finish processing](troubleshooting.md#materials-never-finish-processing).

*Say after:* "✅ Kiwi has read your PDF and indexed it. Now the fun part."

## 8c — Ask the assistant

*Say first:* "Tour 3 of 4 — Chat. This is what students see. If the answer
uses your PDF, every part of the setup works end to end."

```
🙋 Your turn — ask a question

What to do:
1. Go to the home page (http://localhost:3001) and open your class.
2. Ask something only your PDF could answer — e.g. about a specific
   definition, example or slide.

When you're done: tell me whether the answer used your material.
```

*If the answer ignores the material:* → [troubleshooting.md → Chat](troubleshooting.md#chat).
*If chat shows an error:* read the end of the backend log and translate it.

*Say after:* "✅ The assistant answered from your material — Kiwi works end
to end."

## 8d — See it as a student (optional)

*Say first:* "Tour 4 of 4 — The student view. Administrators see extra menus;
it's worth seeing what a student sees. We'll create a test student account."

```
🙋 Your turn — create a test student

What to do:
1. Admin → User Management → Add users → Create password accounts.
2. Enter an email (any made-up one is fine locally) and pick your class.
3. Kiwi shows a password once — copy it.
4. Open a private/incognito browser window, go to http://localhost:3001 and
   sign in as that student.

When you're done: reply "done".
```

Notes if they ask: the seeded `student@example.com` has no password (it's for
Google sign-in); passwords can be reset in User Management; students can also
be enrolled from Admin → the class → Enroll Students; there is no
self-sign-up with a password, by design.

*Say after:* "✅ That's the tour." Then give the wrap-up message from SKILL.md.

## If they want to go further

- Course-specific guidance for the assistant: Admin → the class → edit the
  class; see `docs/prompts.md`.
- Analytics: Admin → Analytics, or the class's professor analytics.
- A/B tests of chat settings: `kiwi-ui/docs/experiments.md`.
- Connect other AI tools over MCP: `docs/mcp.md`.
- Build an app that runs inside Kiwi:
  `kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md`.
- The API: http://localhost:3000/docs; signing in is explained in
  `docs/development.md#exploring-the-api`.
- Accounts, roles, more administrators: `docs/administration.md`.
