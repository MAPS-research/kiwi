import OpenAI from 'openai';

/**
 * Client-side tools — executed in the browser, not on the server.
 *
 * The LLM "calls" these; the agent endpoint forwards the call to the frontend as
 * a clientAction, the browser runs it, and posts the result back. Tool *results*
 * (sitemap, page observation) are fetched on demand and live only in the agent
 * loop history — they never pollute the main chat context.
 *
 * SAFETY: there is no submit tool. `click` is for non-submitting controls only;
 * the frontend executor refuses any element that submits a form or fires a
 * mutating request. The human always performs the final submit.
 */

export type ClientTool = OpenAI.Chat.Completions.ChatCompletionTool;

const get_sitemap: ClientTool = {
  type: 'function',
  function: {
    name: 'get_sitemap',
    description:
      'Get the map of pages the current user can navigate to (named destinations, paths, and what each page is for), filtered to the user’s role, plus the current location. Call this before navigate when unsure of the destination or its path/params.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const list_classes: ClientTool = {
  type: 'function',
  function: {
    name: 'list_classes',
    description:
      'List the classes the current user can open, each with its classID and className. Call this whenever you need a classID for a class the user referred to BY NAME (e.g. "the kiwi demo class") — class-scoped pages are keyed by classID, and a class name is never a valid classID.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const navigate: ClientTool = {
  type: 'function',
  function: {
    name: 'navigate',
    description:
      'Navigate the app to a destination. Provide either a named destination from the sitemap (e.g. "admin", "classes", "new class") or an explicit in-app path. Supply params (e.g. classID) when the destination requires them.',
    parameters: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'A named destination key from get_sitemap.',
        },
        path: {
          type: 'string',
          description:
            'An explicit in-app path (e.g. "/admin/classes"). Use only for app routes, never external URLs.',
        },
        params: {
          type: 'object',
          description:
            'Path params to fill the destination template (e.g. {"classID": "..."}).',
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
};

const observe: ClientTool = {
  type: 'function',
  function: {
    name: 'observe',
    description:
      'Get a snapshot of the interactable elements currently on screen (buttons, links, inputs, selects) with a stable ref id, role, label, and current value for each. Call this to see what you can click or fill on the current page. Refs are valid until the next navigation/observe.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
};

const click: ClientTool = {
  type: 'function',
  function: {
    name: 'click',
    description:
      'Click a NON-SUBMITTING control on the current page by its ref from observe (e.g. a tab, expander, menu toggle, or filter). You may NOT click buttons that submit a form or trigger a save/create/delete/send — those are blocked; ask the user to press them.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'The element ref id returned by observe (e.g. "a3").',
        },
      },
      required: ['ref'],
      additionalProperties: false,
    },
  },
};

const fill: ClientTool = {
  type: 'function',
  function: {
    name: 'fill',
    description:
      'Set the value of an input/textarea/select on the current page by its ref from observe. This only fills the field; it does NOT submit. Leave submitting to the user.',
    parameters: {
      type: 'object',
      properties: {
        ref: {
          type: 'string',
          description: 'The element ref id returned by observe (e.g. "a7").',
        },
        value: {
          type: 'string',
          description: 'The value to set.',
        },
      },
      required: ['ref', 'value'],
      additionalProperties: false,
    },
  },
};

/** All client tools, keyed by name. */
export const CLIENT_TOOLS: Record<string, ClientTool> = {
  get_sitemap,
  list_classes,
  navigate,
  observe,
  click,
  fill,
};

export const CLIENT_TOOL_NAMES = new Set(Object.keys(CLIENT_TOOLS));

/**
 * Return the tool set available to a given role. All client tools are currently
 * available to every authenticated user; role-gating of *destinations* happens
 * in the sitemap (server can also filter the sitemap result). Kept as a function
 * so we can restrict tools per role later.
 */
export function clientToolsForRole(_systemRole: string): ClientTool[] {
  return Object.values(CLIENT_TOOLS);
}
