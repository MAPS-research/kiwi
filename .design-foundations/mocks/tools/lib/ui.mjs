// Markup helpers for the Phase 7 screens: each draws one kiwi-ui/DESIGN.md § Design system component with the class
// names mock.css styles through the component tokens. Words come from copy.mjs; nothing here types interface copy.
import { mi, si, launcherGlyph } from "./icons.mjs";
import { t, kept, asis, doc, brand, data } from "./copy.mjs";

export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
let uid = 0;
export const nextId = (p = "x") => `${p}${++uid}`;
export const resetIds = () => { uid = 0; };

/** A toggletip reason for a disabled or inert control (Phase 3: aria-disabled + aria-describedby, never native disabled). */
export function reason(id, text, opts = {}) {
  return `<span class="toggletip${opts.open ? " open" : ""}${opts.inline ? " inline" : ""}" id="${id}" role="tooltip">${esc(text)}</span>`;
}
/** A button. v: primary | secondary | tertiary | destructive. opts: icon (Material name), disabled + why, pressed, busy, act, cls, label (aria). */
export function button(text, v = "secondary", opts = {}) {
  const id = opts.why ? nextId("why") : null;
  const attrs = [`type="button"`, `class="btn btn-${v}${opts.cls ? " " + opts.cls : ""}"`];
  if (opts.label) attrs.push(`aria-label="${esc(opts.label)}"`);
  if (opts.pressed !== undefined) attrs.push(`aria-pressed="${opts.pressed}"`);
  if (opts.disabled) attrs.push(`aria-disabled="true"`);
  if (opts.busy) attrs.push(`aria-busy="true"`);
  if (id) attrs.push(`aria-describedby="${id}"`);
  if (opts.act) attrs.push(`data-act="${opts.act}"`);
  const icon = opts.icon ? mi(opts.icon) : "";
  const tip = id ? reason(id, opts.why, { open: opts.openWhy }) : "";
  return `<span class="ctl-wrap"><button ${attrs.join(" ")}>${icon}<span class="btn-label">${esc(text)}</span></button>${tip}</span>`;
}
/** An icon-only button: its name is its aria-label and its tooltip (C15). */
export function iconButton(name, icon, opts = {}) {
  const id = opts.why ? nextId("why") : null;
  const attrs = [`type="button"`, `class="icon-btn${opts.cls ? " " + opts.cls : ""}"`, `aria-label="${esc(name)}"`, `title="${esc(name)}"`];
  if (opts.pressed !== undefined) attrs.push(`aria-pressed="${opts.pressed}"`);
  if (opts.expanded !== undefined) attrs.push(`aria-expanded="${opts.expanded}"`);
  if (opts.haspopup) attrs.push(`aria-haspopup="${opts.haspopup}"`);
  if (opts.disabled) attrs.push(`aria-disabled="true"`);
  if (id) attrs.push(`aria-describedby="${id}"`);
  if (opts.act) attrs.push(`data-act="${opts.act}"`);
  if (opts.controls) attrs.push(`aria-controls="${opts.controls}"`);
  const glyph = opts.shape ? si(icon) : mi(icon);
  const tip = id ? reason(id, opts.why, { open: opts.openWhy }) : "";
  return `${id ? `<span class="ctl-wrap">` : ""}<button ${attrs.join(" ")}>${glyph}</button>${tip}${id ? `</span>` : ""}`;
}
/** A status chip: the -3 surface, the -11 text and its shape icon (G1: never colour alone). */
export function statusChip(text, kind) {
  const icon = { success: "check", info: "info", warning: "triangle", error: "cross", neutral: "ring" }[kind];
  return `<span class="chip chip-status ${kind}">${si(icon)}${esc(text)}</span>`;
}
export const roleChip = (text) => `<span class="chip chip-role">${esc(text)}</span>`;
export function filterChip(text, selected, opts = {}) {
  return `<button type="button" class="chip chip-filter" aria-pressed="${selected}"${opts.act ? ` data-act="${opts.act}"` : ""}>${esc(text)}</button>`;
}
/** A checkbox (role=checkbox), named by aria-label when it has no visible label. */
export function checkbox(name, checked, opts = {}) {
  const glyph = checked === "mixed" ? si("dash") : checked ? si("check") : "";
  return `<span class="cbx" role="checkbox" tabindex="0" aria-checked="${checked}" aria-label="${esc(name)}"${opts.act ? ` data-act="${opts.act}"` : ""}>${glyph}</span>`;
}
/** A switch with its visible label (the label is the name). */
export function switchCtl(label, on, opts = {}) {
  const id = nextId("sw");
  const desc = opts.why ? nextId("why") : null;
  return `<span class="switch-row${opts.cls ? " " + opts.cls : ""}"><button type="button" class="switch" role="switch" aria-checked="${on}" aria-labelledby="${id}"${opts.disabled ? ` aria-disabled="true"` : ""}${desc ? ` aria-describedby="${desc}"` : ""}${opts.act ? ` data-act="${opts.act}"` : ""}><span class="thumb"></span></button><span class="switch-label" id="${id}">${esc(label)}</span>${desc ? `<span class="switch-why" id="${desc}">${esc(opts.why)}</span>` : ""}</span>`;
}
/** A labelled field: label above, the control, the helper below (C14). kind: input | textarea | select. */
export function field({ label, value = "", kind = "input", helper, rows = 3, focus = false, readOnly = false, name, act, type = "text", ph, id: given, valueIsData = true, inert = null }) {
  const id = given || nextId("f");
  const helpId = helper ? nextId("h") : null;
  const v = esc(value);
  let ctl;
  const ro = readOnly ? " readonly" : "";
  const inertAttrs = inert ? ` aria-disabled="true" aria-describedby="${inert}"` : "";
  if (kind === "textarea") ctl = `<textarea id="${id}" rows="${rows}"${helpId ? ` aria-describedby="${helpId}"` : ""}${ph ? ` placeholder="${esc(ph)}"` : ""}${ro}${inertAttrs}${act ? ` data-act="${act}"` : ""}>${v}</textarea>`;
  else if (kind === "select") ctl = `<span class="select-value" id="${id}" role="combobox" tabindex="0" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${id}-l ${id}">${v}</span>${mi("ExpandMoreOutlined", "ic chev")}`;
  else ctl = `<input id="${id}" type="${type}" value="${v}"${helpId ? ` aria-describedby="${helpId}"` : ""}${ph ? ` placeholder="${esc(ph)}"` : ""}${ro}${inertAttrs}${name ? ` name="${name}"` : ""}${act ? ` data-act="${act}"` : ""}>`;
  return `<div class="field"><label class="field-label" id="${id}-l" for="${id}">${esc(label)}</label><div class="control${kind === "textarea" ? " multiline" : ""}${kind === "select" ? " select" : ""}${focus ? " is-focus" : ""}${readOnly ? " read-only" : ""}">${ctl}</div>${helper ? `<p class="field-helper" id="${helpId}">${esc(helper)}</p>` : ""}</div>`;
}
/** The floating chat launcher (SR-6): the companion's glyph on the locked 56 px disc; never animates. */
export const launcher = () => `<button type="button" class="launcher" aria-label="${esc(t("SR-6.37"))}" title="${esc(t("SR-6.36"))}" data-act="open-chat">${launcherGlyph()}</button>`;

