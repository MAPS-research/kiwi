/**
 * Page observation + safe DOM actions for the agent.
 *
 * `observe()` walks the visible interactable elements, stamps each with a stable
 * `data-agent-ref`, and returns a compact descriptor list. `click`/`fill` act on
 * an element by its ref. SAFETY: clicking anything that submits a form or triggers
 * a mutation is refused here (in addition to the agent being told not to).
 */

const REF_ATTR = 'data-agent-ref';
const MAX_ELEMENTS = 60; // token budget guard

export interface ObservedElement {
  ref: string;
  tag: string;
  type: string; // input type / role / element kind
  label: string; // accessible name / text / placeholder
  value?: string; // current value for fields
  options?: string[]; // selectable options for a native <select>
  disabled?: boolean;
  submitLike?: boolean; // true if this would submit/mutate (not clickable by agent)
}

export interface Observation {
  path: string;
  title: string;
  elements: ObservedElement[];
  truncated: boolean;
  // When the current screen is an embedded external Kiwi App (rendered in a
  // cross-origin sandboxed iframe), its content is NOT in this document and can
  // never be read by the DOM scan below. The host mirrors the app's self-reported
  // context (challenge text, the student's code, etc.) here so the agent can
  // reason about the app instead of concluding "there's no question on screen"
  // (issue #213).
  appContext?: string;
  // Guidance surfaced to the agent when on an app tab, so it relies on
  // `appContext` rather than trying to DOM-scan the iframe.
  note?: string;
}

/**
 * Optional provider of the embedded app's self-reported context. AgentBridge
 * supplies this from GlobalChatContext (kept fresh by the app's kiwi:updateContext
 * messages). Returns the context string when the user is on an app tab, else null.
 */
export type AppContextProvider = () => {
  isAppTab: boolean;
  appContext?: string;
};


function visible(el: Element): boolean {
  const r = (el as HTMLElement).getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  const style = window.getComputedStyle(el as HTMLElement);
  return style.visibility !== 'hidden' && style.display !== 'none';
}

function accessibleName(el: HTMLElement): string {
  const aria = el.getAttribute('aria-label');
  if (aria) return aria.trim();
  const labelledby = el.getAttribute('aria-labelledby');
  if (labelledby) {
    const t = labelledby
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
      .trim();
    if (t) return t;
  }
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.labels && el.labels.length) {
      const t = Array.from(el.labels)
        .map((l) => l.textContent ?? '')
        .join(' ')
        .trim();
      if (t) return t;
    }
    if (el.placeholder) return el.placeholder.trim();
    if (el.name) return el.name;
  }
  const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (text) return text.slice(0, 80);
  const title = el.getAttribute('title');
  if (title) return title.trim();
  return '';
}

/**
 * Determine whether clicking an element would submit a form or fire a mutation.
 * Conservative: any submit button, anything in a form whose default click submits,
 * or elements explicitly marked as mutating via data-agent-mutation.
 */
function isSubmitLike(el: HTMLElement): boolean {
  if (el.getAttribute('data-agent-mutation') === 'true') return true;
  const type = (el.getAttribute('type') || '').toLowerCase();
  if (type === 'submit') return true;
  const tag = el.tagName.toLowerCase();
  if (tag === 'button') {
    // A <button> with no type inside a <form> defaults to submit.
    if (!type && el.closest('form')) return true;
  }
  return false;
}

const ACTIONABLE_SELECTOR = [
  'button',
  'a[href]',
  'input:not([type=hidden])',
  'textarea',
  'select',
  '[role=button]',
  '[role=tab]',
  '[role=menuitem]',
  '[role=link]',
  '[role=switch]',
  '[role=checkbox]',
  // Open-dropdown items (MUI Select/Menu/Autocomplete render these into a
  // body-level portal as role=option / menuitem).
  '[role=option]',
  '[role=combobox]',
].join(',');

// Monotonic counter so refs are unique across the page's lifetime and never
// reused for a different element (avoids the agent acting on a stale ref).
let refCounter = 0;

