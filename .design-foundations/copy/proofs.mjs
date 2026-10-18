// proofs.mjs: the planted defects of the rule-coverage audit. prove-checks.mjs runs them; rule-coverage.json names them; check-copy.mjs (R1) reads both.
//
//   UNIT   a string run through one lint function, in this process: the lint must hit it (or, for a negative control, must not).
//   E2E    one defect planted into a throwaway copy of the data, the guide or the source; check-copy.mjs runs on the copy and the named check must fail.
//
// A proof that is not caught is a lint with a hole, so prove-checks.mjs exits 1 and writes the miss into generated/proof-summary.json.
import { lintString, lintSource, bareCountHits, enDashHits, scopedTermHits, sentencePartOf, AUDIT } from "./copy-lib.mjs";

// ------------------------------------------------------------------------------------------------------------------------------------
// UNIT: [id, rule, how, where, text, expect]
//   how   "string" (lintString, where = the row kind), "source" (lintSource, where = the attribute), "bare" (bareCountHits), "dash" (enDashHits),
//         "scoped" (scopedTermHits, where = { group, file }), "part" (sentencePartOf: where = the old string, text = the query)
//   expect  a RegExp the first hit must match; null for a negative control (nothing may be reported)
// ------------------------------------------------------------------------------------------------------------------------------------
const U = [];
const u = (id, rule, how, where, text, expect, audit) => U.push({ id, rule, how, where, text, expect, audit });
// C1 case
u("U-C1-1", "C1", "string", "label", "Create New Class", /title case/);
u("U-C1-2", "C1", "string", "label", "ENROLL USERS", /capitals typed/);
u("U-C1-3", "C1", "string", "helper", "Choose A class to begin.", /capital mid-sentence: A/, "C1-A");
u("U-C1-4", "C1", "string", "heading", "enroll students", /begins with a lowercase letter/, "C1-B");
u("U-C1-5", "C1", "string", "aria", "close chat", /begins with a lowercase letter/, "C1-B");
u("U-C1-6", "C1", "source", "label", "Delete Webhook Now", /title case/);
u("U-C1-7", "C1", "string", "helper", "Choose a class. Then Select A thing.", /capital mid-sentence/);
u("U-C1-n1", "C1", "string", "helper", "Plan A is the default.", null);
u("U-C1-n2", "C1", "string", "placeholder", "e.g. A short overview of the file", null);
u("U-C1-n3", "C1", "string", "label", "Sign in with Google", null);
// C2 buttons
u("U-C2-1", "C2", "string", "button", "Submit", /generic button label|verb and an object/);
u("U-C2-2", "C2", "string", "button", "OK", /generic button label|verb and an object/);
u("U-C2-3", "C2", "string", "button", "Delete", /verb and an object/);
u("U-C2-4", "C2", "string", "button", "Select all", /verb and an object/);
u("U-C2-5", "C2", "string", "button", "Send a brand new test event now", /more than five words/, "C2-A");
u("U-C2-6", "C2", "string", "cbutton", "Confirm", /generic button label|verb and an object/);
u("U-C2-n1", "C2", "string", "button", "Retry", null);
u("U-C2-n2", "C2", "string", "button", "Sign in and allow access", null);
// C3 dates
u("U-C3-1", "C3", "string", "status", "Created Oct 7", /day before the month/, "C3-A");
u("U-C3-2", "C3", "string", "status", "Updated 10/17/2026", /numeric date/, "C3-A");
u("U-C3-3", "C3", "string", "status", "Starts at 3pm", /24-hour/, "C3-A");
u("U-C3-4", "C3", "string", "body", "It ends on October 17, 2026.", /day before the month/);
u("U-C3-5", "C3", "string", "status", "Updated 2026/10/17", /numeric date/, "C3-A");
u("U-C3-6", "C3", "string", "body", "It ran on 2026-10-17.", /ISO date/, "C3-A");
u("U-C3-7", "C3", "source", "jsx", "Created Oct 7, 2026", /day before the month/);
u("U-C3-8", "C3", "string", "body", "Uses toLocaleDateString() for the date.", /browser-locale/);
u("U-C3-n1", "C3", "string", "status", "Created 17 Oct 2026, 14:05", null);
u("U-C3-n2", "C3", "string", "label", "October 2026", null);
u("U-C3-n3", "C3", "string", "label", "allowlist_2026-10-17.csv", null);
u("U-C3-n4", "C3", "string", "body", "2 groups, 50/50.", null);
// C4 numbers, plurals, units
u("U-C4-1", "C4", "string", "status", "12000 deliveries", /comma/, "C4-A");
u("U-C4-2", "C4", "string", "body", "Choose three classes.", /digits for numbers/, "C4-B");
u("U-C4-3", "C4", "string", "status", "Expires in 5 minutes", /one way/, "C4-C");
u("U-C4-4", "C4", "string", "status", "Expires in 3 hrs", /one way/);
u("U-C4-5", "C4", "bare", null, "{n} classes", /\{n\} classes/);
u("U-C4-6", "C4", "bare", null, "1 classes", /1 classes/);
u("U-C4-7", "C4", "bare", null, "{n} selected users", /selected users/);
u("U-C4-8", "C4", "string", "status", "{n} class(es)", /real plurals/);
u("U-C4-9", "C4", "source", "jsx", "Expires in 5 minutes", /one way/);
u("U-C4-10", "C4", "string", "status", "Write {n: count minute} here", /one form/, "C4-C");
u("U-C4-n1", "C4", "string", "status", "Expires in 5 min", null);
u("U-C4-n2", "C4", "string", "status", "Started in 2026", null);
u("U-C4-n3", "C4", "bare", null, "{n: count event} selected", null);
// C5 marks
u("U-C5-1", "C5", "string", "heading", "Welcome to Kiwi!", /exclamation/);
u("U-C5-2", "C5", "string", "status", "Loading...", /ellipsis character/);
u("U-C5-3", "C5", "string", "button", "Login & Authorize", /and, not &/);
u("U-C5-4", "C5", "string", "empty", "No materials yet.", /state line takes no full stop/);
u("U-C5-5", "C5", "string", "body", "Select a class — then continue.", /em dash/);
u("U-C5-6", "C5", "string", "body", "Select a class - then continue.", /no dash in a sentence/, "C5-A");
u("U-C5-7", "C5", "dash", null, "Select a class – then continue.", /en dash/);
u("U-C5-8", "C5", "string", "body", "It’s done.", /straight quotes/);
u("U-C5-9", "C5", "string", "status", "Done \u{1F389}", /emoji/);
u("U-C5-10", "C5", "string", "label", "Class name:", /takes no colon/, "C5-B");
u("U-C5-11", "C5", "string", "body", "Choose a class", /end punctuation/);
u("U-C5-12", "C5", "source", "jsx", "Select a class -- then continue.", /no dash in a sentence/);
u("U-C5-n1", "C5", "dash", null, "1 Oct – 7 Oct 2026", null);
// C6 terminology
u("U-C6-1", "C6", "string", "body", "Add the user to the whitelist.", /allowlist/);
u("U-C6-2", "C6", "string", "label", "Kiwi Platform", /Kiwi, not Kiwi Platform/);
u("U-C6-3", "C6", "string", "button", "Log in", /sign in and sign out/);
u("U-C6-4", "C6", "string", "label", "Professor", /instructor/);
u("U-C6-5", "C6", "string", "label", "Webhook slug", /identifier, not slug/, "C6-A");
u("U-C6-6", "C6", "string", "label", "Webhook config", /setup, not config/, "C6-A");
u("U-C6-7", "C6", "string", "label", "Variant groups", /group \(the students\)/, "C6-A");
u("U-C6-8", "C6", "string", "body", "Enrolled users appear here.", /enrolled users/, "C6-A");
u("U-C6-9", "C6", "string", "body", "Your conversation is saved.", /chat, not conversation/, "C6-A");
u("U-C6-10", "C6", "string", "status", "You are out of tokens.", /usage limit/, "C6-A");
u("U-C6-11", "C6", "string", "label", "System prompt", /instructions/);
u("U-C6-12", "C6", "string", "label", "Course image", /cover image|class, not course/);
u("U-C6-13", "C6", "string", "label", "Payload", /data, not payload/);
u("U-C6-14", "C6", "string", "label", "Engine", /model, not engine/);
u("U-C6-15", "C6", "string", "body", "Pick a file.", /choose, not pick/);
u("U-C6-16", "C6", "string", "label", "AI assistant", /the assistant, not an AI/, "C6-A");
u("U-C6-17", "C6", "string", "label", "Open the IDE", /scratchpad/, "C6-A");
u("U-C6-18", "C6", "source", "jsx", "Zebra slug", /identifier, not slug/);
u("U-C6-24", "C6", "string", "body", "Your session has expired.", /sign-in has expired/, "C6-A");
u("U-C6-19", "C6", "scoped", { group: "A-09", file: "" }, "Start a new session.", /session is the analytics word/);
u("U-C6-20", "C6", "scoped", { group: "A-06", file: "" }, "Create an assignment.", /not assignment/);
u("U-C6-21", "C6", "scoped", { group: "A-20", file: "" }, "Edit the system prompt.", /not prompt/);
u("U-C6-22", "C6", "scoped", { group: "SR-6", file: "" }, "Copy the response.", /answer, not response/);
u("U-C6-23", "C6", "scoped", { group: "S-02", file: "" }, "Ask the assistant.", /never see the word assistant/);
u("U-C6-25", "C6", "string", "label", "Delete webhook", /deactivate, for a webhook/, "C6-A");
u("U-C6-26", "C6", "string", "status", "The webhook was removed.", /deactivate, for a webhook/, "C6-A");
u("U-C6-n3", "C6", "string", "label", "Delete token", null);
u("U-C6-n1", "C6", "scoped", { group: "A-03", file: "" }, "Average session", null);
u("U-C6-n2", "C6", "scoped", { group: "A-08", file: "" }, "Approve this prompt.", null);
// C7 page names
u("U-C7-1", "C7", "string", "body", "Open User Management.", /Users is the page's name/, "C6-A");
u("U-C7-2", "C7", "string", "body", "Open Webhook Management.", /Webhooks is the page's name/);
u("U-C7-3", "C7", "string", "body", "Open Event Approvals.", /Webhook approvals/);
u("U-C7-4", "C7", "string", "body", "Open MCP Server Registry.", /MCP servers/);
u("U-C7-5", "C7", "source", "jsx", "Go to Email Management", /System email/);
u("U-C7-n1", "C7", "string", "body", "Open Webhooks.", null);
// C8 person
u("U-C8-1", "C8", "string", "body", "We will email you.", /no we, our or let's/, "C8-A");
u("U-C8-2", "C8", "string", "body", "Let's get started.", /no we, our or let's/);
u("U-C8-3", "C8", "string", "body", "Our team is here to help.", /no we, our or let's/);
u("U-C8-4", "C8", "string", "body", "I'll draft the setup.", /no we, our or I/);
u("U-C8-5", "C8", "string", "body", "Please try again.", /no please/);
u("U-C8-6", "C8", "string", "body", "Let us know.", /no we, our or let's/);
u("U-C8-7", "C8", "string", "label", "My classes", /Your, not My/);
u("U-C8-8", "C8", "string", "label", "Mine only", /Your, not My/);
u("U-C8-n1", "C8", "string", "body", "Kiwi drafts the setup. You review it.", null);
u("U-C8-n2", "C8", "string", "label", "Your classes", null);
// C9 errors
u("U-C9-1", "C9", "string", "error", "Failed to load classes", /Failed to/);
u("U-C9-2", "C9", "string", "error", "Oops, something went wrong.", /Oops|vague error/);
u("U-C9-3", "C9", "string", "body", "Something went wrong.", /vague error/, "C9-A");
u("U-C9-4", "C9", "string", "body", "You entered an invalid email.", /no blame/, "C9-B");
u("U-C9-5", "C9", "source", "jsx", "Zebra went wrong.", /vague error/);
u("U-C9-6", "C9", "string", "body", "An unexpected error occurred.", /vague error/);
u("U-C9-n1", "C9", "string", "error", "Couldn't save the class. The server returned an error. Try again in a moment.", null);
// C10 raw text
u("U-C10-1", "C10", "string", "body", "Error {statusText}.", /reason phrase/, "C10-A");
u("U-C10-2", "C10", "string", "body", "The backend returned an error.", /developer text/);
u("U-C10-3", "C10", "string", "body", "TypeError: undefined is not a function", /developer text/);
u("U-C10-4", "C10", "string", "body", "Set VITE_API_URL first.", /developer text/);
u("U-C10-5", "C10", "source", "jsx", "HTTP 500: Internal Server Error", /developer text|status line/);
u("U-C10-n1", "C10", "string", "error", "Couldn't save the class. The server said: \"{message}\". Try again.", null);
// C11 confirmations
u("U-C11-1", "C11", "string", "confirm", "This action cannot be undone.", /This can't be undone/, "C11-A");
u("U-C11-2", "C11", "string", "confirm", "Are you sure you want to delete this?", /Are you sure/);
u("U-C11-3", "C11", "string", "cbutton", "Yes", /generic button label|verb and an object/);
u("U-C11-4", "C11", "source", "jsx", "This action cannot be undone", /This can't be undone/);
u("U-C11-n1", "C11", "string", "confirm", "The webhook stops receiving events. This can't be undone.", null);
// C12 empty states
u("U-C12-1", "C12", "string", "empty", "No results found", /No \{things\} yet/, "C12-A");
u("U-C12-2", "C12", "string", "empty", "Nothing here", /No \{things\} yet/);
u("U-C12-3", "C12", "string", "empty", "No classes found", /No \{things\} yet/);
u("U-C12-4", "C12", "source", "jsx", "No webhooks found", /No \{things\} yet/);
u("U-C12-n1", "C12", "string", "empty", "No classes yet", null);
u("U-C12-n2", "C12", "string", "empty", "No classes match \"{query}\"", null);
// C13 progress
u("U-C13-1", "C13", "string", "status", "Loading classes", /ellipsis character/, "C13-B");
u("U-C13-2", "C13", "string", "status", "Creating token 45%", /percentage/, "C13-A");
u("U-C13-3", "C13", "string", "status", "Loading sessions...", /ellipsis character/);
u("U-C13-4", "C13", "source", "jsx", "Saving...", /ellipsis character/);
u("U-C13-n1", "C13", "string", "status", "Loading classes…", null);
u("U-C13-n2", "C13", "string", "status", "Showing the first 50 users", null);
// C14 labels, helpers, placeholders
u("U-C14-1", "C14", "string", "label", "Token name *", /asterisk/, "C14-A");
u("U-C14-2", "C14", "string", "label", "Token name (Optional)", /optional/);
u("U-C14-3", "C14", "string", "placeholder", "Enter the token name", /placeholder is an example/, "C14-B");
u("U-C14-4", "C14", "source", "placeholder", "Enter the token name", /placeholder is an example/);
u("U-C14-5", "C14", "source", "helperText", "Shown in the subject", /full stop/);
u("U-C14-6", "C14", "string", "helper", "Shown in the subject", /end punctuation/);
u("U-C14-n1", "C14", "string", "placeholder", "e.g. The lab moves to room 301", null);
u("U-C14-n2", "C14", "string", "placeholder", "Search classes", null);
// C15 icon-only names
u("U-C15-1", "C15", "source", "aria-label", "Delete", /names its object/);
u("U-C15-2", "C15", "source", "title", "Edit", /names its object/);
u("U-C15-3", "C15", "string", "aria", "close", /begins with a lowercase letter/);
u("U-C15-n1", "C15", "string", "aria", "Close chat", null);
// C16 claims
u("U-C16-1", "C16", "string", "body", "AI-powered learning for every class.", /hype/);
u("U-C16-2", "C16", "string", "body", "Kiwi knows everything about your class.", /cannot back/, "C16-A");
u("U-C16-3", "C16", "string", "body", "Seamless, smart and magical.", /hype/);
u("U-C16-4", "C16", "string", "body", "Kiwi gives accurate answers.", /cannot back/);
u("U-C16-5", "C16", "string", "body", "Kiwi understands how you feel.", /cannot back/);
u("U-C16-6", "C16", "source", "jsx", "Perfectly accurate results", /cannot back/);
u("U-C16-7", "C16", "string", "body", "Backend error: the server needs a restart.", /developer text/);
u("U-C16-n1", "C16", "string", "body", "Kiwi answers from your class materials.", null);
// C17 branding
u("U-C17-1", "C17", "string", "body", "Contact help@duke.edu for help.", /comes from branding config/, "C17-A");
u("U-C17-2", "C17", "string", "body", "Built for the Duke University community.", /comes from branding config/);
u("U-C17-3", "C17", "source", "jsx", "Write to support@school.edu", /comes from branding config/);
u("U-C17-n1", "C17", "string", "placeholder", "e.g. student1@example.edu", null);
u("U-C17-n2", "C17", "string", "body", "Contact {SUPPORT_EMAIL}.", null);
// C18 spelling
u("U-C18-1", "C18", "string", "body", "Enrol students in the class.", /American spelling/, "C18-A");
u("U-C18-2", "C18", "string", "body", "Analyse your results.", /American spelling/);
u("U-C18-3", "C18", "string", "body", "The request was cancelled.", /American spelling/);
u("U-C18-4", "C18", "string", "label", "Colour", /American spelling/);
u("U-C18-5", "C18", "string", "label", "Organisation", /American spelling/);
u("U-C18-6", "C18", "source", "jsx", "Behaviour is recorded", /American spelling/);
u("U-C18-n1", "C18", "string", "body", "Enroll students in the class.", null);
// the eighth review: a bare count before a singular noun, and before a modifier and a noun (D3), and what a containment reference in the Tests column is
u("U-C4-11", "C4", "bare", null, "Your instructor added {n} summary", /\{n\} summary/);
u("U-C4-12", "C4", "bare", null, "\u2026 and {n} more pending users", /more pending users/);
u("U-C4-13", "C4", "bare", null, "Choose {n} new messages", /new messages/);
u("U-C4-14", "C4", "bare", null, "Waiting for {n} class", /\{n\} class/);
u("U-C4-n4", "C4", "bare", null, "Created {n} of {total: count account}.", null);
u("U-C4-n5", "C4", "bare", null, "Roster: {n: count user} ({a} active, {p} pending)", null);
u("U-C4-n6", "C4", "bare", null, "{m} assigned to this class", null);
u("U-C4-n7", "C4", "bare", null, "Your instructor added {n: count summary}", null);
u("U-C4-n8", "C4", "bare", null, "\u2026 and {n: count more pending user}", null);
const OLD_A2231 = "Add MCP servers to enable additional tools for this class. Built-in tools (RAG and Code Interpreter) should appear automatically.";
u("U-E5-1", "TESTS", "part", OLD_A2231, "Add MCP servers to enable additional tools for this class.", /part/);
u("U-E5-2", "TESTS", "part", OLD_A2231, "Built-in tools (RAG and Code Interpreter) should appear automatically", /part/);
u("U-E5-n1", "TESTS", "part", OLD_A2231, "Code Interpreter", null);
u("U-E5-n2", "TESTS", "part", OLD_A2231, "Add MCP servers to enable additional tools", null);
export const UNIT = U;

export function runUnit(c) {
  let hits;
  if (c.how === "string") hits = lintString(c.text, c.where, []);
  else if (c.how === "source") hits = lintSource(c.text, c.where);
  else if (c.how === "bare") hits = bareCountHits(c.text).map((h) => `bare count: ${h}`);
  else if (c.how === "dash") hits = enDashHits(c.text).map((h) => `an en dash outside a date or number range: ${h}`);
  else if (c.how === "scoped") hits = scopedTermHits(c.text, c.where);
  else if (c.how === "part") hits = sentencePartOf(c.text, c.where) ? [`part: ${c.text}`] : [];
  else throw new Error(`unknown how ${c.how}`);
  let ok = c.expect === null ? hits.length === 0 : hits.some((h) => c.expect.test(h));
  if (ok && c.audit) {
    const entry = AUDIT.find((a) => a.id === c.audit);
    ok = !!entry && entry.test(c.text, { kind: c.how === "source" ? c.where : c.where, source: c.how === "source" }).length > 0;
  }
  return { ok, hits };
}

// every AUDIT lint has a unit proof that names it (the id of the lint is in the message prefix or in the unit id), so no lint is without a planted defect
export const AUDIT_IDS = AUDIT.map((a) => a.id);

// ------------------------------------------------------------------------------------------------------------------------------------
// E2E. `mutate(c)` plants the defect through the context c (c.row, c.keep, c.src, c.design, c.journey, c.json, c.text); `expect` is the check that must fail.
//   corpus: "new" (a New string, B1 and friends), "kept" (a kept string, H17), "source" (a string in the source, H1), "examples" (the guide's own samples, F20),
//           "data" (the revision data), "guide" (the text of DESIGN.md), "code" (the source code the checks read)
// ------------------------------------------------------------------------------------------------------------------------------------
const E = [];
const e = (id, rule, corpus, expect, name, mutate) => E.push({ id, rule, corpus, expect, name, mutate });

// -- a New string, planted into a victim row of the kind the lint reads
const newRow = (id, rule, expect, victim, field, text, name) => e(id, rule, "new", expect, name || `${rule}: ${JSON.stringify(text)} as the New of ${victim}`, (c) => c.row(victim, { [field]: text }));
const V = { heading: "A-09.01", button: "A-09.13", cbutton: "A-09.21", body: "A-09.12", status: "A-09.24", label: "A-09.23", tooltip: "A-09.71", empty: "A-09.83", helper: "A-09.77", aria: "A-24.30", placeholder: "A-14.01", confirm: "A-09.36", error: "A-09.54" };
newRow("E-C1-new-1", "C1", "B1", V.label, "n", "Token Name Here");
newRow("E-C1-new-2", "C1", "B1", V.helper, "n", "Choose A token to begin.");
newRow("E-C1-new-3", "C1", "B1", V.heading, "n", "webhooks");
newRow("E-C2-new-1", "C2", "B1", V.button, "n", "Submit");
newRow("E-C2-new-2", "C2", "B1", V.button, "n", "Send a brand new test event now");
newRow("E-C3-new-1", "C3", "B1", V.status, "n", "Created Oct 7");
newRow("E-C3-new-2", "C3", "B1", V.status, "n", "Created at 3pm");
newRow("E-C4-new-1", "C4", "B1", V.status, "n", "12000 deliveries");
newRow("E-C4-new-2", "C4", "B1", V.body, "n", "Send three test events.");
newRow("E-C4-new-3", "C4", "B1", V.status, "n", "Expires in 5 minutes");
newRow("E-C4-new-4", "C4", "D3", V.status, "n", "{n} deliveries");
newRow("E-C4-new-5", "C4", "D6", V.status, "n", "{n} delivery(ies)");
newRow("E-C5-new-1", "C5", "B1", V.heading, "n", "Webhooks!");
newRow("E-C5-new-2", "C5", "B1", V.body, "n", "Send a test event - now.");
newRow("E-C5-new-3", "C5", "B1", V.body, "n", "Send a test event – now.");
newRow("E-C5-new-4", "C5", "B1", V.label, "n", "Token name:");
newRow("E-C5-new-5", "C5", "B1", V.status, "n", "Creating token...");
newRow("E-C6-new-1", "C6", "B1", V.label, "n", "Whitelist token");
newRow("E-C6-new-2", "C6", "B1", V.label, "n", "Webhook slug");
newRow("E-C6-new-3", "C6", "B1", V.label, "n", "Webhook config");
newRow("E-C6-new-4", "C6", "D8", V.body, "n", "Start a new session.");
newRow("E-C6-new-5", "C6", "B1", V.label, "n", "Delete webhook");
newRow("E-C7-new-1", "C7", "B1", V.body, "n", "Open Webhook Management.");
newRow("E-C8-new-1", "C8", "B1", V.body, "n", "We will send a test event.");
newRow("E-C8-new-2", "C8", "B1", V.body, "n", "I'll send a test event.");
newRow("E-C8-new-3", "C8", "B1", V.label, "n", "My classes");
e("E-C9-new-1", "C9", "new", "B1", "C9: Failed to as the what-happened of an error row", (c) => c.row(V.error, { what: "Failed to create the webhook." }));
newRow("E-C9-new-2", "C9", "B1", V.body, "n", "Something went wrong.");
newRow("E-C9-new-3", "C9", "B1", V.body, "n", "You entered an invalid URL.");
newRow("E-C9-new-4", "C9", "D2", V.status, "n", "Couldn't send the test event");
e("E-C9-new-5", "C9", "new", "D1", "C9: an error row with no what-to-do", (c) => c.row(V.error, { fix: "" }));
newRow("E-C10-new-1", "C10", "B1", V.body, "n", "Error {statusText}.");
newRow("E-C10-new-2", "C10", "B1", V.body, "n", "The backend returned an error.");
newRow("E-C10-new-3", "C10", "D10", V.body, "n", "Error {statusText}.");
newRow("E-C11-new-1", "C11", "B1", V.body, "n", "This action cannot be undone.");
newRow("E-C11-new-2", "C11", "B1", V.body, "n", "Are you sure you want to continue?");
newRow("E-C12-new-1", "C12", "B1", V.empty, "n", "No webhooks found");
newRow("E-C13-new-1", "C13", "B1", V.status, "n", "Creating the token");
newRow("E-C13-new-2", "C13", "B1", V.status, "n", "Creating token 45%");
newRow("E-C14-new-1", "C14", "B1", V.label, "n", "Token name *");
newRow("E-C14-new-2", "C14", "B1", V.placeholder, "n", "Enter the search text");
newRow("E-C15-new-1", "C15", "B1", V.aria, "n", "edit summary");
newRow("E-C16-new-1", "C16", "B1", V.body, "n", "Kiwi knows everything about your webhooks.");
newRow("E-C16-new-2", "C16", "B1", V.body, "n", "AI-powered webhooks.");
newRow("E-C17-new-1", "C17", "B1", V.body, "n", "Contact help@duke.edu for help.");
newRow("E-C18-new-1", "C18", "B1", V.body, "n", "Enrol students in the class.");

// -- a kept string: appended to a page's `Kept as is` list, which H17 reads with the lints of a new string
const keptStr = (id, rule, text, name) => e(id, rule, "kept", "H17", name || `${rule}: ${JSON.stringify(text)} in a page's kept list`, (c) => c.keep("A-24", text));
keptStr("E-C1-kept-1", "C1", "Token Name Here");
keptStr("E-C3-kept-1", "C3", "Created Oct 7, 2026.");
keptStr("E-C4-kept-1", "C4", "12000 deliveries.");
keptStr("E-C4-kept-2", "C4", "Send three test events.");
keptStr("E-C4-kept-3", "C4", "{n} events selected.");
keptStr("E-C5-kept-1", "C5", "Webhooks!");
keptStr("E-C5-kept-2", "C5", "Send a test event - now.");
keptStr("E-C5-kept-3", "C5", "Creating token...");
keptStr("E-C6-kept-1", "C6", "Whitelist token");
keptStr("E-C6-kept-2", "C6", "Webhook slug");
keptStr("E-C6-kept-3", "C6", "Start a new session.");
keptStr("E-C7-kept-1", "C7", "Open Webhook Management.");
keptStr("E-C8-kept-1", "C8", "We will send a test event.");
keptStr("E-C8-kept-2", "C8", "My classes");
keptStr("E-C9-kept-1", "C9", "Something went wrong.");
keptStr("E-C9-kept-2", "C9", "Couldn't send the test event");
keptStr("E-C10-kept-1", "C10", "The backend returned an error.");
keptStr("E-C11-kept-1", "C11", "This action cannot be undone.");
keptStr("E-C12-kept-1", "C12", "No webhooks found");
keptStr("E-C13-kept-1", "C13", "Loading classes...");
keptStr("E-C16-kept-1", "C16", "Kiwi knows everything about your webhooks.");
keptStr("E-C17-kept-1", "C17", "Contact help@duke.edu for help.");
keptStr("E-C18-kept-1", "C18", "Enrol students in the class.");

// -- a string in the source that no row touches: appended to a file in scope, which H1 reads with the lints of a source string
const srcStr = (id, rule, text, name) => e(id, rule, "source", "H1", name || `${rule}: ${JSON.stringify(text)} in a source file`, (c) => c.src("src/pages/Consent.tsx", `\nexport const proofLabel = { label: ${JSON.stringify(text)} };\n`));
srcStr("E-C1-src-1", "C1", "Zebra Token Name");
srcStr("E-C3-src-1", "C3", "Zebra created Oct 7, 2026");
srcStr("E-C4-src-1", "C4", "Zebra 12000 deliveries");
srcStr("E-C4-src-2", "C4", "Zebra expires in 5 minutes");
srcStr("E-C5-src-1", "C5", "Zebra!");
srcStr("E-C5-src-2", "C5", "Zebra then a dash - and more words here");
srcStr("E-C6-src-1", "C6", "Zebra whitelist");
srcStr("E-C6-src-2", "C6", "Zebra slug");
srcStr("E-C7-src-1", "C7", "Open Zebra Email Management now");
srcStr("E-C9-src-1", "C9", "Zebra went wrong here");
srcStr("E-C10-src-1", "C10", "The zebra backend is down");
srcStr("E-C11-src-1", "C11", "This action cannot be undone, zebra.");
srcStr("E-C12-src-1", "C12", "No zebras found");
srcStr("E-C13-src-1", "C13", "Zebra loading...");
srcStr("E-C16-src-1", "C16", "Zebra gives perfectly accurate results");
srcStr("E-C17-src-1", "C17", "Write to zebra@school.edu");
srcStr("E-C18-src-1", "C18", "Zebra behaviour is recorded");

// -- the other corpora and the checks that are not string lints
e("E-F20-examples-1", "C5", "examples", "F20", "C5: an exclamation mark in a guide example (the right side of C1's wrong-to-right pair)", (c) => c.design((t) => t.replace('"Create New Class" → "Create class"', '"Create New Class" → "Create class!"')));
e("E-C1-code-1", "C1", "code", "H7", "C1: a CSS text-transform that draws capitals over a string, not named in the hand-off", (c) => c.src("src/pages/Consent.tsx", `\nexport const proofCss = { textTransform: "uppercase" };\n`));
e("E-C2-code-1", "C2", "code", "H12", "C2: a two-word verb-only button label in the source", (c) => c.src("src/pages/Consent.tsx", `\nexport const ProofButton = () => <Button>Select all</Button>;\n`));
e("E-C2-data-1", "C2", "data", "H8", "C2: a confirming button reduced to the bare verb", (c) => c.row("A-09.10", { n: "Delete" }));
e("E-C3-code-1", "C3", "code", "H2", "C3: a default-locale toLocaleDateString() call in the source", (c) => c.src("src/pages/Consent.tsx", `\nexport const proofDate = (d: Date) => d.toLocaleDateString();\n`));
e("E-C3-guide-1", "C3", "guide", "H20", "C3: the chart helper's en-US formats no longer named in the Phase 6 hand-off", (c) => c.design((t) => t.replace("(`chartXAxis.ts:91`, `Oct 7, 3:30 PM`)", "(the tooltip, `Oct 7, 3:30 PM`)")));
e("E-C4-code-1", "C4", "code", "H10", "C4: a count shown with a plural noun whose row drops the helper", (c) => c.row("A-04.28", { n: "Email sent to {n} recipients" }));
e("E-C5-data-1", "C5", "data", "H19", "C5: the joined empty-value glyph loses its em dash replacement row", (c) => c.dropRow("S-02.19"));
e("E-C6-data-1", "C6", "data", "H18", "C6: \"server\" alone on an MCP page", (c) => c.row("A-07.04", { n: "Server list" }));
e("E-C6-data-2", "C6", "data", "D8", "C6: \"assignment\" on a feature-flag page", (c) => c.row("A-06.01", { n: "Flag assignments" }));
e("E-C7-data-1", "C7", "data", "F8", "C7: a sidebar label that is not in the page-name table", (c) => c.row("SR-3.02", { n: "User list" }));
e("E-C11-data-1", "C11", "data", "H16", "C11: a confirmation title that is not a question", (c) => c.row("A-09.08", { n: "Delete this webhook" }));
e("E-C17-data-1", "C17", "data", "D4", "C17: a sentence that names {SUPPORT_EMAIL} with no without-address variant", (c) => c.row("A-24.30", { n: "Contact {SUPPORT_EMAIL} for help." }));
e("E-ERR-1", "ERR", "data", "D1", "§ Errors: an error row with no why for its cause", (c) => c.row("A-09.54", { c: "denied", why: undefined }));
e("E-ERR-2", "ERR", "data", "F5", "§ Errors: a closed cause line missing from the section", (c) => c.design((t) => t.split("Kiwi couldn't reach the server.").join("Kiwi lost the server.")));
e("E-ERR-3", "ERR", "data", "D11", "§ Errors: a failed write with neither safe nor nosafe", (c) => c.row("A-02.08", { safe: undefined, nosafe: undefined }));
e("E-ERR-4", "ERR", "data", "D11", "§ Errors: a row whose cited catch block clears the form", (c) => c.srcEdit("src/pages/admin/ClassEdit.tsx", (t) => t.replace('      setError("Failed to update class metadata. Please try again.");', '      resetForm();\n      setError("Failed to update class metadata. Please try again.");')));
e("E-ERR-5", "ERR", "data", "D11", "§ Errors: the sentence said by a row that is not a failed write", (c) => c.row("A-09.77", { n: "Your changes are still in the form." }));
e("E-ERR-6", "ERR", "data", "K5", "§ Errors: a string that says Kiwi twice in a row", (c) => c.row("SR-6.54", { what: "Kiwi couldn't finish answering.", why: "Kiwi couldn't reach the server." }));
e("E-ERR-7", "ERR", "data", "K4", "§ Errors: the supersession of the locked Companion hand-off is missing", (c) => c.design((t) => t.replace("this section supersedes it for those two paths", "this section ignores it for those two paths")));
e("E-ERR-8", "ERR", "data", "K4", "§ Errors: the expired row offers Retry", (c) => c.row("SR-6.13", { fix: "Select Retry." }));
e("E-ERR-9", "ERR", "data", "F22", "§ Errors: the backend requirement for user-safe messages is missing", (c) => c.design((t) => t.replace("(5) the backend writes any message it returns in a response body for the person who reads it", "(5) the backend may write any message it returns in a response body")));
e("E-ERR-10", "ERR", "data", "K9", "§ Hand-offs: the native confirms keep their copy again", (c) => c.design((t) => t.replace("The two native `confirm()` calls pass the index's New text as the string the browser shows", "The two native `confirm()` calls keep their copy until a flow change")));
e("E-ERR-11", "ERR", "data", "K10", "§ Errors: a note cites a line past the end of its file", (c) => c.row("A-09.09", { t: "Consequence first. See Login.tsx:99999." }));
e("E-ERR-12", "ERR", "data", "K10", "§ Errors: a note cites a file name that two files share", (c) => c.row("A-09.09", { t: "Consequence first. See index.ts:3." }));
e("E-ANC-1", "ANC", "data", "A1", "an anchor that cites the handler, with the label seven lines below it (the drift of A-11.59)", (c) => c.row("A-11.59", { m: "setSelectedInstructor(assignment.email)", ln: 1308 }));
e("E-ANC-2", "ANC", "data", "A1", "an ax on a row whose anchor already holds its text", (c) => c.row("A-09.23", { ax: "the label is drawn elsewhere" }));
e("E-ANC-3", "ANC", "data", "A1", "a one-word old text cited at a line where it is part of a longer label (the seventh review's tightening: Delete inside \"Delete chunk\")", (c) => c.row("A-24.08", { ln: 1648 }));
e("E-ANC-4", "ANC", "data", "A1", "a one-word old text cited at a line where it is part of another control's name (Account inside \"Account filters\")", (c) => c.row("A-11.03", { ln: 1413 }));
e("E-DT-1", "DATES", "data", "F6", "§ Dates: the example of a format removed", (c) => c.design((t) => t.split("1,234").join("1 234")));
e("E-DT-2", "DATES", "data", "F17", "§ Dates: the range picker's locale prop no longer goes away", (c) => c.design((t) => t.replace("the range picker's `locale` prop goes away", "the range picker's `locale` prop stays")));
e("E-TERM-1", "TERM", "data", "F7", "§ Terminology: the row for the plan's term \"allowlist\" removed", (c) => c.design((t) => t.replace(/^\| allowlist \| whitelist \|.*\n/m, "")));
e("E-TERM-2", "TERM", "data", "F18", "§ Terminology: the registered app's prompt is called instructions", (c) => c.row("A-08.20", { n: "Approve instructions so the app can use them for requests." }));
e("E-ERR-13", "ERR", "code", "H14", "§ Errors: a function that sends requests one after another and reports how it went, with no partial-result row", (c) => c.src("src/pages/Consent.tsx", `\nexport async function proofBatch(emails: string[]) {\n  const apiClient: any = {};\n  let ok = 0;\n  for (const email of emails) {\n    try {\n      await apiClient.classControllerEnroll({ email });\n      ok++;\n    } catch (e) {\n      void e;\n    }\n  }\n  setSnackbarMessage(\`Done \${ok}\`);\n}\n`));
e("E-DT-3", "DATES", "code", "H4", "§ Dates: a native date input in the source, not replaced by the DateTimeField", (c) => c.src("src/pages/Login.tsx", `\nexport const ProofDate = () => <input type="date" />;\n`));
e("E-STEP-1", "STEP", "data", "K3", "§ Step labels: a label missing from the classification", (c) => c.design((t) => t.replace('"Clicking for you" (SR-6.46), ', "")));
e("E-STEP-2", "STEP", "data", "K3", "§ Step labels: the fallback step loses its ellipsis", (c) => c.row("SR-6.49", { n: "Working" }));
e("E-STEP-3", "STEP", "data", "K3", "§ Step labels: \"Thinking…\" quoted as something other than the wait", (c) => c.design((t) => t.replace("- **The error row:**", '- **Stray:** a step shows "Thinking…" in its row.\n- **The error row:**')));
// the twelve defects of round 5 (the cross-section checks), kept so that the proof run is one run
e("E-K1-1", "XSEC", "guide", "K1", "an unlisted word in a twin cell", (c) => c.design((t) => t.replace('"Checking the page list", "Looking up your classes"', '"Checking the page list", "Hunting for your classes"')));
e("E-K1-2", "XSEC", "guide", "K1", "a stale declaration in doc-strings.json", (c) => c.json("doc-strings.json", (d) => { d.strings.push({ text: "A string nothing quotes", kind: "sample", why: "proof" }); return d; }));
e("E-K1-3", "XSEC", "guide", "K1", "an unlisted word in § Errors", (c) => c.design((t) => t.replace("**Kiwi once.** A cause line", '**Kiwi once.** "Sorry about that." A cause line')));
e("E-K1-4", "XSEC", "guide", "K1", "an unlisted word in a Voice hand-off", (c) => c.design((t) => t.replace("- **Implementation plan (CSS capitals):**", '- **Implementation plan (retry):** the button reads "Retry now".\n- **Implementation plan (CSS capitals):**')));
e("E-K2-1", "XSEC", "guide", "K2", "an unlisted word in the Companion's state table", (c) => c.design((t) => t.replace("| `walk` | Waiting for the first token", '| `walk` | Waiting ("Please hold on") for the first token')));
e("E-K2-2", "XSEC", "guide", "K2", "a committed line quotes a Phase 5 word with no row", (c) => c.design((t) => t.replace('("Thinking…" + dots, Phase 5 words)', '("Pondering…" + dots, Phase 5 words)')));
e("E-K6-1", "XSEC", "guide", "K6", "a cite of a kept row", (c) => c.design((t) => t.replace("(the kept entry in the A-14 `Copy (Phase 5)` bullet)", "(A-14.34)")));
e("E-K7-1", "XSEC", "data", "K7", "a supersession that supersedes nothing", (c) => c.row("DS.07", { o: "Kiwi is answering; Stop interrupts!" }));
e("E-E11-1", "XSEC", "data", "E11", "the n reference dropped from the Tests cell", (c) => c.journey((t) => t.replace("| 1 · AgentStepChain.test.tsx:80n |", "| - |")));
e("E-C14-src-1", "C14", "source", "H1", "C14: a placeholder that is an instruction, in the source", (c) => c.src("src/pages/Consent.tsx", `\nexport const proofPlaceholder = { placeholder: "Zebra enter the name here" };\n`));
e("E-C15-src-1", "C15", "source", "H1", "C15: an icon-only name that is a bare verb, in a repeated row of the source", (c) => c.src("src/pages/Consent.tsx", `\nexport const proofTitle = { title: "Remove" };\n`));
// the proofs of round 7
e("E-D12-1", "C16", "code", "D12", "C16: a call in the source that removes something and that no action lists", (c) => c.src("src/pages/Consent.tsx", `\nexport const proofRemove = () => (apiClient as any).classControllerRemoveEverything({});\n`));
e("E-D12-2", "C16", "data", "D12", "C16: the toast of a soft action says deleted", (c) => c.row("A-09.42", { n: "Webhook deleted" }));
e("E-D12-3", "C16", "data", "D12", "C16: a New row with a removal word that no action accounts for", (c) => c.row("A-01.10", { n: "Remove all classes" }));
e("E-D12-4", "C16", "data", "D12", "C16: an action whose backend evidence no longer holds", (c) => c.json("destructive-actions.json", (d) => { d.actions.find((a) => a.id === "webhook-deactivate").evidence = "isActive:\\s*true"; return d; }));
e("E-D12-5", "C16", "data", "D12", "C16: an archive that gives no reason for still being called delete", (c) => c.json("destructive-actions.json", (d) => { delete d.actions.find((a) => a.id === "material-delete").why; return d; }));
e("E-K1-5", "XSEC", "guide", "K1", "a rule that quotes a title no row has any more (C5's webhook title, before the webhook's Delete became a deactivate)", (c) => c.design((t) => t.replace('"Deactivate this webhook?", and the access heading on S-08', '"Delete this webhook?", and the access heading on S-08')));
e("E-K1-6", "XSEC", "guide", "K1", "a label in the terminology table's fallback column that no row or lookup has", (c) => c.design((t) => t.replace('| "Unknown user" |', '| "Unknown person" |')));
e("E-K11-1", "C16", "examples", "K11", "C16: a sample quotes a row that is neither verified, declared nor waiting on a step", (c) => c.json("rule-coverage.json", (d) => { delete d.examples.rows["A-16.04"]; return d; }));
e("E-K11-2", "C16", "examples", "K11", "C16: an entry that no sample quotes any more", (c) => c.json("rule-coverage.json", (d) => { d.examples.rows["A-01.01"] = { kind: "nonClaim", why: "a proof entry that no sample quotes" }; return d; }));
e("E-K11-3", "C16", "examples", "K11", "C16: a verified sample whose cite points past the end of its file", (c) => c.json("rule-coverage.json", (d) => { d.examples.rows["DS.22"].cite = "`CopyButton.tsx:99999`"; return d; }));
e("E-K11-4", "C16", "examples", "K11", "C16: a sample that waits on a hand-off step the Voice section does not state", (c) => c.json("rule-coverage.json", (d) => { d.examples.rows["SR-6.48"].needs = "a step nobody wrote"; return d; }));
e("E-K11-5", "C16", "examples", "K11", "C16: a voice sample quotes a row that nobody has verified (the sentence the seventh review took for unbacked)", (c) => c.design((t) => t.replace('"Kiwi repeated this step. It may be stuck."', '"Kiwi stopped because this took too many steps on the page."')));
e("E-K11-6", "C16", "examples", "K11", "C16: the hand-offs no longer state the step a sample waits on (the coverage table still repeats it, so the whole section would hide the gap)", (c) => c.design((t) => t.replace("the lookup matches the built-in search by its exact tool name", "the lookup stays as it is")));
e("E-G3-1", "XSEC", "guide", "G3", "the state-table intro calls the twins drafts, in bold (the seventh review's X5)", (c) => c.design((t) => t.replace("Text twins are final: Phase 5 revised them in place", "Text twins are **drafts**: Phase 5 revises them in place")));
e("E-G3-2", "XSEC", "guide", "G3", "a second claim that the twins are drafts, further down the Companion", (c) => c.design((t) => t.replace("### Motion controls", "The twins are drafts until Phase 5 finishes.\n\n### Motion controls")));
e("E-F23-1", "XSEC", "guide", "F23", "the tone rule no longer says that what happened comes first", (c) => c.design((t) => t.replace("What happened comes first, as the error formula has it, and the tone follows in the same line", "The tone comes first")));
e("E-F23-2", "XSEC", "data", "F23", "the webhook's confirmation title says delete again", (c) => c.row("A-09.08", { n: "Delete this webhook?" }));
e("E-F23-3", "XSEC", "data", "F23", "the file delete says what it removes in the old, vague words", (c) => c.row("A-14.26", { n: "\"{fileName}\" is deleted, along with everything Kiwi learned from it. You can't undo this." }));
e("E-F23-4", "XSEC", "guide", "F23", "the input error's anatomy no longer says that it opens with a statement of what is wrong (the tenth review refined the round-7 ruling)", (c) => c.design((t) => t.replace("An input error opens with a sentence that states what is wrong", "An input error states the rule")));
e("E-F23-5", "XSEC", "guide", "F23", "the step label that fits two kinds is no longer classified", (c) => c.design((t) => t.replace("Reading wins, because", "It is both, because")));
e("E-F23-6", "XSEC", "data", "F23", "the expired chat error no longer says what happens to the question", (c) => c.row("SR-6.13", { fix: "Sign in again." }));
e("E-E12-1", "XSEC", "data", "E12", "the index header states a count of references that the data does not have", (c) => c.journey((t) => t.replace("The Tests column holds ", "The Tests column holds 1 + ")));
// the proofs of the access-model follow-up (D13)
e("E-D13-1", "C16", "data", "D13", "C16: a New string that says who can act, listed in no claim", (c) => c.row("A-09.12", { n: "Ask your instructor to approve it." }));
e("E-D13-2", "C16", "data", "D13", "C16: a claim whose row no longer says who can act", (c) => c.row("S-02.05", { n: "No materials yet." }));
e("E-D13-3", "C16", "data", "D13", "C16: a row gated on the merge whose note does not say that it ships with or after it", (c) => c.row("S-01.07", { t: "Says who acts and when, because a student has no button to press." }));
e("E-D13-4", "C16", "data", "D13", "C16: a claim that no fact backs", (c) => c.json("access-claims.json", (d) => { d.claims.find((x) => x.id === "apps-student").facts = []; return d; }));
e("E-D13-5", "C16", "guide", "D13", "C16: § Errors no longer lists the gated row beside S-05.06", (c) => c.design((t) => t.replace('**The enrolment line depends on the same merge.** S-01.07 ("Your instructor', '**The enrolment line depends on the same merge.** The enrolment sentence ("Your instructor')));
e("E-D13-6", "C16", "guide", "D13", "C16: the hand-offs no longer state the rule that copy follows the access model built on fix/access-control", (c) => c.design((t) => t.replace("copy that says who can act follows the access model the user decided on 2026-10-16", "copy that says who can act follows today's menus, as decided on 2026-10-16")));
e("E-D13-7", "C16", "guide", "D13", "C16: the hand-offs no longer gate the row on the merge", (c) => c.design((t) => t.replace("ship S-05.06 and S-01.07 with or after the `fix/access-control` merge and the no-permission strings", "ship S-05.06 with or after the `fix/access-control` merge and the no-permission strings").replace("ship S-05.06 and S-01.07 with or after the merge, and draw A-12.09", "ship S-05.06 with or after the merge, and draw A-12.09")));
// the proofs of the eighth review
newRow("E-C4-new-6", "C4", "D3", V.status, "n", "Your instructor added {n} summary");
newRow("E-C4-new-7", "C4", "D3", V.label, "n", "\u2026 and {n} more pending users");
keptStr("E-C4-kept-4", "C4", "Your instructor added {n} summary.");
e("E-C9-new-6", "C9", "new", "D1", "C9: an error row whose why is empty outside the input-error form (the cause stated in the first clause)", (c) => c.row("S-05.16", { why: "" }));
e("E-C9-new-7", "C9", "new", "D1", "C9: S-05.04 as it was, opening with its cause and saying nothing about what happened", (c) => c.row("S-05.04", { what: "That email and password don't match.", why: "" }));
e("E-F24-1", "XSEC", "data", "F24", "the refused sign-in no longer opens with what happened", (c) => c.row("S-05.04", { what: "That email and password don't match.", why: "Check both." , fix: "Try again." }));
e("E-F24-2", "XSEC", "data", "F24", "the Tests rule no longer says what a containment reference is", (c) => c.journey((t) => t.replace("is a whole sentence of the old string or contains it", "is a sentence")));
e("E-F24-3", "XSEC", "guide", "F24", "§ Errors documents a cause-first exception again", (c) => c.design((t) => t.replace("**Anatomy.** Three parts", "**Anatomy.** (An authentication or permission row states the cause in the first clause.) Three parts")));
e("E-H13-1", "XSEC", "data", "H13", "one lookup row that lists both branches of a conditional (A-09.04 as it was)", (c) => c.row("A-09.04", { only: ["active", "inactive"] }));
// the proofs of the ninth review
e("E-F25-1", "XSEC", "data", "F25", "EM.21 drops the optional parenthesis that the email table and the backend template keep (the ninth review's MAJ-1)", (c) => c.row("EM.21", { n: "You've been added to {className} on Kiwi." }));
e("E-F25-2", "XSEC", "guide", "F25", "the email table writes a slot name that its row does not ({supportEmail} for {SUPPORT_EMAIL})", (c) => c.design((t) => t.replace('"Need help? Contact {SUPPORT_EMAIL}." when set', '"Need help? Contact {supportEmail}." when set')));
e("E-C1-code-2", "C1", "code", "H7", "C1: a test that asserts a CSS capital, not named in the hand-off", (c) => c.src("src/components/PrimaryButton/PrimaryButton.test.tsx", `\nexpect(button).toHaveStyle({ textTransform: "uppercase" });\n`));
// F13 and F26 read the mail's sentence itself; F25 holds the table and the index to each other, so a drift of both at once is F13's and F26's to catch
e("E-F13-3", "XSEC", "data", "F13", "EM.21 drops the optional parenthesis (F13 reads the mail's sentence, not only the table)", (c) => c.row("EM.21", { n: "You've been added to {className} on Kiwi." }));
e("E-F26-1", "XSEC", "data", "F26", "EM.21 and the email table both drop the optional parenthesis, so the two agree (the drift F25 cannot see)", (c) => { c.row("EM.21", { n: "You've been added to {className} on Kiwi." }); c.design((t) => t.replace("{className}{ ({professorName})} on Kiwi.", "{className} on Kiwi.")); });
e("E-F26-2", "XSEC", "data", "F26", "EM.21's note cites a template line that does not write the instructor's name only when it is set", (c) => c.json("revisions/08-email.json", (d) => { const r = d.find((g) => g.id === "EM").rows[20]; r.t = r.t.replace("`:120`", "`:119`"); return d; }));
e("E-F26-3", "XSEC", "data", "F26", "the sidebar label says \"My classes\" again", (c) => c.row("SR-3.01", { n: "My classes" }));
e("E-F26-4", "XSEC", "data", "F26", "DS.29 no longer says whose account lacks access", (c) => c.row("DS.29", { n: "You don't have permission to view this page" }));
e("E-F26-5", "XSEC", "guide", "F26", "C3 no longer lists the ISO dates of machine files", (c) => c.design((t) => t.replace("ISO dates (`YYYY-MM-DD`) in machine files, in the file name and inside the file; ", "")));
e("E-F26-6", "XSEC", "guide", "F26", "§ Dates, times and numbers gains a format (an audit log's seconds in a date and time) that C3 does not list", (c) => c.design((t) => t.replace("| Machine files | `YYYY-MM-DD` |", "| Audit time | `D MMM YYYY, HH:mm:ss` | 17 Oct 2026, 14:05:09 | |\n| Machine files | `YYYY-MM-DD` |")));
e("E-F26-7", "XSEC", "guide", "F26", "a finding after SEC-1 says more than that it is a security finding", (c) => c.journey((t) => t.replace("| SEC-2 | A security finding, found", "| SEC-2 | A security finding with a description, found")));
e("E-F26-8", "XSEC", "guide", "F26", "a finding after SEC-1 has no severity", (c) => c.journey((t) => t.replace("| SEC-2 | A security finding, found from source on 2026-10-17. | **Medium** |", "| SEC-2 | A security finding, found from source on 2026-10-17. | Medium |")));
// P2 reads a private list that is not in the repository, so each proof plants a list into its copy, with a harmless made-up phrase, and then plants the phrase. The phrase is built
// here and is never written whole in this file: the file is copied with the rest, and a literal would make every one of these proofs fail for what the copy already holds. The
// control (E-P2-0) plants the list and no phrase, and P2 must stay quiet: that is what shows the others are caught for what they plant.
const PLANT = ".design-foundations/build/security-phrases.txt";
const ZEBRA = ["zebra", "security", "phrase"].join("-");
const plantList = (c) => c.create(PLANT, `# planted by the proof\n${ZEBRA}\n`);
e("E-P2-0", "SEC", "guide", "!P2", "the private list is present and no phrase is planted: P2 stays quiet, so the proofs below are caught for what they plant and never for what the copy already holds", (c) => plantList(c));
e("E-P2-1", "SEC", "guide", "P2", "a phrase of the private list in DESIGN.md", (c) => { plantList(c); c.design((t) => `${t}\nThe ${ZEBRA} is here.\n`); });
e("E-P2-2", "SEC", "data", "P2", "a phrase of the private list in a revision note, in capitals (the match is case-blind)", (c) => { plantList(c); c.row("A-09.12", { t: `A note with the ${ZEBRA.toUpperCase()} in it.` }); });
e("E-P2-3", "SEC", "guide", "P2", "a phrase of the private list in JOURNEY.md", (c) => { plantList(c); c.journey((t) => `${t}\nThe ${ZEBRA} is here.\n`); });
e("E-P2-4", "SEC", "code", "P2", "a phrase of the private list in a generated file", (c) => { plantList(c); c.json("generated/revisions.json", (d) => { d.planted = ZEBRA; return d; }); });
e("E-P2-5", "SEC", "code", "P2", "a phrase of the private list in a script of the copy directory", (c) => { plantList(c); c.copyEdit("scan-ts.mjs", (t) => `${t}\n// ${ZEBRA}\n`); });
// the proofs of the tenth review
// C-1: an input error opens with a statement of what is wrong, never with the correction (D1)
e("E-C9-new-8", "C9", "new", "D1", "C9: DS.45 as it was, an input error that opens with the correction", (c) => c.row("DS.45", { what: "Enter a date like 17 Oct 2026." }));
e("E-C9-new-9", "C9", "new", "D1", "C9: an input error whose first sentence is an instruction (\"Write a message.\")", (c) => c.row("A-04.22", { what: "Write a message." }));
e("E-C9-new-10", "C9", "new", "D1", "C9: an input error whose first sentence states nothing (\"A name.\")", (c) => c.row("A-07.47", { what: "A name." }));
e("E-C9-new-11", "C9", "new", "D1", "C9: an input error that opens with \"Ensure …\", an instruction that still carries a verb of state", (c) => c.row("A-04.21", { what: "Ensure the subject is not empty." }));
// C-2: a string the code builds with a conditional piece is more than one text, and a row's Old is one whole text (A1, H13, E9). The with-address text and the text without an address are
// two readings of GoogleRedirectHandler.tsx:57 and :64; S-07.04 and S-07.05 once carried the first as their Old, and the second had no row.
const OLD_SEVEN04 = { o: "Cannot get email from Google account. Please contact {SUPPORT_EMAIL}.", m: "Cannot get email from Google account." };
const OLD_SEVEN05 = { o: "Login failed. Please contact {SUPPORT_EMAIL}.", m: "Login failed." };
e("E-A1-tpl-1", "XSEC", "data", "A1", "an Old that is only the front of one text a conditional template draws (a fragment, no reading)", (c) => c.row("S-07.05", { o: "Login failed. Please contact", m: "Login failed." }));
e("E-A1-tpl-2", "XSEC", "data", "A1", "S-07.04 as it was: the variant without an address, with the Old of the text that names one (it drops {SUPPORT_EMAIL})", (c) => c.row("S-07.04", OLD_SEVEN04));
e("E-A1-tpl-3", "XSEC", "data", "A1", "A-11.16 as it was: the all-added line, with the Old of the line that counts failures (it drops {m})", (c) => c.row("A-11.16", { o: "Added {n} users to whitelist. {m} failed." }));
e("E-H13-tpl-1", "XSEC", "data", "H13", "S-07.04 as it was: the text with no address has no row of its own while the text with one has", (c) => c.row("S-07.04", OLD_SEVEN04));
e("E-H13-tpl-2", "XSEC", "data", "H13", "the sign-in headline when the user has no name has no row (the greeting's other text)", (c) => c.dropRow("S-01.09"));
e("E-H13-tpl-3", "XSEC", "data", "H13", "the approval tooltip when no time is on record has no row (the text with a date has one)", (c) => c.dropRow("A-08.78"));
e("E-H13-tpl-4", "XSEC", "data", "H13", "the lecture-scoped subtitle has no row (the unscoped one has)", (c) => c.dropRow("A-18.39"));
e("E-E9-tpl-1", "XSEC", "data", "E9", "S-07.05 as it was: a test asserts \"Login failed.\", one text of the template, and no row has it as its Old", (c) => c.row("S-07.05", OLD_SEVEN05));
e("E-E9-tpl-2", "XSEC", "data", "E9", "S-07.04 as it was: a test asserts the text with no address and no row has it as its Old", (c) => c.row("S-07.04", OLD_SEVEN04));
e("E-E9-sent-1", "XSEC", "data", "E9", "a test asserts \"Login failed.\", a whole sentence of S-07.03's Old (12 characters), and S-07.03's Tests cell does not list it", (c) => c.journey((t) => t.replace(/(\| `S-07\.03` \|[^\n]*\| C9, C17 \| )2 · GoogleRedirectHandler\.test\.tsx:183m,201m \|/, "$1- |")));
// the other statements of the tenth review (F27)
e("E-F27-1", "XSEC", "data", "F27", "the generic sign-in fallback points at the password again", (c) => c.row("S-05.03", { fix: "Check your email and password, then try again, or ask your administrator to reset your password." }));
e("E-F27-2", "XSEC", "data", "F27", "the instructor's empty class list no longer says who acts", (c) => c.row("SR-1.10", { n: "No classes assigned to you yet" }));
e("E-F27-3", "XSEC", "guide", "F27", "the Voice section names an archetype again", (c) => c.design((t) => t.replace("The register is measured and precise, and warm only by being clear.", "The register is the Sage structure (measured, precise).")));
e("E-F27-4", "XSEC", "data", "F27", "SR-5.03 cites the branding rule before its content principle", (c) => c.row("SR-5.03", { r: "C17,C6" }));
e("E-F27-5", "XSEC", "data", "F27", "A-20.28 says only that the setup breaks one of the rules", (c) => c.row("A-20.28", { why: "The setup breaks one of the rules." }));
e("E-F27-6", "XSEC", "data", "F27", "DS.47 opens with the correction again", (c) => c.row("DS.47", { what: "Enter a time like 14:05." }));
e("E-F27-7", "XSEC", "data", "F27", "S-07.04's rationale is garbled again", (c) => c.row("S-07.04", { t: "When SUPPORT_EMAIL is empty (S-07.02 is the variant for a configured address)." }));
export const E2E = E;