/** The top bar (SR-1). opts: role (student|admin), classLabel (data), display (the Display menu markup when open), menuOpen. */
export function topBar(opts = {}) {
  const admin = opts.role === "admin";
  const logo = `<a class="logo" href="#" data-nav="${admin ? "enroll-students" : "course-list"}"><span class="logo-mark" role="img" aria-label="${esc(brand("INSTITUTION_NAME"))}"><img src="${opts.url("brand/kiwi-mark.svg")}" alt="" width="28" height="28"><span class="logo-text" aria-hidden="true">${esc(brand("INSTITUTION_NAME"))}</span></span></a>`;
  const menuBtn = admin ? `<span class="only-narrow">${iconButton(t("SR-1.01"), "MenuOutlined", { cls: "fixed", act: "drawer" })}</span>` : "";
  const sw = opts.classLabel
    ? `<span class="tb-divider" aria-hidden="true"></span><button type="button" class="class-switch" aria-label="${esc(t("SR-1.06", { currentLabel: opts.classLabel }))}" aria-haspopup="dialog">${mi("SchoolOutlined")}<span class="class-switch-label">${esc(data(opts.classLabel))}</span>${mi("UnfoldMoreOutlined", "ic sw")}</button>`
    : "";
  const view = admin ? iconButton(t("SR-1.02"), "MenuBookOutlined", { cls: "fixed", act: "nav:course-list" }) : "";
  const display = `<span class="menu-anchor">${iconButton(t("DS.01"), "TuneOutlined", { cls: "fixed", expanded: !!opts.menuOpen, haspopup: "menu", act: "display-menu", controls: "display-menu" })}${opts.menuOpen || opts.menuHidden ? displayMenu(opts) : ""}</span>`;
  const out = iconButton(t("SR-1.05"), "LogoutOutlined", { cls: "fixed", act: "sign-out", ...(opts.signOutWhy ? { disabled: true, why: opts.signOutWhy } : {}) });
  return `<header class="topbar" data-density="${admin ? "compact" : "comfortable"}">${menuBtn}${logo}${sw}<span class="spacer"></span><span class="tb-icons">${display}${view}${out}</span></header>`;
}
/** The Display menu (Phase 3 § The Display menu; words DS.01 to DS.06): both groups (the dark flag and the motion flag on). */
export function displayMenu(opts = {}) {
  const cur = opts.theme === "dark" ? "dark" : opts.themeChoice || "light";
  const item = (key, label) => `<div role="menuitemradio" class="menu-item" aria-checked="${cur === key}" tabindex="${cur === key ? 0 : -1}" data-act="theme:${key}"><span class="menu-item-label">${esc(label)}</span>${si("check", "ic chk")}</div>`;
  // the motion item is a checkable menu item drawn as the switch (Phase 3's switch look; a menu's own role for it)
  const on = opts.motionOn !== false;
  const sw = `<div role="menuitemcheckbox" class="menu-switch" aria-checked="${on}" tabindex="-1" data-act="motion"${opts.motionInert ? ` aria-disabled="true" aria-describedby="dm-why"` : ""}><span class="switch-label">${esc(t("DS.04"))}</span><span class="switch" aria-hidden="true"><span class="thumb"></span></span>${opts.motionInert ? `<span class="switch-why" id="dm-why">${esc(t("DS.05"))}</span>` : ""}</div>`;
  return `<div class="menu" id="display-menu" role="menu" aria-label="${esc(t("DS.01"))}"${opts.menuHidden ? " hidden" : ""}><div class="menu-group" role="group" aria-labelledby="dm-theme"><span class="menu-group-label" id="dm-theme" role="presentation">${esc(t("DS.02"))}</span>${item("device", t("DS.03"))}${item("light", doc("DS.03", "Light"))}${item("dark", doc("DS.03", "Dark"))}</div><div class="menu-group menu-group-motion" role="group" aria-label="${esc(t("DS.04"))}">${sw}</div></div>`;
}
export { mi, si, launcherGlyph };
