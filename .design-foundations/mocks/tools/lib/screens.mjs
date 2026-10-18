// The six Phase 7 screens, composed from kiwi-ui/JOURNEY.md's page specs (regions in their as-is order) and
// kiwi-ui/DESIGN.md's components. ctx: { theme: "light"|"dark", mode: "gated"|"preview", url(p) → the page's URL
// for assets/<p> }. In "preview" mode the controls that would sign in, change who can access a class or send email
// are drawn disabled with the Phase 3 reason pattern (preview chrome words); the gated renders never carry them.
import { esc, nextId, button, iconButton, statusChip, roleChip, filterChip, checkbox, switchCtl, field, launcher, topBar, mi, si } from "./ui.mjs";
import { t, q, kept, asis, doc, brand, data, spec, cellNo } from "./copy.mjs";
import { still, cell, CLIPS, STATES, STILLS, AVATAR_STILL, REST, drawings } from "./mascot.mjs";
import * as D from "./demo.mjs";

export const PREVIEW_REASON = "Not available in this preview"; // preview chrome only; never in a gated render
const blocked = (ctx) => (ctx.mode === "preview" ? { disabled: true, why: PREVIEW_REASON } : {});

// ---------------------------------------------------------------- shared pieces
const logoInline = (ctx) => `<span class="logo-mark" role="img" aria-label="${esc(brand("INSTITUTION_NAME"))}"><img src="${ctx.url("brand/kiwi-mark.svg")}" alt="" width="28" height="28"><span class="logo-text" aria-hidden="true">${esc(brand("INSTITUTION_NAME"))}</span></span>`;
const studentTabs = (current) => `<nav class="classbar"><div class="tabs" role="tablist">${[["materials", kept("SR-2", "Materials"), "chat"], ["scratchpad", kept("SR-2", "Scratchpad"), "code"]]
  .map(([k, label, nav]) => `<a class="tab" role="tab" href="#" aria-selected="${current === k}" data-nav="${nav}">${esc(label)}</a>`).join("")}</div></nav>`;

const SIDEBAR = () => ({
  system: [
    ["SupervisorAccountOutlined", t("SR-3.02")], ["StackedBarChartOutlined", t("SR-3.03")], ["EmailOutlined", t("SR-3.04")], ["MarkEmailReadOutlined", t("SR-3.05")],
    ["FlagOutlined", t("SR-3.06")], ["DnsOutlined", t("SR-3.07")], ["AppsOutlined", t("SR-3.08")], ["WebhookOutlined", kept("SR-3", "Webhooks")], ["ApprovalOutlined", t("SR-3.09")],
  ],
  classItems: [
    ["edit-class", t("SR-3.10")], ["materials", kept("SR-3", "Materials")], ["class-flags", t("SR-3.11")], ["class-mcp", t("SR-3.12")], ["class-apps", t("SR-3.13")],
    ["enroll-students", t("SR-3.14")], ["class-email", t("SR-3.15")], ["class-analytics", t("SR-3.16")], ["experiments", kept("SR-3", "Experiments")],
  ],
});
function sidebar(current) {
  const s = SIDEBAR();
  const child = ([key, label]) => `<li><a class="side-item child" href="#" data-nav="${key}"${key === current ? ` aria-current="page"` : ""}>${key === current ? `<span class="cdot" aria-hidden="true"></span>` : ""}${esc(label)}</a></li>`;
  const sys = s.system.map(([icon, label]) => `<li><a class="side-item" href="#">${mi(icon)}${esc(label)}</a></li>`).join("");
  return `<nav class="sidebar" aria-label="${esc(kept("SR-3", "Classes"))}"><ul class="side-list"><li><a class="side-item parent" href="#" aria-expanded="true">${mi("SchoolOutlined")}${esc(kept("SR-3", "Classes"))}${mi("ExpandLessOutlined", "ic exp")}</a><ul>${s.classItems.map(child).join("")}</ul></li>${sys}</ul><div class="side-foot">${iconButton(kept("SR-3", "Collapse admin navigation"), "MenuOpenOutlined", { act: "collapse" })}</div></nav>`;
}

/** The class card (S-01, A-13's preview): one sheet; the cover is the class image or the mascot fallback (TD-04). */
function classCard(ctx, c, opts = {}) {
  const cover = c.cover
    ? `<img src="${ctx.url(`covers/${c.cover}`)}" alt="" width="400" height="152">`
    : still("idle", 64, { url: ctx.url });
  const who = c.instructor ? esc(data(c.instructor)) : esc(t("S-01.03"));
  const tag = opts.static ? "div" : "a";
  const linkAttrs = opts.static ? "" : ` href="#" aria-label="${esc(kept("S-01", "Open {title}", { title: c.title }))}" data-nav="${c.nav || "chat"}"`;
  return `<${tag} class="class-card"${linkAttrs}><span class="cover">${cover}</span><span class="body"><span class="title t-group-title">${esc(data(c.title))}</span><span class="who">${who}</span></span></${tag}>`;
}

