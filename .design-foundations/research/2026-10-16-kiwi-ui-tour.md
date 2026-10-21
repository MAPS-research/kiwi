# Kiwi UI — current-state tour (Stage 1 input)

**Summary:** What the live UI looks like today, page by page, recorded as evidence for the Stage 1 brief (`2026-10-16-kiwi-ui-visual-refresh.md`) and its design-DNA step.

- **Date:** 2026-10-16
- **Status:** student and admin sides done. The student side was toured with a student account, the admin side with an admin account.
- **Setup:**
  - frontend from this repo, served on `localhost:3002`;
  - API proxied to the older backend on `localhost:3000` (from `ics-kiwi-app`);
  - signed in as a demo student;
  - viewport emulated at 1440×900;
  - demo course "CSS - Computational Social Science (Local Demo)".
- **Not seen:** chat message bubbles and streaming states — the account has no previous chat sessions, and sending a test question was not done (it calls the model and stores a session).

## Student side

### Course list (`/`)

- **Hero banner:** full width, with a rotating background (a purple→black gradient, and on another load a green→black one) plus a large decorative circle.
  - Headline: "Welcome to Kiwi, ⟨username⟩!" in bold Montserrat.
  - Conflicts with the brief: gradients (Feel), exclamation-mark voice (G12), Montserrat as a heading (G6).
- **Class card without an image:** a grey gradient with the Montserrat "Kiwi" wordmark at 50 % opacity. G9 replaces it with a mascot pose.
- **Floating chat button:** a purple circle, bottom right.
- **Canvas:** a light grey canvas with large unused space when there is one class.

### Top bar (all student pages)

- **Left:** the mascot tile and "Kiwi" in purple (no institution configured).
- **Class switcher:** a graduation-cap icon, the class name truncated with an ellipsis, and an up/down chevron.
- **Right:** a logout icon only. There is no "switch to admin" icon for a student.

### Class page — Materials tab (`/:classID`)

- **Tabs:** Materials · Scratchpad · ⟨app tabs, e.g. "CSS R Lab"⟩. The active tab has a purple underline.
- **Left rail:** a folder icon. The "Class Materials" panel has a Lecture / Recitation segmented toggle; the selected file has a purple tint and a check mark.
- **PDF viewer:** a toolbar with page 1/1, zoom 100 % and full screen.
  - The page itself has a 2 px purple outline. Under G5, paper should keep a neutral frame.

### Chat panel ("Kiwi Chat", floating)

- **Header:** four purple display-mode icons and a close icon. The panel can also open as a centred modal over a dimmed backdrop.
- **Session bar:** an all-caps "NEW SESSION" label with a history icon, a "+" and a chevron. The history list reads "No previous sessions".
- **Bot avatar:** a purple circle with a robot icon. G9 replaces it with the mascot.
- **Welcome copy:** "Welcome to Kiwi! How can I help you?" (exclamation mark, G12).
- **Model select:** its dropdown arrow overlaps the model name ("ChatGP▾"). The same defect was fixed in `NYUSH-ML/kiwi-ui` on 2026-10-15 (branch `fix/model-select-arrow-spacing`); this repo does not have that fix.
- **Composer:** placeholder "Ask Kiwi... You can type / to see available commands."; a purple send icon.

### Scratchpad (`/:classID/code`)

- **Layout:** a centred white card with a "Code Space" tab, an outlined "Upload" button and a language select.
- **Ace editor:** the default light theme, with a pale-yellow active line and a grey gutter. The run icon is dark; the upload icon is **blue**, off-palette.
- **Output panel:** monospace "Output will appear here."
- **Bottom actions:** three filled purple buttons side by side — "MOVE TO CHAT", "CHECK ANSWER", "Save Code".
  - Three primaries in one region (Feel: at most one).
  - Inconsistent casing (G12).

### Embedded Kiwi App — "CSS R Lab" (`/:classID/app/:appSlug`)

- **The app styles itself:**
  - a lowercase "kiwi" wordmark with a purple full stop;
  - a purple eyebrow ("PRACTICE & ASSIGNMENTS");
  - cards with tag chips;
  - a left workspace nav.

  Its purple comes from the Kiwi palette; after the refresh it changes only where it reads the public tokens (G5).
