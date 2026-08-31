# Experiments — Instructor Guide

Experiments let you run a controlled comparison ("A/B test") inside Kiwi Chat:
students are split into **variant groups**, and each group gets a different chat
configuration (system prompt, model engine, enabled tools). This guide covers
how to open the feature, create an experiment (with the AI assistant or by
hand), what each config field means, and how to compare variants yourself from
the student chat before you launch.

> **Who can use it:** class **instructors** and **admins**. Students never see
> experiment controls — they simply get the configuration of whichever group
> they land in.

---

## 1. Opening the Experiments page

1. Log in and navigate to the **admin area** at `/admin`.
2. Open **Classes** in the admin sidebar and click the class you want.
3. In the class sidebar, click **Experiments** (flask icon).
   - Direct URL: `/admin/class/<classId>/experiments`

The **Learning Experiments** list shows every experiment in the class with its
status:

| Status | Meaning |
| --- | --- |
| **Draft** | Being designed. Not assigned to any student yet. |
| **Active** | Live. Students are being assigned to variants. Only **one** experiment can be active per class at a time. |
| **Completed** | Turned off. No longer assigns students, but can be re-activated. |

Each row has **Edit**, plus one status-dependent action: **Activate** on a draft,
**Turn off** on an active experiment, **Re-activate** on a completed one. Click
**New Experiment** to create one, or click an experiment to open its **detail
page** — which shows the variants, the live per-variant assignment counts, the
same actions, and **Export JSON**.

---

## 2. Creating an experiment

Click **New Experiment** (or **Create your first experiment**). Both the AI and
manual paths open the same **New Experiment form**. **Nothing is saved until you
click Approve / Submit** — you can always review and adjust first.

### Option A — Draft with the AI assistant

1. Open the **AI design assistant** and describe what you want in plain English,
   e.g.:
   > "Compare two groups: one with a Socratic tutor that only gives hints, the
   > other a direct-answer tutor. Split students 50/50."
2. The assistant drafts a full config and **pre-fills the form** for you. It can
   also look up the class's enrolled students when you want a manual split.
3. The draft becomes the baseline: any field **you** change afterwards is
   **marked red** until you submit, so your edits to the AI's proposal stand out.
4. Edit anything you like, then **Approve** to create the draft.

### Option B — Create manually

Fill the form fields directly (see the field reference below), then **Submit**.
This is best when you already know exactly what each group should get.

---

## 3. Config field reference

An experiment is one JSON **Config**. The schema below is the single source of
truth used by both the form and validation.

### Top level

| Field | Required | Rules | What it does |
| --- | --- | --- | --- |
| `name` | ✅ | non-empty | Display name of the experiment. |
| `description` | — | optional | Free-text note about the experiment's purpose. |
| `variants` | ✅ | **at least 2** | The groups being compared (see below). |
| `assignment` | ✅ | see below | How students are split across variants. |

### Group Assignment — how students are split into groups

The **Group Assignment** section (the shuffle icon) is where you decide which
students land in which group. Pick one of two methods with the radio buttons:

| `assignment` field | Values | What it does |
| --- | --- | --- |
| `strategy` | `deterministic_hash` (Seeded split) or `manual` (Manual lists) | How students are placed into groups. |
| `seed` | any text | Required for `deterministic_hash`; ignored for `manual`. |
| `unit` | `user` (default) or `session` | What gets assigned — the student, or each chat session. |

> A legacy `random` strategy exists in older saved configs. The form no longer
> offers it: opening such an experiment converts it to a seeded split and tells
> you so.

#### Seeded split (recommended)

> *"Same seed always gives the same roster split."*

- Enter a **Seed** — any text (e.g. `2026-fall-round1`). It is **required**.
- The system automatically places **every enrolled student** into a group by
  hashing them with the seed, weighted by each group's **allocation** (e.g.
  50 / 50). You don't list anyone by hand.
