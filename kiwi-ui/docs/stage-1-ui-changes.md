# Stage 1 UI changes

This note sums up the Stage 1 UI work on the branch `Nagi-ui`: what it
changes, how it was checked, and the problems found along the way that it
leaves open, one of them in the backend. The work starts from `development`
at `1703040` and changes nothing under `kiwi/`.

The design itself is in [DESIGN.md](../DESIGN.md) and
[JOURNEY.md](../JOURNEY.md); this note does not repeat it.

## What is on the branch

| Part | Commits | Where |
|---|---|---|
| Design documents: brief, page specs, tokens, voice and copy, the Kiwi companion, chart tokens, mocks and the clickable preview | 22: `ef65c1d` … `588b654`, and `3f18307` (merged in `a9a7694`) | `.design-foundations/`, `kiwi-ui/DESIGN.md`, `kiwi-ui/JOURNEY.md` |
| The UI built on those documents | 36: `c9cc9d2` … `c2b9c75` | `kiwi-ui/` |

The design documents come from the design branch
`feature/kiwi-ui-stage-1-design`.

## What changed in the UI

### Theme and shared parts

- The MUI theme is built from the design tokens, with Source Sans 3 and CSS
  variables for light and dark (`src/Theme.ts`, `src/theme/`). Ace, Prism and
  the console load the generated code themes.
- A Display menu in the top bar sets the colour mode and Kiwi's animation. It
  shows when `VITE_ENABLE_DARK_MODE` or `VITE_ENABLE_MASCOT_MOTION` is on.
- New shared parts: an empty-state frame, a status chip and the Kiwi logo.
  The old `Loader` component is removed.
- The admin pages, shared parts, class analytics, experiment pages and charts
  use the tokens. Email HTML is not changed. Storybook reads the real theme.
- Theme fixes found while checking against the preview:
  - borderless buttons show a focus ring (`theme.focusVisible`), because
    ButtonBase's `outline: 0` hid the global one;
  - pressed and current markers are flat bars, not inset shadows;
  - small switches have a single thumb size;
  - chips, tab gaps and toasts match the preview;
  - bold text is held to 600;
  - Collapse opens without animating its height;
  - sticky table heads have a background;
  - `aria-disabled` buttons show the not-allowed pointer;
  - checkbox and radio labels use the label type at 400, and switch labels
    at 600.
- In dark mode the code themes, the status line's drawings and the Kiwi Apps
  bridge now follow the colour mode on screen (`src/theme/useColorMode.ts`).
  With the CSS-variables theme, `theme.palette.mode` always reads `light`, so
  it cannot detect dark mode.

### Chat

- Each answer has a status line with the Kiwi companion (companion v2 in
  DESIGN.md):
  - while waiting, Kiwi walks and the wait word changes from one answer to
    the next;
  - while Kiwi searches, a step word shows, such as
    "Pecking through class materials…";
  - while the text streams, the line reads "Jotting it down…";
  - when the answer completes, Kiwi flies off, the line fades and screen
    readers hear "Kiwi finished answering.".
- Message rows have no avatars. Each answer has a toolbar (feedback, copy).
  The toolbar takes one Tab stop, and the arrow keys move between its
  buttons.
- Send and Stop sit inside the composer. Students can stop an answer, and the
  text so far stays.
- A round launcher opens the "Kiwi chat" panel, which can be a modal, a side
  panel, docked or fullscreen. At the side, its edge can be resized with the
  mouse or from the keyboard (arrow keys, Home, End).
- Focus goes into the composer when the chat opens, and back to it when an
  answer finishes unless the student has moved elsewhere. Close chat returns
  focus to the launcher.
- Notices such as "Connected to Kiwi", and errors, show inside the panel
  above the composer. They no longer close when you click elsewhere.
- In compare mode only one status line moves at a time.
- Paragraphs and lists in an answer are 12 px apart. Code in a code block no
  longer gets the inline-code tint.
- The page no longer animates its width when the chat docks beside it.

### Pages

- Sign-in, the class list and the top bar. The top bar is 52 px including its
  hairline; on the right are Display, the view switch and Sign out.
- The materials page and the student class bar.
- The code page.
- The admin shell, Enroll students and Edit class. The roster now shows an
  `instructor` enrollment as Instructor; before, it showed Student.

## How it was checked

- Each UI commit type-checks on its own (`npx tsc --noEmit` in a clean
  checkout). At `c2b9c75`:
  - all 877 tests in 95 files pass;
  - `npm run build` succeeds;
  - `npm run tokens:check` finds the token copies in sync.
- The six Stage 1 screens were measured against the v2 preview in a browser,
  with a local backend, in light, dark and at 390 px. The screens are
  sign-in, the class list, chat, the code page, Enroll students and Edit
  class. The checks covered sizes, positions, type, colours, borders, radii
  and shadows.
- A streamed answer was followed end to end, signed in as a student. That
  covered the wait, step and streaming words, the flight and fade, the
  announcement, focus, Stop, feedback and copy, and the dark-mode drawings and
  code colours.

## Where it differs from the preview

- The sign-in wordmark uses `--accent-text`, as DESIGN.md says. The preview
  still uses the older `--accent-solid`.
- The status line follows the committed companion v2 text:
  - in compare mode, the lane whose first token arrived last is the one that
    moves, and a tie goes to lane A;
  - a tool pill reads "Using {name}…".
- The composer is 58 px high, not 56, because the preview cuts 2 px off its
  second line.