// ---------------------------------------------------------------- S-05 sign-in
export function signIn(ctx) {
  const pv = ctx.mode === "preview";
  const inert = pv ? nextId("why") : null;
  const reasonEl = pv ? `<span class="toggletip inline" id="${inert}" role="note">${esc(PREVIEW_REASON)}</span>` : "";
  const signInBtn = button(t("S-05.07"), "primary", { cls: "full", act: "sign-in", ...(pv ? { disabled: true, why: PREVIEW_REASON } : {}) });
  return `<main class="signin" data-density="comfortable">
  <aside class="signin-aside" aria-label="${esc(kept("SR-5", "About Kiwi"))}">
    <div class="ruled aside-col"><p class="kiwi-wordmark wm tk">${esc(brand("wordmark"))}</p><div class="what"><p class="t-deck tk">${esc(t("SR-5.01"))}</p><p class="t-secondary tk">${esc(t("SR-5.03"))}</p></div></div>
  </aside>
  <section class="signin-form" aria-labelledby="signin-h">
    <div class="phone-logo">${logoInline(ctx)}</div>
    <div class="ruled">
      <span class="slot signin-slot">${still("idle", 96, { url: ctx.url, ink: true, slotVar: "var(--signin-slot)" })}</span>
      <h1 class="t-display tk" id="signin-h">${esc(t("S-05.01"))} <span class="kiwi-wordmark">${esc(brand("wordmark"))}</span></h1>
      <p class="sub tk">${esc(t("S-05.02"))}</p>
      <form novalidate onsubmit="return false">
        ${field({ label: kept("S-05", "Email"), value: pv ? "" : data(D.SIGNIN_EMAIL), type: "email", readOnly: pv, inert, id: "email" })}
        <div class="pw">${field({ label: kept("S-05", "Password"), value: "", type: "password", focus: !pv, readOnly: pv, inert, id: "password" }).replace('</div></div>', `${iconButton(kept("S-05", "Show password"), "VisibilityOutlined", { act: "show-password" })}</div></div>`)}</div>
        ${reasonEl}
        ${signInBtn}
      </form>
      <p class="foot tk">${esc(t("S-05.13"))}</p>
    </div>
  </section>
</main>`;
}

// ---------------------------------------------------------------- S-01 course list
export function courseList(ctx) {
  return `<div class="app" data-density="comfortable">
${topBar({ role: "student", url: ctx.url, theme: ctx.theme, menuHidden: ctx.mode === "preview", menuOpen: false })}
<main class="courses">
  <h1 class="t-display-lg">${esc(t("S-01.01"))}</h1>
  <ul class="class-grid">${D.CLASSES.map((c) => `<li>${classCard(ctx, c)}</li>`).join("")}</ul>
</main>
${launcher()}
</div>`;
}