- **Same seed → the exact same split, every time** (that's what "reproducible"
  means). *Keep the seed unchanged* to preserve the split; *change it* to
  reshuffle the whole class.
- The **Student groups** preview below shows exactly who lands in each group and
  how many. Click **Recompute** after changing the seed, allocations, or roster
  to refresh it. This preview **matches what students actually get** — it is
  computed the same way the live system assigns them.
- A student who **enrolls later** is placed automatically by the same rule, and
  assignment is **sticky** — a given student always ends up in the same group.
- **Use it when:** you want an unbiased, reproducible split of the whole class.

#### Manual lists

> *"Paste student emails for each group."*

- Type or paste the **student emails** into each group's roster (there's also a
  one-click random fill to split the roster for you). Emails are checked against
  the class's enrolled students.
- **Only the students you list get that group** — nobody else is included, and
  students who aren't on any list stay out of the experiment.
- **Use it when:** you need specific people in specific groups (e.g. pilot a
  config with a few volunteers).

### Adjusting the split after you've set it up

- **Seeded split**
  - **Change group sizes** → edit each group's **allocation** (must still add up
    to 100%) and click **Recompute**.
  - **Reshuffle everyone** → change the **Seed** and **Recompute**.
  - **Keep it stable** → leave the seed as-is; new enrollees are auto-placed by
    the same rule without disturbing anyone already in a group.
- **Manual lists** → edit the rosters: add or remove emails per group at any
  time.
- **After the experiment is Active,** assignment is **sticky**: students already
  placed keep their group even if you later change the seed. Seed/allocation
  edits then only affect the preview and students not yet assigned. For a
  genuinely fresh split, set the seed **before** activating, or create a new
  experiment.

### Variants — the groups being compared

Each entry in `variants` describes one group:

| Field | Required | Rules | What it does |
| --- | --- | --- | --- |
| `key` | ✅ | lowercase `a–z`, `0–9`, `_` only; **unique** within the experiment | Stable machine id for the group (e.g. `control`, `treatment`). |
| `label` | ✅ | non-empty | Human-friendly group name shown in the UI (e.g. "Socratic tutor"). |
| `allocation` | ✅ (auto strategies) | number `0`–`1`; **all allocations must sum to 1** | Share of students in this group (e.g. `0.5` = 50%). Ignored for `manual`. |
| `members` | manual only | list of student emails | Students explicitly assigned to this group under `manual`. Resolved to enrolled students when you activate. |
| `config` | ✅ | see below | The chat configuration this group receives. |

### Variant `config` — what each group's chat gets

| Field | Required | Rules | What it does |
| --- | --- | --- | --- |
| `engine` | ✅ | `openai` or `qwen` | Which model engine powers the chat for this group. |
| `systemPrompts.defaultSystemMessage` | — | free text | Overrides the class's default system prompt for this group. **This is the field that actually changes the assistant's behavior** — put your per-group instructions here. |
| `toolsEnabled.rag` | — | boolean | Enable/disable retrieval over class materials for this group. |
| `toolsEnabled.codeInterpreter` | — | boolean | Enable/disable the code interpreter for this group. |

> **Note:** the form only exposes `engine` and `defaultSystemMessage` per variant.
> `toolsEnabled` has no form control — set it by pasting or importing config JSON.
> A blank `defaultSystemMessage` is pre-filled with the class default so you always
> see the effective baseline text. The legacy `classMaterialsPrompt` and
> `recitationPrompt` fields are carried through untouched but are not used by chat.

> **Tip:** the most common experiment changes **one thing** between variants —
> usually `systemPrompts.defaultSystemMessage` — and keeps everything else
> identical, so the difference you measure is attributable to that one change.

### Validation rules (enforced on save)

- `name` must be non-empty.
- At least **2 variants**.
- Variant `key`s must be **unique** and lowercase alphanumeric/underscore.
- For a seeded split (`deterministic_hash`), variant `allocation`s must **sum to
  1** and a **`seed` is required**.