export async function observe(
  currentPath: string,
  getAppContext?: AppContextProvider,
): Promise<Observation> {
  // Scan the whole document, not just #root, so dropdown/menu options that MUI
  // renders into body-level portals are included.
  const nodes = Array.from(
    document.body.querySelectorAll<HTMLElement>(ACTIONABLE_SELECTOR),
  ).filter(visible);

  const elements: ObservedElement[] = [];
  for (const el of nodes) {
    if (elements.length >= MAX_ELEMENTS) break;
    // Reuse an element's existing ref so the SAME element keeps the SAME ref
    // across re-observes; only assign a fresh ref to newly-seen elements. This
    // keeps refs stable so the agent doesn't fill/click the wrong field after a
    // re-render.
    let ref = el.getAttribute(REF_ATTR);
    if (!ref) {
      ref = `a${refCounter++}`;
      el.setAttribute(REF_ATTR, ref);
    }

    const tag = el.tagName.toLowerCase();
    let type = tag;
    let value: string | undefined;
    if (el instanceof HTMLInputElement) {
      type = `input:${el.type}`;
      value = el.type === 'password' ? '••••' : el.value;
    } else if (el instanceof HTMLTextAreaElement) {
      type = 'textarea';
      value = el.value;
    } else if (el instanceof HTMLSelectElement) {
      type = 'select (choose an option via fill)';
      value = el.value;
    } else if (isComboboxTrigger(el)) {
      // MUI Select / combobox. fill({ref, value}) handles opening + selecting in
      // one call; the available choices are listed in "options".
      type = 'dropdown (use fill with one of the listed options)';
    } else if (el.getAttribute('role')) {
      type = `role:${el.getAttribute('role')}`;
    }

    // List a native <select>'s options. We do NOT peek MUI dropdowns here:
    // opening/closing them mutates the page, making observe non-idempotent (the
    // agent would re-observe forever). The agent learns a MUI dropdown's options
    // from the fill() response instead (fill opens+selects, and on a mismatch
    // returns the available options).
    let options: string[] | undefined;
    if (el instanceof HTMLSelectElement) {
      options = Array.from(el.options)
        .map((o) => (o.text || o.value).trim())
        .filter(Boolean)
        .slice(0, 30);
    }

    elements.push({
      ref,
      tag,
      type,
      label: accessibleName(el),
      value,
      ...(options ? { options } : {}),
      disabled: (el as HTMLButtonElement).disabled || undefined,
      submitLike: isSubmitLike(el) || undefined,
    });
  }

  // Safety: ensure no dropdown was left open by the option-peeking above.
  await closeOpenDropdown();

  const observation: Observation = {
    path: currentPath,
    title: document.title,
    elements,
    truncated: nodes.length > elements.length,
  };

  // On an embedded app tab, the elements above are only the HOST chrome (tabs,
  // buttons) — the app itself is a cross-origin iframe we cannot read. Attach the
  // app's self-reported context so the agent can answer about it.
  const app = getAppContext?.();
  if (app?.isAppTab) {
    if (app.appContext) {
      observation.appContext = app.appContext;
      observation.note =
        "This screen embeds an external app in a sandboxed iframe. Its content " +
        "(e.g. the exercise question and the student's code) is in `appContext`, " +
        "NOT in `elements`. Use `appContext` to answer; do not expect the app's " +
        "text to appear as elements here.";
    } else {
      observation.note =
        "This screen embeds an external app in a sandboxed iframe whose content " +
        "cannot be read from the page DOM, and it has not reported any context " +
        "yet. Ask the user to paste the relevant text (e.g. the question) if you " +
        "need it.";
    }
  }

  return observation;
}

function byRef(ref: string): HTMLElement | null {
  // Search the whole document so portal-rendered dropdown options resolve too.
  return document.body.querySelector<HTMLElement>(
    `[${REF_ATTR}="${CSS.escape(ref)}"]`,
  );
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export function clickRef(ref: string): ActionResult {
  if (!ref || !ref.trim())
    return {
      ok: false,
      message:
        'click needs a "ref". Call observe first, then click({ref}) using a ref ' +
        'from its result (e.g. the tab/card you want).',
    };
  const el = byRef(ref);
  if (!el) return { ok: false, message: `No element with ref "${ref}". Re-run observe.` };
  if ((el as HTMLButtonElement).disabled)
    return { ok: false, message: `Element "${ref}" is disabled.` };
  if (isSubmitLike(el))
    return {
      ok: false,
      message:
        `Refused: "${ref}" submits a form or triggers a mutation. ` +
        `Ask the user to press it themselves.`,
    };
  el.click();
  return { ok: true, message: `Clicked "${accessibleName(el) || ref}".` };
}

/** Set a controlled input's value so React picks up the change. */
function setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/** A combobox/select trigger that must be opened (clicked) to choose an option. */
function isComboboxTrigger(el: HTMLElement): boolean {
  const role = el.getAttribute('role');
  if (role === 'combobox' || role === 'listbox') return true;
  // MUI Select renders a div[role=button] with aria-haspopup="listbox".
  const haspopup = el.getAttribute('aria-haspopup');
  if (haspopup === 'listbox' || haspopup === 'menu') return true;
  return false;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


/**
 * The backdrop that belongs to an OPEN select/menu popup — NOT other modals like
 * the chat panel. We find the popup (a MUI Menu/Popover containing options) and
 * its sibling backdrop within the same MUI modal root, so we never click the
 * chat's backdrop (which would minimize the chat).
 */
function menuBackdrops(): HTMLElement[] {
  const popups = Array.from(
    document.body.querySelectorAll<HTMLElement>(
      '.MuiMenu-paper, .MuiPopover-paper, [role=listbox]',
    ),
  ).filter((p) => p.querySelector('[role=option], .MuiMenuItem-root, [role=menuitem]'));

  const backdrops: HTMLElement[] = [];
  for (const popup of popups) {
    // The MUI modal root wraps both the backdrop and the popup paper.
    const modalRoot = popup.closest('.MuiModal-root, .MuiPopover-root') as HTMLElement | null;
    const bd = modalRoot?.querySelector<HTMLElement>(
      '.MuiBackdrop-root, .MuiModal-backdrop',
    );
    if (bd) backdrops.push(bd);
  }
  return backdrops;
}

/**
 * Reliably close an open MUI Select/Menu WITHOUT touching other modals (e.g. the
 * chat panel). Escape on body alone doesn't work — try Escape on the focused
 * option, then click only the menu's own backdrop, and verify it closed.
 */
async function closeOpenDropdown(anyOption?: HTMLElement): Promise<void> {
  for (let i = 0; i < 5; i++) {
    if (openOptionEls().length === 0) return; // already closed

    const target = (anyOption ??
      (document.activeElement as HTMLElement) ??
      document.body) as HTMLElement;
    target.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }),
    );
    // Only click the open menu's own backdrop — never the chat/other modals.
    menuBackdrops().forEach((b) => b.click());
    await sleep(40);
  }
}