- Enroll students keeps the error toast for an empty input (A-16) rather
  than a disabled button (DS.35), as decided.
- Collapse and Accordion open at once. DESIGN.md allows a
  `grid-template-rows` animation, which is not built yet.
- Smaller gaps, noted when each page was built:
  - code page:
    - the editor draws its own focus frame;
    - the resize grip sits outside the column;
    - the editor has no minimum height;
    - the upload row wraps;
  - sign-in:
    - `brandAreaWidth` no longer does anything;
    - the class switcher is still a `listbox`;
    - the required asterisk is hidden;
    - card covers have `alt=""`;
    - there is no loading skeleton;
  - materials: the drawer docks only from 1200 px wide, and zoom stops at
    its limit without saying so;
  - admin:
    - there is no rows-per-page select;
    - client-side email checks (A-16.18, A-16.55) are not added, because
      they would change behaviour;
  - experiments: the status chips show draft as info, active as success and
    completed as neutral.

## Backend issue found (not changed)

**An enrollment with the role `instructor` does not count as an
enrollment.**

- `classIdsByUserId` (`kiwi/src/common/database/user.service.ts:34`) returns
  only the classes where the user's enrollment role is `student`, `professor`
  or `admin`.
- A class created in the app enrols its creator as `professor`
  (`kiwi/src/class/class.service.ts:58`), so those instructors are not
  affected. The minimal seed enrols its instructor as `instructor`
  (`kiwi/prisma/seed.ts:288`), and the demo data we tested with did the
  same.
- What follows from it:
  - Sending a chat message in the class fails with "User not enrolled in the
    given classId", because saving the message checks the list
    (`kiwi/src/interaction/interaction.service.ts:41`). We hit this error
    locally while chatting as an admin; the demo student could chat.
  - From the code (not tried): a non-admin whose only enrollments are
    `instructor` gets no session at sign-in, because `createUserSession`
    (`kiwi/src/auth/auth.service.ts:65`) throws "User not enrolled in any
    class".
  - The same list decides which class interactions a user may read
    (`kiwi/src/interaction/interaction.controller.ts:126` and `:203`).
- To reproduce it, enrol an admin in a class with the role `instructor` and
  send a chat message there.
- Either fix needs a backend test: count `instructor` in `classIdsByUserId`,
  or seed `professor` instead. That is left for a separate backend change.

## Older bugs found (not changed)

These were already in `development`.

- Retry leaves the failed row in place and shows the question twice.
  - `handleSendRetryMessage` (`kiwi-ui/src/components/Chat/ChatCore.tsx:547`)
    removes both rows, then calls `handleSendMessage`.
  - `handleSendMessage` rebuilds the list from the same stale `chatMessages`
    (`ChatCore.tsx:1110`), which undoes the removal.
- On the code page:
  - clicking a file tab's close icon also selects that tab
    (`kiwi-ui/src/components/CodeInterpreter/FileTabs.tsx:198`);
  - an image tab is blank the first time it opens (`IDE.tsx`);
  - a file named "Code" clashes with the code tab, whose label is "Code"
    (`kiwi-ui/src/components/CodeInterpreter/codeTab.ts:7`).
- In the student PDF viewer
  (`kiwi-ui/src/components/PDFViewer/PDFViewerForStudent.tsx`):
  - comment pins have no accessible name and cannot be reached from the
    keyboard;
  - clicking outside an open comment does not close it, because the comment
    backdrop (line 488) sits in a layer with `pointer-events: none`
    (line 863);
  - once the viewer's height is known, pages are sized by height alone
    (line 840), so a landscape slide can be wider than a narrow viewer;
    the comment at line 303 says the width caps the page, but no width is
    passed once the height is known.
- The step label pattern `/rag|search/i`
  (`kiwi-ui/src/components/Chat/AgentStepChain.tsx:126`) labels any MCP tool
  with "search" in its name as "Searching materials".
- At 390 px the admin top bar leaves the class switch about 75 px, so class
  names are cut to a letter or two. The preview does the same.

## Still to do

- Port the design checks (`check-copy`, `check-tokens`) into `kiwi-ui`.
  `check-copy` still checks the source as it was before the redesign, so 79
  of its 111 checks pass today.
- Publish tokens 2.0.0, since `public/kiwi-design-tokens.css` still has the
  old purple and pink.
- Update Storybook's `catalog.json` and `Welcome.mdx`, then delete
  `material-design-2014.json`.
- Recolour the email templates, front end and back end together.
- Add the composer peek animation, and offline detection that ends the status
  line.
- Make snackbars slide 8 px instead of using MUI's default grow.
- Merge `InfoToast` and `AdminToast`, and move the older snackbars onto the
  merged one.
- Apply density to popovers and menus.
- Finish the remaining chart items (Phase 6).
- Remove the `react-slick` and `slick-carousel` dependencies.
- Split the bundle by route; today it is a single 5.5 MB bundle.
- Write copy for the remaining pages, and use `aria-disabled` across the app.

## Open questions

- Should the backend count `instructor` enrollments, or should the seed use
  `professor` (see above)?
- Should Register's heading use `display` or `display-lg`?
- Should the class list have a loading skeleton?
- Should the card focus frame move into the theme?
- Should the materials drawer dock below 1200 px?
- Should Enroll students check email addresses in the browser (A-16.18,
  A-16.55)?
- Is the mapping of experiment status to chip colour right?
- Who writes the reasons shown when "Email selected" and "Send" are disabled?