- For `manual`, every email you list must belong to an enrolled student.

### Example config

```json
{
  "name": "Hints vs. direct answers",
  "description": "Does a hint-only tutor improve retention?",
  "assignment": { "strategy": "deterministic_hash", "seed": "2026-fall-round1", "unit": "user" },
  "variants": [
    {
      "key": "control",
      "label": "Direct answers",
      "allocation": 0.5,
      "config": {
        "engine": "openai",
        "systemPrompts": { "defaultSystemMessage": "You are a helpful tutor. Answer questions directly and completely." },
        "toolsEnabled": { "rag": true, "codeInterpreter": true }
      }
    },
    {
      "key": "treatment",
      "label": "Socratic hints",
      "allocation": 0.5,
      "config": {
        "engine": "openai",
        "systemPrompts": { "defaultSystemMessage": "You are a Socratic tutor. Never give the final answer; guide the student with hints and questions." },
        "toolsEnabled": { "rag": true, "codeInterpreter": true }
      }
    }
  ]
}
```

---

## 4. Activating an experiment

1. On the Experiments list, click **Activate** on the draft you want to run.
2. The experiment becomes **Active** and students start being assigned to
   variants (for `manual`, the listed emails are resolved to enrolled students).
3. Only **one** experiment can be active per class at a time.
4. When you're done, click **Turn off** to stop new assignments. A turned-off
   experiment can be started again later with **Re-activate**.

---

## 5. Comparison testing from the student chat (preview mode)

Before (or after) launching, you can experience each variant yourself without
assigning any real students. This lives in **Kiwi Chat** inside the class.

1. Open a class as an instructor/admin and open **Kiwi Chat** (the chat button).
2. Turn on the **EXPERIMENT** toggle at the top of the chat panel. *(Only
   instructors/admins see this toggle.)*
3. Pick the **experiment** from the dropdown, then pick a **variant** from the
   group buttons.
4. Send a message. The chat runs with **that variant's configuration**
   (its engine, system prompt, and tools) — so the reply reflects exactly what a
   student in that group would get.

### Side-by-side compare

With an experiment selected that has **at least 2 variants**, turn on **Compare
two variants side by side**. Two dropdowns appear — **Variant A** and **Variant
B** — and the transcript splits into two columns. Each message you send is
answered by both variants at once, so you read the difference directly instead of
re-asking. (Picking the same variant in both columns is allowed; the chat warns
you that both columns will match.)

While the experiment toggle is on, the manual model picker is hidden — the engine
comes from the variant's config.

> Preview mode is for **you** to sanity-check the variants. It does not assign
> or affect real students — that only happens once the experiment is **Active**.

---

## 6. Sharing / reusing a config

Exported JSON strips the class binding and the per-student member lists but keeps
the assignment seed, so a seeded split stays reproducible when re-imported into
another class.

- **Export** — the experiment detail page has **Export JSON**; the New/Edit
  Experiment form has the same button in its **Import / export config JSON**
  section. Both download a `<experiment name>.json` file.
- **Import** — in that same form section, either paste JSON into the text box and
  click **Apply JSON**, or click **Import file** and pick a `.json` file. Either
  way the form is pre-filled and flagged for review before you submit.

---

## Quick checklist

- [ ] Open **Experiments** for the class.
- [ ] Create via **AI assistant** or **manually**.
- [ ] Give it a `name`, **≥2 variants** with unique `key`s.
- [ ] Change **one thing** per variant (usually `defaultSystemMessage`).
- [ ] Choose **Seeded split** (set a seed; allocations sum to 100%) or
      **Manual lists** (paste emails per group).
- [ ] **Preview** each variant in Kiwi Chat's EXPERIMENT mode — or turn on
      **Compare two variants side by side**.
- [ ] **Activate** when ready; **Turn off** when done.