/** Find the currently-open dropdown's option elements (in the body portal). */
function openOptionEls(): HTMLElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLElement>(
      '[role=option], [role=listbox] li, .MuiMenuItem-root, [role=menuitem]',
    ),
  ).filter((el) => el.offsetParent !== null || el.getClientRects().length > 0);
}

/**
 * Open a MUI/combobox dropdown and select the option matching `value` — the whole
 * open→find→click in ONE call, so the menu never closes between round-trips and
 * the agent doesn't have to do the brittle click→observe→click dance.
 */
async function selectFromDropdown(
  el: HTMLElement,
  ref: string,
  value: string,
): Promise<ActionResult> {
  const fieldName = accessibleName(el) || ref;

  // Open the dropdown.
  el.focus();
  el.click();
  el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));

  // Wait (with retries) for the portal options to render.
  let options: HTMLElement[] = [];
  for (let i = 0; i < 12 && options.length === 0; i++) {
    await sleep(40);
    options = openOptionEls();
  }
  if (options.length === 0) {
    return {
      ok: false,
      message: `Opened "${fieldName}" but no options appeared. It may not be a standard dropdown.`,
    };
  }

  const labels = options.map((o) => (o.textContent || '').replace(/\s+/g, ' ').trim());
  const wanted = value.trim();

  // Reject empty/blank — never silently pick the first option.
  if (!wanted) {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return {
      ok: false,
      message:
        `No value given for the "${fieldName}" dropdown. Available options: ` +
        labels.filter(Boolean).join(', ') +
        `. Call fill again with one of these exact values.`,
    };
  }

  // Match: exact (case-insensitive), then normalized ignoring spaces/case
  // (e.g. "token limit" → "TokenLimit"). No loose substring match (it caused
  // wrong picks like matching "" or a short string to the first option).
  const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  let idx = labels.findIndex((l) => l.toLowerCase() === wanted.toLowerCase());
  if (idx < 0) idx = labels.findIndex((l) => norm(l) === norm(wanted));

  if (idx < 0) {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return {
      ok: false,
      message:
        `"${wanted}" is not an option for "${fieldName}". Available options: ` +
        labels.filter(Boolean).join(', ') +
        `. Call fill again with one of these exact values.`,
    };
  }

  options[idx].click();
  await sleep(30);
  return { ok: true, message: `Selected "${labels[idx]}" in the "${fieldName}" dropdown.` };
}

export async function fillRef(ref: string, value: string): Promise<ActionResult> {
  const el = byRef(ref);
  if (!el) return { ok: false, message: `No element with ref "${ref}". Re-run observe.` };

  // A combobox/select trigger: open it and pick the option in one call.
  if (isComboboxTrigger(el)) {
    return selectFromDropdown(el, ref, value);
  }

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    if (el.disabled || el.readOnly)
      return { ok: false, message: `Field "${ref}" is not editable.` };
    const fieldName = accessibleName(el) || ref;
    el.focus();
    setNativeValue(el, value);
    el.blur();
    // Verify the value actually stuck (React controlled inputs can reject it).
    if (el.value !== value) {
      return {
        ok: false,
        message: `Tried to fill the "${fieldName}" field but its value did not update (now "${el.value}"). It may be controlled differently.`,
      };
    }
    // Echo the field name so the agent can confirm it filled the RIGHT field.
    return { ok: true, message: `Filled the "${fieldName}" field with "${value}".` };
  }
  if (el instanceof HTMLSelectElement) {
    const opt = Array.from(el.options).find(
      (o) => o.value === value || o.text === value,
    );
    if (!opt) return { ok: false, message: `No option "${value}" in select "${ref}".` };
    el.value = opt.value;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true, message: `Selected "${opt.text}".` };
  }
  return { ok: false, message: `Element "${ref}" is not a fillable field.` };
}