// ---------------------------------------------------------------- SR-6 chat pieces
// drawing: a cell of the state's clip; "rest": the resting drawing from the loaded atlas (after a turn has started);
// undefined: the standing still (a page load, before any atlas)
const avatar = (ctx, state, drawing) => drawing === "rest" ? cell(REST.atlas, REST.cell, 32, 64, { url: ctx.url }) : drawing === undefined ? still(AVATAR_STILL[state], 32, { url: ctx.url, as: state }) : cell(CLIPS[state].atlas, drawing, 32, 64, { url: ctx.url });
function feedback(ctx, chosen) {
  const regen = nextId("why"), share = nextId("why");
  const up = chosen === "up", down = chosen === "down";
  return `<span class="feedback">`
    + `<span class="ctl-wrap"><button type="button" class="tb-btn" aria-label="${esc(t("SR-6.38"))}" title="${esc(t("SR-6.38"))}" aria-disabled="true" aria-describedby="${regen}">${mi("CachedOutlined")}</button><span class="toggletip right" id="${regen}" role="tooltip">${esc(t("DS.09"))}</span></span>`
    + `<button type="button" class="tb-btn" aria-label="${esc(asis("SR-6", "Flag this answer"))}" title="${esc(asis("SR-6", "Flag this answer"))}" data-act="flag">${mi("FlagOutlined")}</button>`
    + `<button type="button" class="tb-btn" aria-label="${esc(kept("SR-6", "Thumbs up"))}" title="${esc(kept("SR-6", "Thumbs up"))}" aria-pressed="${up}" data-act="like">${mi(up ? "ThumbUp" : "ThumbUpOutlined")}</button>`
    + `<button type="button" class="tb-btn" aria-label="${esc(kept("SR-6", "Thumbs down"))}" title="${esc(kept("SR-6", "Thumbs down"))}" aria-pressed="${down}" data-act="dislike">${mi(down ? "ThumbDown" : "ThumbDownOutlined")}</button>`
    + `<span class="ctl-wrap"><button type="button" class="tb-btn" aria-label="${esc(kept("SR-6", "Share answer"))}" title="${esc(kept("SR-6", "Share answer"))}" aria-disabled="true" aria-describedby="${share}">${mi("ShareOutlined")}</button><span class="toggletip right" id="${share}" role="tooltip">${esc(t("DS.10"))}</span></span>`
    + `</span>`;
}
/** A tutor row. blocks: html strings, each a ticked block; meta: html of the toolbar line (or ""). */
function tutorRow(ctx, { state = "idle", drawing, blocks = [], meta = "", attrs = "" }) {
  return `<div class="row tutor-row" data-companion="${state}"${attrs}>${avatar(ctx, state, drawing)}<div class="ans">${blocks.join("")}${meta}</div></div>`;
}
const userRow = (text, cls = "") => `<div class="row user-row"><p class="tk${cls ? " " + cls : ""}">${text}</p></div>`;
const welcome = (ctx) => tutorRow(ctx, { state: "idle", blocks: [`<p class="tk">${esc(t("SR-6.01"))}</p>`], attrs: ` data-welcome="true"` });
function metaLine(ctx, { cite, chosen } = {}) {
  const c = cite ? `<button type="button" class="cite" data-act="cite">${esc(asis("SR-6", "[Page N]", {}, { N: cite }))}</button>` : "";
  return `<div class="meta tk">${c}${feedback(ctx, chosen)}</div>`;
}
/** The composer (compact chrome): the model select, the field, Send (the panel's one filled control) or Stop. */
function composer(ctx, o = {}) {
  const pv = ctx.mode === "preview";
  const fieldId = nextId("c");
  const whyId = o.why ? nextId("why") : null;
  const statusId = o.offline ? nextId("st") : null;
  const status = o.offline ? `<p class="status-line" role="status" id="${statusId}">${si("triangle")}${esc(q("CP.10"))}</p>` : "";
  const peek = o.peek !== undefined ? `<span class="peek">${o.peek}</span>` : ""; // anchored to the field (SR-6 (2), companion.slot.peek)
  const model = !o.model ? "" : `<div class="model">${field({ label: asis("SR-6", "Model"), value: asis("SR-6", "ChatGPT"), kind: "select" })}</div>`;
  const textarea = `<div class="control multiline${o.focus ? " is-focus" : ""}${o.disabled ? " is-disabled" : ""}"><textarea id="${fieldId}" rows="2" aria-label="${esc(t("SR-6.02"))}" placeholder="${esc(t("SR-6.02"))}"${o.disabled ? ` aria-disabled="true" readonly` : ""}${whyId || statusId ? ` aria-describedby="${whyId || statusId}"` : ""} data-act="composer">${o.text ? esc(data(o.text)) : ""}</textarea>${peek}</div>`;
  const send = o.stop
    ? `<button type="button" class="btn btn-secondary" aria-label="${esc(t("DS.08"))}" data-act="stop">${esc(doc("DS.08", "Stop"))}</button>`
    : `<button type="button" class="send" aria-label="${esc(t("SR-6.03"))}" title="${esc(t("SR-6.03"))}" data-act="send">${mi("SendOutlined")}</button>`;
  const why = whyId ? `<p class="why" id="${whyId}">${esc(o.why)}</p>` : "";
  return `<div class="composer" data-density="compact">${status}${model}<div class="row-input">${textarea}${send}</div>${why}</div>`;
}
function chatHead(ctx) {
  return `<header class="chat-head" data-density="compact"><h2 class="t-section-title" id="chat-title">${esc(t("SR-6.26"))}</h2><span class="icon-row">`
    + `<span class="chat-modes">` + iconButton(t("SR-6.27"), "WebAssetOutlined", { pressed: false, act: "mode:modal" })
    + iconButton(t("SR-6.29"), "ViewSidebarOutlined", { pressed: false, act: "mode:side" })
    + iconButton(t("SR-6.31"), "DockOutlined", { pressed: true, act: "mode:snap" })
    + iconButton(t("SR-6.32"), "FullscreenOutlined", { pressed: false, act: "mode:fullscreen" }) + `</span>`
    + iconButton(t("SR-6.34"), "CloseOutlined", { act: "close-chat" })
    + `</span></header>`
    + `<div class="chat-session" data-density="compact">${iconButton(kept("SR-6", "Chat history"), "HistoryOutlined", { expanded: false, act: "history" })}<span class="now t-label">${esc(t("SR-6.05"))}</span>${iconButton(kept("SR-6", "New chat"), "AddOutlined", { act: "new-chat" })}${iconButton(kept("SR-6", "Chat history"), "ExpandMoreOutlined", { expanded: false, act: "history" })}</div>`;
}
/** The main conversation of the chat mock: welcome, a question with a CJK clause, a complete answer. */
function conversation(ctx) {
  const A = D.ANSWER;
  const codeActions = `<span class="code-actions" role="group" aria-label="${esc(t("SR-6.64"))}"><button type="button" class="tb-btn" aria-label="${esc(t("SR-6.40"))}" title="${esc(t("SR-6.40"))}" data-act="import">${mi("InputOutlined")}</button><button type="button" class="tb-btn" aria-label="${esc(t("DS.12"))}" title="${esc(t("DS.12"))}" data-act="copy">${mi("ContentCopyOutlined")}</button></span>`;
  return welcome(ctx)
    + userRow(A.question, "cjk-mixed")
    + tutorRow(ctx, {
      state: "idle",
      blocks: [
        `<p class="tk">${A.p1}</p>`,
        `<p class="tk">${A.p2}</p>`,
        `<pre class="code-block tk">${codeActions}<code>${A.code}</code></pre>`,
        `<div class="math tk" tabindex="0">${A.math}</div>`,
        `<p class="tk cjk" lang="zh-Hans">${A.cjk}</p>`,
        `<p class="tk">${A.p3}</p>`,
      ],
      meta: metaLine(ctx, { cite: 3 }),
      attrs: ` data-newest="true"`,
    });
}

