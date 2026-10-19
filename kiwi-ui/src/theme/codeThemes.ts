import "ace-builds/src-noconflict/ace";
import type { CSSProperties } from "react";
import aceLightCss from "./generated/code-themes/ace-kiwi-light.css?raw";
import aceDarkCss from "./generated/code-themes/ace-kiwi-dark.css?raw";
import prism from "./generated/code-themes/prism-kiwi.json" with { type: "json" };

/**
 * The code surfaces of the design system (kiwi-ui/DESIGN.md, Code surfaces): the
 * generated Ace themes replace clouds and monokai, and the generated Prism style
 * replaces tomorrow and prism. Code is not paper, so both follow the colour mode.
 */

export type CodeMode = "light" | "dark";

/** The Ace theme name to pass to react-ace for a colour mode. */
export const aceThemeFor = (mode: CodeMode) => (mode === "dark" ? "kiwi-dark" : "kiwi-light");

/** The react-syntax-highlighter Prism style object for a colour mode. */
export const kiwiPrism = (mode: CodeMode): Record<string, CSSProperties> =>
  prism[mode] as Record<string, CSSProperties>;

type AceDefine = (
  name: string,
  deps: string[],
  factory: (require: (id: string) => unknown, exports: Record<string, unknown>) => void
) => void;

/**
 * The generated sheets address the editor as `.ace-kiwi-light .ace_editor`, but
 * Ace puts the theme class on the editor element itself, so the root rule is
 * rewritten to the compound selector Ace's own themes use.
 */
const rootFixed = (css: string, cssClass: string) =>
  css.split(`.${cssClass} .ace_editor`).join(`.${cssClass}.ace_editor`);

let registered = false;

/** Registers ace/theme/kiwi-light and ace/theme/kiwi-dark once; react-ace then loads them by name. */
export function registerKiwiAceThemes() {
  if (registered) return;
  const define = (window as unknown as { ace?: { define?: AceDefine } }).ace?.define;
  if (!define) throw new Error("Ace is not loaded: import ace-builds before registering the Kiwi themes");
  registered = true;

  const themes: [string, string, boolean, string][] = [
    ["kiwi-light", "ace-kiwi-light", false, aceLightCss],
    ["kiwi-dark", "ace-kiwi-dark", true, aceDarkCss],
  ];
  for (const [name, cssClass, isDark, css] of themes) {
    define(`ace/theme/${name}`, ["require", "exports", "module", "ace/lib/dom"], (require, exports) => {
      exports.isDark = isDark;
      exports.cssClass = cssClass;
      exports.cssText = rootFixed(css, cssClass);
      const dom = require("ace/lib/dom") as {
        importCssString: (css: string, id: string, target: boolean) => void;
      };
      dom.importCssString(exports.cssText as string, cssClass, false);
    });
  }
}
