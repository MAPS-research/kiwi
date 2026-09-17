# Experiments: instructor guide

An experiment is an A/B test of Kiwi Chat in one class. Kiwi splits the class's
students into variant groups, and each group chats with its own model engine and
system prompt. This guide shows how to create an experiment, assign students,
preview the variants yourself, compare them, and turn the experiment off.

## Who can use experiments

- **Managing experiments** (create, edit, activate, turn off, export) is open to
  admins, professors enrolled in the class, and instructors assigned to the
  class. The Experiments pages are in the admin area, which the app shows only
  to admins and accounts with the instructor role.
- **Previewing variants in chat** requires the admin or instructor system role.
- **Students** never see experiment controls. They get the configuration of the
  group they are in.
- **Admins and instructors** are never assigned to a live variant. They use
  preview mode instead.

## Open the Experiments page

1. Go to `/admin`. It opens the class list (**Classes**, or **My Classes** for
   instructors).
2. Click the class.
3. In the class navigation, click **Experiments** (flask icon). The address is
   `/admin/class/<classId>/experiments`.

The **Learning Experiments** page lists the class's experiments:

| Status | Meaning |
| --- | --- |
| **Draft** | Saved but not running. No student is assigned. |
| **Active** | Running. Assigned students chat with their variant's configuration. A class can have only one active experiment. |
| **Completed** | Turned off. Every student is back on the class defaults. It can be re-activated. |

Each row has **Edit** and one action that depends on the status: **Activate**
(draft), **Turn off** (active), or **Re-activate** (completed). Click a row to
open the experiment's detail page.

## Create an experiment

Click **New Experiment** (or **Create your first experiment** when the list is
empty). The form has four sections: **Basics**, **Group Assignment**,
**Variants**, and **Import / export config JSON**.

Nothing is saved until you click the submit button at the bottom of the form:

- **Submit (draft)** saves a new experiment as a draft.
- Check **Activate immediately** to save and start it at once; the button then
  reads **Submit & activate**.
- When editing, the button reads **Save** (or **Save & activate** with
  **Activate after saving** checked). The checkbox is hidden when the
  experiment is already active.

Saving opens the experiment's detail page. **Cancel** returns to the list
without saving.

### Draft with the assistant

The **Experiment Assistant** is a floating button with a sparkle icon on the
list, detail, and form pages.

1. Click it and describe the experiment, for example: "Two groups, 50/50. One
   gives direct answers; the other only gives hints."
2. The assistant asks follow-up questions if it needs to. It knows the class's
   current instructions and the enrolled students' email addresses, so it can
   write prompts and build manual lists.
3. When the design is complete, the assistant opens the **New Experiment** form
   filled with its draft. Fields you change afterwards are marked red until you
   submit, so you can see what differs from the draft.
4. Review the form and submit it.

The assistant uses the chat model configured on the server. If none is
configured, it replies that it is unavailable.

### Fill in the form yourself