// ---------------------------------------------------------------- S-02 + SR-6: the chat screen
function materialsPage(ctx, opts) {
  const files = D.FILES.map((f, i) => `<li><a class="file-row" href="#"${i === D.FILE_CURRENT ? ` aria-current="true"` : ""}>${mi("DescriptionOutlined")}<span class="name">${esc(data(f))}</span>${i === D.FILE_CURRENT ? si("check") : ""}</a></li>`).join("");
  const bar = `<div class="pdf-bar" data-density="compact"><span class="fname t-label">${esc(data(D.FILES[D.FILE_CURRENT]))}</span><span class="spacer"></span><span class="chip chip-info">${esc(t("DS.11"))}</span><span class="sep" aria-hidden="true"></span>`
    + iconButton(t("S-02.09"), "NavigateBeforeOutlined", { act: "prev-page" }) + `<span class="lbl t-caption tnum">${esc(data("3 / 12"))}</span>` + iconButton(t("S-02.10"), "NavigateNextOutlined", { act: "next-page" })
    + `<span class="sep" aria-hidden="true"></span>` + iconButton(t("S-02.11"), "ZoomOutOutlined", { act: "zoom-out" }) + `<span class="lbl t-caption tnum">${esc(data("100%"))}</span>` + iconButton(t("S-02.12"), "ZoomInOutlined", { act: "zoom-in" })
    + `<span class="sep" aria-hidden="true"></span>` + iconButton(t("S-02.13"), "CropFreeOutlined", { act: "fullscreen" }) + `</div>`;
  return `<div class="page">
${topBar({ role: "student", url: ctx.url, theme: ctx.theme, menuHidden: ctx.mode === "preview", classLabel: D.CLASS.title, menuOpen: opts.menuOpen, themeChoice: ctx.theme })}
${studentTabs("materials")}
<div class="materials">
  <div class="rail" data-density="compact">${iconButton(t("S-02.01"), "FolderOutlined", { pressed: true, act: "drawer" })}</div>
  <section class="drawer" data-density="compact" aria-labelledby="dr-title">
    <div class="drawer-head"><h2 class="t-label" id="dr-title">${esc(t("S-02.02"))}</h2>${iconButton(kept("S-02", "Close"), "CloseOutlined", { act: "drawer" })}</div>
    <div class="drawer-filters">${filterChip(kept("S-02", "Lecture"), true, { act: "filter" })}${filterChip(kept("S-02", "Recitation"), false, { act: "filter" })}</div>
    <ul class="drawer-files">${files}</ul>
  </section>
  <section class="viewer">${bar}<div class="pdf-canvas"><div class="paper in-context"><img src="${ctx.url("paper/lecture-3-page-3.webp")}" alt="" width="640" height="360"></div><div class="paper"><img src="${ctx.url("paper/lecture-3-page-4.webp")}" alt="" width="640" height="360"></div></div></section>
</div>
</div>`;
}
/** The chat panel (SR-6) with the conversation; in the preview it is one global element, docked or floating. */
export function chatPanel(ctx) {
  const grip = `<span class="grip chat-grip" role="separator" aria-orientation="vertical" aria-label="${esc(t("SR-6.35"))}" aria-valuenow="420" aria-valuemin="320" aria-valuemax="800" tabindex="0" data-act="resize-panel"></span>`;
  return `<aside class="chat" aria-labelledby="chat-title">${grip}${chatHead(ctx)}<div class="msgs end" data-density="comfortable" aria-live="polite" tabindex="0" aria-labelledby="chat-title"><div class="msgs-flow">${conversation(ctx)}</div></div>${composer(ctx, {})}</aside>`;
}
export function chat(ctx, opts = {}) {
  if (ctx.mode === "preview") return `<div class="screen" data-density="comfortable">${materialsPage(ctx, { menuOpen: false })}</div>`;
  return `<div class="screen snap" data-density="comfortable">${materialsPage(ctx, { menuOpen: true })}${chatPanel(ctx)}</div>${frameStrip(ctx)}`;
}

