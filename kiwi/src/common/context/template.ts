/**
 * Minimal `{{#if x}}…{{/if}}` rendering for the prompt templates.
 *
 * The prompts use a Handlebars-looking syntax but are rendered by hand. The
 * obvious implementation — a non-greedy regex per conditional — is wrong as soon
 * as a section nests, because `[\s\S]*?\{\{\/if\}\}` stops at the FIRST `{{/if}}`
 * it meets, which is the inner one. The outer close tag then survives into the
 * rendered prompt, and the model is shown literal `{{/if}}` markers.
 *
 * These helpers match close tags by depth instead.
 */

const OPEN_PREFIX = '{{#if ';
const CLOSE_TAG = '{{/if}}';

/**
 * Render every `{{#if name}}…{{/if}}` section in `template`.
 *
 * @param render receives the section body and returns its replacement; pass
 *   `null` to drop the section entirely (the condition is false).
 */
export function renderConditional(
  template: string,
  name: string,
  render: ((inner: string) => string) | null,
): string {
  const openTag = `${OPEN_PREFIX}${name}}}`;
  let result = '';
  let cursor = 0;

  for (;;) {
    const start = template.indexOf(openTag, cursor);
    if (start === -1) {
      result += template.slice(cursor);
      return result;
    }

    result += template.slice(cursor, start);

    const bodyStart = start + openTag.length;
    const closeStart = findMatchingClose(template, bodyStart);

    if (closeStart === -1) {
      // Unbalanced template. Emit the rest verbatim rather than guessing — the
      // stray-tag sweep below will still keep it out of the model's context.
      result += template.slice(start);
      return result;
    }

    const body = template.slice(bodyStart, closeStart);
    if (render) {
      result += render(body);
    }
    cursor = closeStart + CLOSE_TAG.length;
  }
}

/**
 * Index of the `{{/if}}` that closes a section whose body starts at `from`,
 * or -1 when the template is unbalanced.
 */
function findMatchingClose(template: string, from: number): number {
  let depth = 1;
  let i = from;

  while (i < template.length) {
    const nextOpen = template.indexOf(OPEN_PREFIX, i);
    const nextClose = template.indexOf(CLOSE_TAG, i);

    if (nextClose === -1) return -1;

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      i = nextOpen + OPEN_PREFIX.length;
      continue;
    }

    depth--;
    if (depth === 0) return nextClose;
    i = nextClose + CLOSE_TAG.length;
  }

  return -1;
}

/**
 * Remove any `{{…}}` token left behind after rendering.
 *
 * A backstop, not the mechanism: an unrendered placeholder is a template bug,
 * but shipping the literal token to the model is strictly worse than dropping
 * it — it is noise the model may try to interpret, and it sits in the system
 * prompt on every single turn.
 */
export function stripUnrenderedTokens(text: string): string {
  return text.replace(/\{\{[^}]*\}\}/g, '');
}
