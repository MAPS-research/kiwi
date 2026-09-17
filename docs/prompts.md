# How prompts work

Every chat turn in Kiwi is answered from a prompt that Kiwi assembles from
several layers: built-in instructions, the mode of the material the student is
working on, optional class-specific instructions, an optional experiment
variant, and the conversation itself. This page explains each layer, who can
change it, and what to keep in mind when you do.

- **Instructors** — read [Class-specific instructions](#class-specific-instructions)
  and [Experiments](#experiments).
- **Administrators and deployers** — also read [Kiwi App prompts](#kiwi-app-prompts)
  and [Settings](#settings).
- **Contributors** — read [Changing the built-in prompts](#changing-the-built-in-prompts).

## The layers at a glance

On each turn, the chat endpoint (`POST /student/chat/v2`) sends the model a
list of messages in this order:

```text
 1. System message (stable)
      a. Kiwi's base instructions         persona, response rules
      b. Tool guidance                    when to search materials, run code, operate the UI
      c. Mode instructions                class materials | recitation | coding | app (+ tutoring style)
      d. ONE of:
           Experiment variant instructions   if the student is in an active experiment
           Class-specific instructions       otherwise, if the class has any
 2. Student profile                       what Kiwi has learned about this student
 3. Conversation so far                   summary + recent turns
 4. Current environment                   page, open document, open app
 5. Retrieved course material             relevant chunks (or the code being edited)
 6. App-provided context                  when the chat is opened from a Kiwi App
 7. Mode reminder                         recitation and guidance modes only
 8. The student's message
```

Layers 1–3 change rarely, so the model provider can cache them; layers 4–8
change on almost every turn and therefore come last. See
[Caching](#caching) for why this order matters.

The model also receives a list of tools (course-material search, code
interpreter, opening materials, navigating the app). Which tools are offered
depends on the class; see [Tools](#tools).

## Built-in instructions

Kiwi's own instructions live in `kiwi/src/student/student.prompts.ts`
(`UNIFIED_SYSTEM_PROMPTS`). They cover:

- **Base instructions** — Kiwi's role, formatting (LaTeX for math), citing
  sources, and guiding rather than handing out answers.
- **Tool guidance** — when to search course materials, run code, and operate
  the app on the student's behalf. The app-operation rules include "never
  submit a form".
- **Environment** — a template filled in with where the student is: the active
  tab, the current class, the open document and page, or the open app.

### Modes

Kiwi picks one mode per turn and adds that mode's instructions:

| Mode | When | Behavior |
|---|---|---|
| Class materials | Default for course documents | Explains concepts using the materials |
| Recitation | The open material's type is `recitation` | **Guidance only**: never gives the answer; leads the student step by step |
| Coding | The student is in the code editor with a coding exercise | Helps with the exercise |
| App | The chat is opened from a Kiwi App | Helps within the app |
| Guidance | Requested by the code editor or by an app's registration | **Strict tutoring**: no full solutions, at most a few lines of code |

The mode is decided in this order:

1. A `recitation` material always wins. An app cannot switch it off.
2. Otherwise, if the chat comes from a Kiwi App, the app's registered tutoring
   style is used (`guidance`), or plain app mode. An app that isn't registered
   can only make the mode stricter, never looser.
3. Otherwise, coding mode in the code editor.
4. Otherwise, class materials.

In recitation and guidance modes, Kiwi repeats a short reminder of the rules
just before the student's message, where it has the most weight.

The material type is chosen when a material is added. Only `recitation`
triggers the guarded mode; any other value — including values left over from
older versions — is treated as class materials. When you upload answer keys for
a recitation, they are stored alongside the recitation, not as a separate
material type.

## Class-specific instructions

Instructors can add instructions for one class in **Admin → (class) → Edit Class →
Class-specific instructions**. They are **appended** after Kiwi's built-in
instructions and mode; they do not replace them.

Good uses:

- The course's subject, level, and programming language
  ("This is an introductory Python course for first-year students").
- Tone and conventions ("Use metric units", "Answer in English and Spanish").
- Course policies ("Point students to office hours for grading questions").

Things to know:

- The built-in rules still apply. In recitation mode, for example, Kiwi still
  withholds answers even if your instructions ask for full solutions; the mode
  reminder that follows your text restates the rule. To change teaching policy
  deliberately, use an [experiment](#experiments).
- The text is part of the cached part of the prompt. Editing it is fine;
  every student's next turn picks up the new version.
- While an experiment is active in the class, a student's variant instructions
  are used **instead of** the class-specific instructions.

Who can edit them: administrators, professors enrolled in the class, and
instructors assigned to the class. Through the API this is
`POST /class/update-metadata` (`systemPrompts.defaultSystemMessage`).

> **Legacy fields.** Class metadata also stores `classMaterialsPrompt` and
> `recitationPrompt`. Only the retired v1 chat endpoint (`POST /student/chat`)
> reads them; the current chat ignores them, and the admin page no longer
> shows them. They are kept unchanged when you save.

## Experiments

An experiment splits a class's students into groups ("variants") and gives
each group different chat settings. Each variant can set:

- **Instructions** — its own teaching instructions.
- **Engine** — `openai` or `qwen`.

Variant instructions are added under a heading that marks them as
**authoritative for teaching behavior**: where they conflict with the built-in
guidance about how much to help, whether to give answers, or tone, the model is
told to follow the variant. They do not change how Kiwi operates the app or uses
tools. This is what makes experiments useful for testing teaching policies —
and it also means a variant *can* loosen the recitation guardrail. Review
variant text with that in mind.

Details:

- Every variant carries instructions. The form pre-fills each one with the
  class's instructions (or, if the class has none, Kiwi's legacy default text),
  and an empty field is filled again. For a "control" group, keep the class's
  own instructions.
- Students without a variant (for example, not on a manual list) get the
  class-specific instructions as usual.
- Staff never join a variant, but administrators and instructors can preview
  any variant from the chat.
- Turning an experiment off returns everyone to the class instructions
  immediately.

See the step-by-step guide in
[`kiwi-ui/docs/experiments.md`](../kiwi-ui/docs/experiments.md).

## Kiwi App prompts

Kiwi Apps (embedded third-party pages) can ask Kiwi's model for help in two
ways:

- **`askAI`** goes through the normal chat above, in app mode, with the app's
  registered tutoring style.
- **`contextualChat`** uses a prompt the app registered in advance.

App prompts work like this:

1. The app declares prompts (`promptId`, name, system prompt, token limit) when
   it registers. New prompts start **inactive**, and changing a prompt's text on
   re-registration makes it inactive again.
2. An administrator reviews and approves each prompt in **Admin → App Registry**.
   Revoking deactivates it.
3. The app can use an approved prompt only if its whitelist entry allows it
   (`llm:prompt:<id>` or `llm:prompt:*` in its maximum scopes).
4. At request time Kiwi sends the approved prompt, then the student's learning
   context marked as data rather than instructions, then the app's message.

The app controls its message and which context sections it asks for. It does not
control the prompt text after approval, which student or class the request is
for, or the model.

Details are in the
[Kiwi App developer guide](../kiwi-app-developer-guide-example/KIWI_APP_DEVELOPER_GUIDE.md).

## MCP prompts

Kiwi's MCP server exposes four prompts (`default-system-prompt`,
`class-materials-prompt`, `recitation-guidance-prompt`,
`complete-assistant-prompt`) for external AI clients. They return Kiwi's
**legacy** default texts (`DEFAULT_SYSTEM_PROMPTS` in `student.prompts.ts`), not
the prompt that Kiwi's own chat assembles, and they don't include a class's
instructions. See [mcp.md](mcp.md).

## Tools

Administrators can turn tools off for a class, or limit them to certain chat
types, in **Admin → (class) → Class MCP & Tools**. Disabled tools are not offered to
the model. The tool guidance text in the system message stays the same either
way.

## Settings

These backend environment variables affect prompts. All are optional.

| Variable | Default | Effect |
|---|---|---|
| `LLM_CHAT_MODEL` / `QWEN_CHAT_MODEL` | — | Model for each engine. Students can pick the engine in chat; an active experiment overrides the choice. |
| `CONTEXT_MAX_RAG_CHARS` | 6000 | Characters of retrieved course material per turn |
| `CONTEXT_MAX_APP_CONTEXT_CHARS` | 8000 | Characters of app-provided context |
| `CONTEXT_MAX_HISTORY_TURNS` | 40 | Past turns replayed from the server's history |
| `CONTEXT_MAX_TURN_CHARS` | 4000 | Characters kept per replayed turn |
| `CONTEXT_MIN_PROTECTED_RECENT_TURNS` | 6 | Recent turns never folded into the summary |
| `CONTEXT_MAX_TOOL_RESULT_CHARS` | 8000 | Characters kept from one tool result |
| `CONTEXT_MAX_EARLIER_TOOL_RESULT_CHARS` | 2000 | Characters kept from earlier tool results in a multi-step turn |
| `CONTEXT_MAX_SELECTED_CODE_CHARS` | 4000 | Selected code in the code editor |
| `CONTEXT_MAX_CODE_CONTEXT_CHARS` | 6000 | Full file in the code editor |
| `CONTEXT_MAX_ERROR_CONTEXT_CHARS` | 2000 | Error output in the code editor |
| `CONTEXT_ASSEMBLER_V2` | on | Set to `false` for the older message order (environment inside the system message, history after retrieved material). Changes order only. |
| `LOG_LEVEL_DEBUG` | off | `true` logs the assembled messages for each turn |

The browser also sends the conversation with each turn; the server keeps at
most 200 of those turns and 4,000 characters per turn. Those limits are fixed
in code.

## Caching

The model provider can reuse the unchanged beginning of a prompt from one turn
to the next, which is faster and cheaper. Kiwi is arranged so that beginning is
as long as possible:

- The system message (layer 1) must be byte-identical from turn to turn. That is
  why the environment — which changes every time the student turns a page — is
  sent later as its own message.
- The student profile changes rarely, so it follows directly.
- Everything that changes per turn comes after the conversation.
- The tool list is kept in a stable order.

For OpenAI, Kiwi also sends a cache key built from the class, chat type, mode,
experiment variant, and tool set, so students in the same situation share a
cache. Class-specific and variant instructions are part of the cached prefix,
so each class and variant has its own.

## Changing the built-in prompts

For contributors:

- Built-in text: `kiwi/src/student/student.prompts.ts`.
- Assembly: `assembleUnifiedContext` and `buildUnifiedSystemPrompt` in
  `kiwi/src/student/student.service.ts`.
- Message blocks and their required order: `kiwi/src/common/context/context-blocks.ts`.
  A new block must be declared there.
- Tests: `kiwi/src/student/unified-prompt.snapshot.spec.ts` snapshots the
  assembled prompt in every mode and checks the block order. After an
  intentional change, review the snapshot diff and update it with
  `npx jest src/student/unified-prompt.snapshot.spec.ts -u` (from `kiwi/`).
- Keep anything that varies per turn out of the system message, or caching stops
  working.
- Preview what a student would receive: administrators and instructors can call
  `POST /student/chat/context-preview`; administrators also see the raw text.

## Who can change what

| What | Who | Where |
|---|---|---|
| Built-in instructions, tool guidance, mode text | Contributors | `student.prompts.ts` |
| Message order, size limits, models | Deployers | Environment variables |
| Class-specific instructions | Admins, the class's professors and assigned instructors | Class → Edit Class |
| Which materials are recitations | Admins, professors, and instructors allowed to manage materials | Class → Manage Materials |
| Experiment variants | Admins, the class's professors and assigned instructors | Class → Experiments |
| Tools offered in a class | Admins | Class → Class MCP & Tools |
| Kiwi App prompt text | App developers (needs approval) | App registration |
| Approving Kiwi App prompts | Admins | App Registry |
| An app's tutoring style | Admins (all classes); class managers (one class, API only) | `tutoringMode` in the app's or class app's `config` |