// ---------------------------------------------------------------- the frame strip (DW-7.4): nine product crops
function frameStrip(ctx) {
  const F = D.FRAME;
  const older = tutorRow(ctx, { state: "idle", blocks: [`<p class="tk">${esc(data(F.older))}</p>`], meta: metaLine(ctx, {}) });
  const ask = userRow(esc(data(F.question)));
  const newest = ` data-newest="true"`;
  const thinking = (drawing) => tutorRow(ctx, { state: "walk", drawing, blocks: [`<p class="tk wait">${esc(t("SR-6.69", { dots: "…" }))}</p>`], attrs: newest });
  const streaming = (drawing, text) => tutorRow(ctx, { state: "speaking", drawing, blocks: [`<p class="tk">${esc(data(text))}</p>`], attrs: newest });
  const done = (state, drawing, chosen) => tutorRow(ctx, { state, drawing, blocks: [`<p class="tk">${esc(data(F.answer))}</p>`], meta: metaLine(ctx, { chosen }), attrs: newest });
  const busy = { stop: true, disabled: true, why: t("DS.07"), model: false };
  const handedBack = { model: false, focus: true }; // the app hands focus back to the composer at completion
  // The chat avatar sequence of one turn on one 24 Hz clock from the send (DESIGN.md § Companion, amended 2026-10-18):
  // the run starts at cell 0, the first token arrives at 1.6 s (tick 38: cell 19) and changes the words, not the drawing,
  // the stream continues the same loop (2.4 s: cell 4), completion enters the hop at the next tick, the hop lands on the
  // standing still, and idle is that same drawing.
  const SEQUENCE = [
    { step: "idle", state: "idle", words: ["the standing still"], rows: userRow(D.ANSWER.question, "cjk-mixed") + older, comp: { text: F.question, model: false } },
    { step: "send", state: "walk", drawing: 0, words: ["from cell 0 at the send"], rows: older + ask + thinking(0), comp: busy },
    { step: "run", state: "walk", drawing: 8, words: ["2.0 s loop"], rows: older + ask + thinking(8), comp: busy, film: "walk" },
    { step: "first token", state: "speaking", drawing: 19, words: ["the same loop: no change in the drawing"], rows: older + ask + streaming(19, F.answer.split(" ")[0]), comp: busy },
    { step: "streaming", state: "speaking", drawing: 4, words: ["no restart and no cut at the first token"], rows: older + ask + streaming(4, F.partial), comp: busy },
    { step: "complete", state: "hop", drawing: 0, words: ["entered at the next tick after completion"], rows: older + ask + done("hop", 0), comp: handedBack },
    { step: "flight", state: "hop", drawing: 12, words: ["flight 9-16"], rows: older + ask + done("hop", 12), comp: handedBack, film: "hop" },
    { step: "landed", state: "hop", drawing: 23, words: ["it lands on 23, the standing still"], rows: older + ask + done("hop", 23), comp: handedBack },
    { step: "idle", state: "idle", words: ["the same drawing: no cut"], rows: older + ask + done("idle", "rest"), comp: handedBack },
  ];
  // The moments outside the run, one frame each: the composer peek and its retract, the like's wave, and the two
  // conditions, which play nothing and stand.
  const MOMENTS = [
    { state: "peek", words: ["stamp-peek", "2.33 s"], rows: older + ask + done("idle", "rest"), comp: { text: F.typing, focus: true, model: false, peek: cell("stamp-peek", 23, 48, 96, { url: ctx.url, cls: "is-peek" }) }, film: "peek" },
    { state: "retract", words: ["stamp-peek", "2.33 s"], rows: older + ask + done("idle", "rest"), comp: { text: F.typing, model: false, peek: cell("stamp-peek", 10, 48, 96, { url: ctx.url, cls: "is-peek" }) }, film: "retract" },
    { state: "wave", words: ["full-wave-bow", "2.13 s", "cell 8, the wing at its highest"], rows: older + ask + done("wave", 8, "up"), comp: { model: false }, film: "wave" },
    { state: "error", words: ["the run cuts to the standing still"], rows: older + ask + tutorRow(ctx, { state: "error", drawing: "rest", blocks: [`<div class="err-row tk" role="alert">${si("cross")}<div><p>${esc(t("SR-6.21"))}</p>${button(t("DS.18"), "secondary", { act: "retry" })}</div></div>`], attrs: newest }), comp: { model: false } },
    { state: "offline", words: ["the standing still"], rows: older + ask + tutorRow(ctx, { state: "offline", drawing: "rest", blocks: [`<p class="tk pending">${esc(q("CP.11"))}</p>`], attrs: newest }), comp: { offline: true, stop: true, disabled: true, model: false } },
  ];
  const drawingCap = (f) => {
    if (f.drawing === undefined) return "";
    const atlas = CLIPS[f.state].atlas;
    return `<span>${esc(spec(atlas))}</span><span class="cellno">${esc(cellNo(f.drawing))}</span>`;
  };
  const film = (state) => {
    const clip = CLIPS[state]; const rest = STILLS[clip.still];
    return `<span class="film">${drawings(state, 8).map((c) => `<span class="cellbox${rest.atlas === clip.atlas && c === rest.cell ? " is-still" : ""}">${cell(clip.atlas, c, 48, 128, { url: ctx.url })}<span class="n">${esc(cellNo(c))}</span></span>`).join("")}</span>`;
  };
  const frame = (f, i) => `<figure class="frame" data-state="${f.state}"${f.step ? ` data-step="${esc(f.step)}"` : ""} data-annotation-frame="true">
  <div class="chat" inert><div class="msgs" data-density="comfortable">${f.rows}</div>${composer(ctx, f.comp)}</div>
  <figcaption data-annotation="true"><span class="frame-cap"><span class="name">${esc(spec(f.step || f.state))}</span>${f.step && f.step !== f.state ? `<span class="state">${esc(spec(f.state))}</span>` : ""}${drawingCap(f)}${f.words.map((w) => `<span>${esc(spec(w))}</span>`).join("")}</span>${f.film ? film(f.film) : ""}</figcaption>
</figure>`;
  return `<section class="strip" aria-labelledby="strip-h" data-annotation="true">
  <div class="strip-head"><h2 class="t-section-title" id="strip-h">${esc(spec("The nine states"))}</h2><p>${esc(spec("Only the newest tutor message's avatar animates; older avatars hold their still."))}</p></div>
  <p class="strip-label" id="strip-seq">${esc(spec("the chat avatar sequence"))}</p>
  <ol class="frames seq" aria-labelledby="strip-seq">${SEQUENCE.map((f, i) => `<li>${frame(f, i)}</li>`).join("\n")}</ol>
  <div class="frames moments">${MOMENTS.map(frame).join("\n")}</div>
</section>`;
}

