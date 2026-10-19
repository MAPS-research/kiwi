import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  GENERATED_FILES,
  SOURCE_DIR,
  TARGET_DIR,
  staleCopies,
} from "../../../scripts/sync-design-tokens.mjs";

/**
 * The files in this folder are byte-for-byte copies of the design pipeline's
 * outputs (.design-foundations/tokens/generated/). A hand edit here, or a token
 * change upstream that was never synced, would let the app drift from the locked
 * design without anyone noticing; `npm run tokens:sync` refreshes the copies.
 */
describe("generated design tokens", () => {
  it("ships a copy of every generated output", () => {
    for (const file of GENERATED_FILES) {
      expect(existsSync(join(TARGET_DIR, file)), file).toBe(true);
    }
  });

  it.skipIf(!existsSync(SOURCE_DIR))("matches the design source byte for byte", () => {
    expect(staleCopies()).toEqual([]);
  });

  it("is loaded by the app stylesheet", () => {
    const indexCss = readFileSync(join(TARGET_DIR, "..", "..", "index.css"), "utf8");

    expect(indexCss).toMatch(/@import\s+["']\.\/theme\/generated\/kiwi-ui\.tokens\.css["']/);
  });
});