Enter a name and optional description under **Basics**, choose how to assign
students (next section), and set up each variant (see
[Variant settings](#variant-settings)).

## Assign students to groups

Under **Group Assignment**, choose one of two methods.

### Seeded split

> "Random split by your allocation %, exact counts. Same seed reproduces it;
> Reshuffle re-rolls."

- Enter a **Seed**: any text, such as `2026-fall-round1`. It is required.
- Kiwi shuffles all enrolled students using the seed, then splits them by each
  variant's **Allocation** (for example `0.5` and `0.5`). The allocations must
  add up to 1; the Σ chip next to **Variants** turns green when they do.
- **Student groups** shows who lands in each group. It updates automatically
  when you change the seed or allocations.
- **Reshuffle** replaces the seed with a new random one, which gives a new
  split. The new seed is saved with the experiment, so that split can be
  reproduced.

On activation, Kiwi assigns every enrolled student exactly as the preview shows
for the roster at that moment. Keep in mind:

- **Late enrollees.** A student who enrolls after activation is placed the first
  time they chat, using a hash of their own ID and the seed. Over many students
  this is roughly proportional to the allocations, but it is not counted into
  the exact split.
- **The preview can drift from reality.** Assignments are fixed once made. After
  the roster, allocations, or seed change, the preview shows the split Kiwi
  *would* make now, which can differ from the assignments that already exist.

### Manual lists

> "Paste student emails for each group"

- Each variant has a **Members** box. Type or paste student email addresses,
  separated by commas or new lines.
- **Random assign** fills the boxes by shuffling the whole roster across the
  groups (by allocation if the allocations add up to 1, otherwise evenly).
- Addresses that aren't valid are flagged "Invalid email format (ignored)".
  Addresses of people not enrolled as students are flagged "Not enrolled in this
  class (ignored)". Neither blocks saving; these addresses are left out of the
  groups.
- **Student groups** shows the lists. Click **Recompute** to refresh it.
- Only listed students take part. Everyone else keeps the class defaults.

Manual assignments are written when you activate the experiment, not when you
save it.

### Change groups after activation

Once a student is assigned, that assignment is never overwritten.

- **Prompt and engine changes** you save on an active experiment apply to the
  next chat of every assigned student.
- **Seed or allocation changes** affect only students who are not yet assigned.
- **Manual list changes** are not applied to a running experiment. To apply
  them, click **Turn off** and then **Re-activate**: newly listed students are
  assigned, but students you moved to another list or removed keep their
  original group.
- **Removing or renaming a variant** sends students assigned to it to the first
  variant.

For a completely fresh split, create a new experiment.

## Variant settings

Each card under **Variants** is one group:

- **Key**: an identifier such as `control` or `treatment`. Lowercase letters,
  digits, and underscores only; unique within the experiment.
- **Label**: the name shown in the UI.
- **Allocation**: the group's share of students, from 0 to 1. Disabled for
  manual lists ("set by roster").
- **Engine**: `openai` or `qwen`.
- **System prompt**: the instructions this group's chat follows.

Every experiment needs at least two variants. **Add variant** adds one; the
delete button removes one (not below two).

### How the variant prompt is used

Kiwi always starts from its built-in instructions. A class can add its own
instructions (Class Edit → **Instructions**), which are appended after the
built-in ones. For a student in an active experiment, the variant's system
prompt **replaces** the class's instructions: it is appended in their place,
under a heading that tells the model to follow it over earlier guidance on
teaching style and how much to help. See
[How prompts work](../../docs/prompts.md#experiments).

- When the form loads, an empty prompt box is filled with the class's
  instructions, or with a generic Kiwi default message if the class has none.
  The chip reads **Using default** until you change the text, and **Reset**
  restores it.
- Because the prompt replaces the class instructions, write each variant's
  prompt as the complete set of class-level instructions that group should get.
- Change one thing between variants (usually the system prompt) and keep the
  rest identical, so any difference you see comes from that change.

### Choosing the qwen engine

Assigning a student to a `qwen` variant turns on the Qwen model feature flag
(`QwenModel`) for that student, with no expiry. Turning the experiment off does not remove that access.
The server must also be configured for Qwen (`QWEN_API_KEY` and related
settings), or that group's chats won't work.

## Config JSON reference

The form edits a JSON config. You can also paste or import one directly (see
[Share or reuse a config](#share-or-reuse-a-config)).

```json
{
  "schemaVersion": "1.0",
  "name": "Hints vs. direct answers",
  "description": "Does a hint-only tutor improve retention?",
  "classId": null,
  "assignment": { "strategy": "deterministic_hash", "seed": "2026-fall-round1", "unit": "user" },
  "variants": [
    {
      "key": "control",
      "label": "Direct answers",
      "allocation": 0.5,
      "config": {
        "engine": "openai",
        "systemPrompts": { "defaultSystemMessage": "Answer questions directly and completely." }
      }
    },
    {
      "key": "treatment",
      "label": "Socratic hints",
      "allocation": 0.5,
      "config": {
        "engine": "openai",
        "systemPrompts": { "defaultSystemMessage": "Never give the final answer. Guide the student with hints and questions." }
      }
    }
  ]
}
```

### Top level

| Field | Required | Notes |
| --- | --- | --- |
| `schemaVersion` | no | Always `"1.0"`. |
| `name` | yes | Non-empty. |
| `description` | no | Free text. |
| `classId` | no | Set by Kiwi to the class the experiment is saved in. Exports set it to `null`. |
| `assignment` | yes | See below. |
| `variants` | yes | At least two. |

### `assignment`

| Field | Values | Notes |
| --- | --- | --- |
| `strategy` | `deterministic_hash` (seeded split) or `manual` (manual lists) | Configs using the old `random` strategy are converted to a seeded split when loaded into the form. |
| `seed` | any text | Required for `deterministic_hash`. Not used by `manual`. |
| `unit` | `user` | Students are assigned individually. No other unit is supported. |

### Each variant

| Field | Required | Notes |
| --- | --- | --- |
| `key` | yes | Matches `^[a-z0-9_]+$`; unique. |
| `label` | yes | Non-empty. |
| `allocation` | yes | A number from 0 to 1, for every variant and every strategy. For `deterministic_hash` the allocations must add up to 1; for `manual` the sum is not checked. |
| `members` | no | Student email addresses, used only by `manual`. |
| `config.engine` | yes | `openai` or `qwen`. |
| `config.systemPrompts.defaultSystemMessage` | no | The variant's system prompt. Empty means the class's own instructions apply. |

The only settings that change a group's chat are `config.engine` and
`config.systemPrompts.defaultSystemMessage`. The config also accepts
`config.toolsEnabled` (`rag`, `codeInterpreter`) and the prompt fields
`classMaterialsPrompt` and `recitationPrompt`, but they have no effect.

Kiwi validates the config when you save. It rejects unknown keys at every level,
duplicate variant keys, a missing seed for a seeded split, and seeded-split
allocations that don't add up to 1.

## Activate an experiment

Click **Activate** on a draft, either on the list or on its detail page, or
check **Activate immediately** when you submit the form. Activation fails if
the class already has an active experiment; turn that one off first.

On activation:

- **Seeded split**: every enrolled student is assigned as the preview shows.
- **Manual lists**: each listed, enrolled student is assigned to their group.
  Other addresses are skipped.

## Preview and compare variants in chat

You can try any experiment in the class, including drafts, without assigning
anyone.

1. Open the class and open Kiwi Chat.
2. Turn on the **Experiment** toggle at the top of the chat panel.
3. Choose an experiment, then a variant.
4. Send a message. The reply uses that variant's engine and system prompt.

While the toggle is on, the chat's model picker is hidden; the variant decides
the engine.

To compare two variants, turn on **Compare two variants side by side** (shown
for experiments with at least two variants). Choose **Variant A** and **Variant
B**. The transcript splits into two columns, and each message you send is
answered by both. If you pick the same variant twice, the chat notes that both
columns will match.

Preview mode never assigns students or changes what they see.

## Read the results

The detail page shows the assignment method and seed, the actions (**Edit**,
**Activate**/**Turn off**/**Re-activate**, **Export JSON**), and a card per
variant with:

- **students**: for seeded splits and manual lists, the number of students the
  group would contain for the *current* roster and config, not a count of
  actual assignments. **Students in this group** lists them. See
  [Seeded split](#seeded-split) for why this can differ from reality.
- **chats**: the number of chat turns in this class by students assigned to
  the variant. It includes turns from before the experiment started.
- **System prompt**: the variant's prompt, marked **Customized** when it
  differs from the class baseline.

## Turn off an experiment

Click **Turn off** on the list or the detail page. The experiment becomes
**Completed**, and every student immediately goes back to the class defaults on
their next message. Assignments are kept: **Re-activate** restores them, and
assigns students who don't have one yet.

## Share or reuse a config

- **Export**: **Export JSON** on the detail page, or in the form's **Import /
  export config JSON** section, downloads `<experiment name>.json`. The export
  sets `classId` to `null` and removes member lists, but keeps the seed.
- **Import**: in the same form section, paste JSON and click **Apply JSON**, or
  click **Import file** and choose a `.json` file. The form is filled in and an
  information message asks you to review it. Imported values are not marked
  red. Nothing is saved until you submit.

## Checklist

- Open **Experiments** for the class.
- Create the experiment with the assistant or by hand.
- Give it a name and at least two variants with unique keys.
- Change one thing between variants, usually the system prompt, and write each
  prompt as the group's complete class instructions.
- Choose **Seeded split** (seed set, allocations add up to 1) or **Manual
  lists** (emails per group).
- Preview each variant in Kiwi Chat, or compare two side by side.
- Activate when ready; turn off when done.