// ---------------------------------------------------------------- S-03 code page
export function code(ctx) {
  const lines = D.CODE;
  const gutter = lines.map((_, i) => `<span class="${i === D.CODE_ACTIVE ? "on" : ""}">${i + 1}</span>`).join("<br>");
  const body = lines.map((l, i) => `<span class="ln${i === D.CODE_ACTIVE ? " on" : ""}">${l || " "}${i === D.CODE_ACTIVE ? `<span class="caret" aria-hidden="true"></span>` : ""}</span>`).join("");
  return `<div class="app" data-density="comfortable">
${topBar({ role: "student", url: ctx.url, theme: ctx.theme, menuHidden: ctx.mode === "preview", classLabel: D.CLASS.title })}
${studentTabs("scratchpad")}
<main class="ide">
  <div class="ide-col">
    <div class="filebar" data-density="compact"><div class="tabs" role="tablist" aria-label="${esc(t("S-03.03"))}"><button type="button" class="tab" role="tab" aria-selected="true">${esc(t("S-03.01"))}</button></div></div>
    <div class="upload-row" data-density="compact">${button(t("S-03.02"), "secondary", { icon: "CloudUploadOutlined", act: "upload" })}<button type="button" class="file-chip" data-act="open-file">${esc(data(D.UPLOADED))}</button></div>
    <div class="editor-wrap"><div class="editor" role="group" aria-label="${esc(t("S-03.01"))}"><div class="gutter" aria-hidden="true">${gutter}</div><div class="code" data-content="code">${body}</div>
      <span class="editor-overlay" data-density="compact">${iconButton(t("S-03.07"), "PlayArrowOutlined", { act: "run" })}${iconButton(t("S-03.08"), "FileUploadOutlined", { act: "upload" })}</span></div>
      <span class="grip ide-grip" role="separator" aria-orientation="vertical" aria-label="${esc(t("S-03.04"))}" aria-valuenow="960" aria-valuemin="480" aria-valuemax="1440" tabindex="0" data-act="resize-editor"></span></div>
    <div class="out-tabs" data-density="compact"><div class="tabs" role="tablist"><button type="button" class="tab" role="tab" aria-selected="true">${esc(asis("S-03", "Output"))}</button></div></div>
    <pre class="console" data-content="output">${esc(data(D.OUTPUT))}</pre>
    <div class="ide-actions">${button(t("S-03.09"), "secondary", { act: "open-in-chat" })}${button(t("S-03.10"), "primary", { act: "check" })}${button(t("S-03.11"), "tertiary", { act: "save-code" })}</div>
  </div>
</main>
${launcher()}
</div>`;
}

