// Every path the Phase 7 generator reads or writes, resolved from this file's own location, so nothing is machine-specific.
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

export const LIB = dirname(fileURLToPath(import.meta.url));
export const TOOLS = dirname(LIB); //                       .design-foundations/mocks/tools
export const MOCKS = dirname(TOOLS); //                     .design-foundations/mocks
export const REPO = resolve(MOCKS, "..", ".."); //          the repository root
export const ASSETS = join(MOCKS, "assets");
export const SCREENS = join(MOCKS, "screens");
export const SHOTS = join(MOCKS, "screenshots");
export const PREVIEW = join(MOCKS, "preview");
export const TOKENS_CSS = join(REPO, ".design-foundations", "tokens", "generated", "kiwi-ui.tokens.css");
export const REVISIONS = join(REPO, ".design-foundations", "copy", "generated", "revisions.json");
export const CDP = join(REPO, ".design-foundations", "tokens", "tools", "cdp.mjs");
export const DESIGN_MD = join(REPO, "kiwi-ui", "DESIGN.md");
export const JOURNEY_MD = join(REPO, "kiwi-ui", "JOURNEY.md");
export const rel = (p) => p.slice(REPO.length + 1);