- **Mixed scripts:** headings mix English and Chinese ("… NA 与均值", "Demo · CSS 数据分析作业"). This is the G7 mixed-script case, rendered here with the system CJK fallback.
- **Floating chat button:** on this page it sits bottom-left and covers the app's sidebar progress label ("Questions completed 2/5"). Overlap is a layout issue (Stage 2), noted here because it is visible on every app page.

### Sign-in (`/login`)

- **Split layout:**
  - Left: a grey gradient panel with the italic Montserrat "Kiwi" wordmark and the aphoristic tagline (G12).
  - Right: the form — "Welcome back to Kiwi", purple pill "Login" button, "Need an account? Ask your administrator."
- **Session-expired alert:** an orange-tinted box above the heading.

## Admin side

Signed in as an admin, at the pane's own width (~960 px — narrower than the 1280 px verification width, which surfaces wrapping problems early).

### Shell (all admin pages)

- **Left sidebar:**
  - 11 system entries: Classes, User Management, System Analytics, System Email, Email Audit, System Flags, MCP Server Registry, App Registry, Webhooks, Webhook Approvals, and an admin app ("CSS Teacher Works…", truncated).
  - Inside a class, "Classes" expands into 9 class entries.
  - The active entry is a light-purple fill with purple text; nested entries mark the active one with a purple dot.
  - There is a purple collapse icon at the bottom.
- **Top bar:**
  - the class switcher ("All Classes" or the class name);
  - a book icon to switch to the student view;
  - logout.
- **Floating chat button:** present on every admin page, bottom right. It covers content: the topic list on Class Analytics, the chart on System Analytics, the Status column on Enroll Students.
- **Sidebar labels and page titles disagree** (G12):

  | Sidebar label | Page title |
  |---|---|
  | System Email | Email Management |
  | App Registry | Kiwi Apps Management |
  | Classes | All Classes |
  | User Management | User management |

  Heading case also varies between pages: "Enroll Students" vs "User management".

### Classes (`/admin/classes`)

- Header with a subtitle, a filled "+ Create New Class", a search field, and "Showing 1 of 1 classes".
- Class cards use the same grey wordmark fallback as the student side.

### Edit Class (`/admin/class/:classID`)

- A two-column form: a section title and description on the left, fields on the right — Basic information, Course image, Class-specific instructions.
- A "Class preview" card on the right repeats the grey wordmark fallback.
- Labels sit above the fields (no floating labels).
- The instructions toggle is a **purple** switch.
- The most composed admin page — a good pattern to carry forward.

### Materials (`/admin/class/:classID/manage-materials`)

- A "New materials" card with an outlined "Choose PDFs" button, and a materials list with search, a filter, a sort and an all-caps group header ("LECTURES 1").
- **Defect:** the upload icon sits outside the "Choose PDFs" button. Measured: the icon's left edge is 13 px left of the button's border.
- **Locale leak:** dates follow the browser locale. With `navigator.language` = `zh-CN` the list shows "12月31日" inside an English UI; the Kiwi Apps table shows "2026/10/14 01:19:43". G12/G7 should fix one date format for the English UI.
- The search placeholder is truncated at this width.

### Class Analytics (`/admin/class/:classID/professor-analytics`)

- KPI tiles: Questions, Active students, Topics, Active lectures. The icons are **purple** here and **dark grey** on System Analytics.
- **Student intent:** a stacked bar and chips in **blue**, beside **purple** topic bars — two accent hues for one analytics view (`ClassAnalytics/tokens.ts` carries its own colours; OQ2).
- **"Analyzing student questions…" note:** in a brown warning tone, with a thin purple progress bar.

### Experiments (`/admin/class/:classID/experiments`)

- An empty state with a flask icon in a purple-tint circle, "No experiments yet", and a filled "+ New Experiment".
- **The "Experiment Assistant" panel opens on its own** and covers the empty state and its call to action. Its header is a purple→dark gradient with sparkle icons — the stock "AI" signal the Feel section rules out.
- With the floating chat button, that makes two AI surfaces on one screen.