// ---------------------------------------------------------------- A-16 Enroll students
export function enroll(ctx) {
  const pv = ctx.mode === "preview";
  const R = D.ROSTER;
  const active = R.filter((r) => r.status === "Active").length, pending = R.length - active;
  const selected = R.filter((r) => r.selected).length;
  const statusText = { Active: kept("A-16", "Active"), Pending: kept("A-16", "Pending") };
  const roleText = { Instructor: t("A-16.11"), Student: kept("A-16", "Student"), Admin: kept("A-16", "Admin") };
  const rows = R.map((r) => {
    const tip = nextId("tip");
    const long = r.email.length > 34;
    const email = long
      ? `<span class="ctl-wrap"><span class="trunc" tabindex="0" aria-describedby="${tip}">${esc(data(r.email))}</span><span class="toggletip" id="${tip}" role="tooltip">${esc(r.email)}</span></span>`
      : `<span class="trunc">${esc(data(r.email))}</span>`;
    return `<tr${r.selected ? ` aria-selected="true"` : ` aria-selected="false"`}><td class="c-check">${checkbox(asis("A-16", "Select {email}", { email: r.email }), r.selected, { act: "row" })}</td><td>${email}</td><td class="c-role">${roleChip(roleText[r.role])}</td><td class="c-status">${statusChip(statusText[r.status], r.status === "Active" ? "success" : "info")}</td></tr>`;
  }).join("");
  const head = `<tr><th class="c-check" scope="col">${checkbox(asis("A-16", "Select all rows"), selected === R.length ? true : selected ? "mixed" : false, { act: "all" })}</th><th scope="col">${esc(kept("A-16", "Email"))}</th><th class="c-role" scope="col">${esc(kept("A-16", "Role"))}</th><th class="c-status" scope="col">${esc(kept("A-16", "Status"))}</th></tr>`;
  const searchId = nextId("s");
  return `<div class="app" data-density="compact">
${topBar({ role: "admin", url: ctx.url, theme: ctx.theme, menuHidden: ctx.mode === "preview", classLabel: D.CLASS.title })}
<div class="admin">
${sidebar("enroll-students")}
<main class="admin-main"><div class="admin-page md">
  <header class="page-header"><h1 class="t-page-title">${esc(t("A-16.01"))}</h1><p>${esc(kept("A-16", "Add students, review pending enrollments, and manage the class roster."))}</p></header>
  <div class="alert info" style="margin-bottom:var(--space-5)">${si("info")}<p>${esc(kept("A-16", "Managing enrollment for class: {name}", { name: D.CLASS.title }).slice(0, -D.CLASS.title.length))}<strong>${esc(data(D.CLASS.title))}</strong></p></div>
  <section class="enrol" aria-label="${esc(t("A-16.04"))}">
    ${field({ label: t("A-16.02"), value: data(D.TYPED.join("\n")), kind: "textarea", rows: 4, helper: t("A-16.03"), act: "emails" })}
    <div class="actions">${button(t("A-16.04"), "primary", { icon: "PersonAddOutlined", act: "enroll", ...blocked(ctx) })}</div>
  </section>
  <section aria-labelledby="roster-h">
    <div class="roster-head"><h2 class="t-section-title" id="roster-h">${esc(t("A-16.05"))}</h2><p class="sum">${esc(t("A-16.06", { n: R.length, a: active, p: pending }))}</p></div>
    <div class="toolbar">${button(t("A-16.08", { n: selected }), "destructive", { icon: "DeleteOutlined", act: "remove", ...blocked(ctx) })}<span class="spacer"></span>${button(t("A-16.07", { n: selected }), "secondary", { icon: "EmailOutlined", act: "email", ...blocked(ctx) })}<div class="field search"><div class="control">${mi("SearchOutlined", "ic")}<input id="${searchId}" type="search" placeholder="${esc(t("A-16.10"))}" aria-label="${esc(t("A-16.10"))}" data-act="search"></div></div></div>
    <div class="table-wrap"><table class="table"><thead>${head}</thead><tbody>${rows}</tbody></table></div>
  </section>
</div></main>
</div>
${launcher()}
</div>`;
}

// ---------------------------------------------------------------- A-13 Edit class
export function editClass(ctx) {
  const C = D.CLASS;
  return `<div class="app" data-density="compact">
${topBar({ role: "admin", url: ctx.url, theme: ctx.theme, menuHidden: ctx.mode === "preview", classLabel: C.title })}
<div class="admin">
${sidebar("edit-class")}
<main class="admin-main"><div class="admin-page lg">
  <header class="page-header"><h1 class="t-page-title">${esc(t("A-13.01"))}</h1><p>${esc(t("A-13.13"))}</p></header>
  <form class="form-frame" novalidate onsubmit="return false">
    <div class="form-main">
      <div class="form-sections">
        <section class="form-section"><div class="about"><h2 class="t-group-title">${esc(kept("A-13", "Basic information"))}</h2><p>${esc(asis("A-13", "The details shown to students and instructors."))}</p></div>
          <div class="fields">${field({ label: t("A-13.03"), value: data(C.title), act: "title" })}<div class="pair">${field({ label: t("A-13.04"), value: data(C.instructor), act: "instructor" })}${field({ label: t("A-13.05"), value: data(C.email), type: "email" })}</div>${field({ label: kept("A-13", "Description"), value: data(C.description), kind: "textarea", rows: 3 })}</div></section>
        <section class="form-section"><div class="about"><h2 class="t-group-title">${esc(t("A-13.06"))}</h2><p>${esc(asis("A-13", "Used as the cover image on the class card."))}</p></div>
          <div class="fields"><div class="upload">${button(kept("A-13", "Upload image"), "secondary", { icon: "CloudUploadOutlined", act: "upload-image" })}<p class="t-caption t-secondary">${esc(kept("A-13", "PNG, JPG, JPEG, or WebP. The preview updates after upload."))}</p></div></div></section>
        <section class="form-section"><div class="about"><h2 class="t-group-title">${esc(kept("A-13", "Class-specific instructions"))}</h2><p>${esc(asis("A-13", "Added to Kiwi's built-in instructions in every chat for this class."))}</p></div>
          <div class="fields">${switchCtl(kept("A-13", "Add class-specific instructions"), true, { act: "instructions" })}${field({ label: kept("A-13", "Instructions"), value: data(C.instructions), kind: "textarea", rows: 4, helper: asis("A-13", "Appended after Kiwi's built-in teaching and tool guidance. While an experiment is active, its variant's instructions are used instead.") })}</div></section>
      </div>
      <div class="form-actions">${button(kept("A-13", "Cancel"), "tertiary", { act: "cancel" })}${button(t("A-13.07"), "primary", { icon: "SaveOutlined", act: "save-class" })}</div>
    </div>
    <aside class="preview-col" aria-labelledby="pv-h"><h2 class="t-group-title" id="pv-h">${esc(kept("A-13", "Class preview"))}</h2><p>${esc(asis("A-13", "This is how the class appears in the class list."))}</p>${classCard(ctx, { title: C.title, instructor: C.instructor }, { static: true })}</aside>
  </form>
</div></main>
</div>
${launcher()}
</div>`;
}

export { tutorRow, userRow, welcome, metaLine, composer, feedback };
export const SCREENS = [
  { key: "sign-in", name: "Sign-in", spec: "S-05 + SR-5", build: signIn, phone: true, fonts: ["montserrat-wordmark.css"] },
  { key: "course-list", name: "Course list", spec: "S-01 + SR-1", build: courseList, phone: true },
  { key: "chat", name: "Chat (Materials with Kiwi chat docked)", spec: "S-02 + SR-2 + SR-6", build: chat, phone: true },
  { key: "code", name: "Code page", spec: "S-03 + SR-2", build: code, phone: true },
  { key: "enroll-students", name: "Enroll students", spec: "A-16 + SR-3 + SR-4", build: enroll, phone: false },
  { key: "edit-class", name: "Edit class", spec: "A-13 + SR-3 + SR-4", build: editClass, phone: false },
];