### Enroll Students (`/admin/class/:classID/enroll-students`)

- A blue info alert names the class.
- **Email box:** the textarea sits in a grey panel with its label on a white strip. The helper text repeats the label.
- **Full-width "ENROLL USERS"** — all caps, unlike most buttons.
- **Toolbar wrapping at ~960 px:** "Email Selected (0)" wraps onto three lines; "Remove Selected (0)" onto two.
- **Roster table:** each row has a filled purple role chip next to a filled green status chip — two saturated fills per row.

### User management (`/admin/user-management`)

- At this width the roster renders as cards. Each card has the email, an outlined "Password" chip, a filled green "Registered" chip, a role select, a wide outlined "Reset password" button and an "Enabled" switch.
- **The "Enabled" switch is green**, while other switches in the app are purple. Switch colour should follow one rule (G1: status green is for status surfaces, not controls).
- **Header actions:** an outlined "Assign instructor" and a filled "Add users". Below them, "Table" and "Export CSV" buttons and pill-shaped filter selects.

### System Analytics (`/admin/analytics`)

- KPI tiles with dark-grey icons.
- **"Daily Active Users":**
  - a smoothed purple line with a gradient fill — the smoothing invents a curve between daily counts;
  - the y-axis shows 0.25 / 0.75 ticks for a count of people.

  Dataviz fixes for OQ2: discrete days → bars or straight segments; integer ticks.

### System Email (`/admin/email`)

- Tabs: Custom Email, Templated Email, Email Lists.
- A recipient picker with a blue info bar ("0 of 2 recipients selected") and "Select All" / "Clear All" text buttons.
- **Templated Email preview:**
  - the outgoing HTML has a solid purple header (`#5C3B6E`) with white bold sans text;
  - the footer reads "This email was sent from Kiwi Platform. Please do not reply to this email."

  Both colour and copy are in G12's scope; "Kiwi Platform" is a product name the UI uses nowhere else.

### App Registry (`/admin/kiwi-apps`)

- Tabs "Whitelist" / "Registered Apps". "Whitelist" is a copy item for G12; "allowlist" is the current convention.
- **Table:**
  - the Slug column is so narrow that "ics-r-lab" breaks onto three lines;
  - monospace Base URL;
  - a green "Approved" chip;
  - a locale-formatted Created date;
  - a purple edit icon and a red delete icon.

### Admin side: what Stage 1 should take from this

1. **One accent per view.** Today purple, blue and green each act as accents on admin pages, with filled chips everywhere.
2. **Switches, chips and KPI icons follow one colour rule each.**
3. **Compact density has to handle ~960–1280 px** without wrapping toolbar buttons or narrow columns; check at 1280 too (G13).
4. **The floating chat button needs a resting position that never covers content.** Layout is Stage 2, but its size and elevation are Stage 1.
5. **Copy:** the sidebar label equals the page title; one heading case; no all-caps buttons; one date format.

## Bugs found on the way (outside Stage 1's visual scope)

- **B1 — `/admin/*` is not role-guarded in the frontend.** The `/admin` layout route is wrapped only in `ProtectedRoute` (any signed-in user), at `kiwi-ui/src/App.tsx:131`. Only four pages add `AdminProtectedRoute`: email, email-audit, mcp-servers, kiwi-apps. `kiwi-ui/CLAUDE.md` says the admin area admits only admins and instructors.
- **B2 — "Not permitted" logs the user out as "session expired".**
  - The backend guards answer an authenticated-but-not-permitted request with **401**, not 403:
    - `AdminGuard` and `ProfGuard` at `kiwi/src/auth/auth.guard.ts:76` and `:128`;
    - the class-access check at `:348`;
    - the same in the older running backend.
  - The frontend middleware handles a 401 by refreshing the token and retrying once. On a second 401 it clears the session and redirects to `/login?timeout=true` (`kiwi-ui/src/utils/middleware.ts:62-71`).
  - Result: a student who opens an admin page — or a class they no longer have access to — is signed out with "Your session has expired."
- **B3 — Model-select arrow overlaps the model name** in the chat panel (see above).
