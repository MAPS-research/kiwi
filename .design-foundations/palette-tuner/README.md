# Kiwi palette tuner

A single HTML page for trying UI colour changes live. Move a slider or pick a preset, and a specimen of the Kiwi screens repaints at once: the top bar, the materials list, class cards, buttons, fields, a table, the chat panel with its composer, and a dialog. WCAG AA contrast checks update as you go. The page works in English and Chinese, and works offline apart from the web font.

The tuner starts from the committed light-mode tokens, so it always shows the palette the product uses today. It changes light mode only. Dark mode is derived from the result by applying the same transform to the dark ramps.

## Open it

Open [`palette-tuner.html`](palette-tuner.html) in a browser: double-click it, or drag it into a browser window. You don't need a server or an install.

## What you can change

| Control | What it changes |
|---|---|
| Neutrals: colourfulness and hue shift | The page, cards, hover and pressed surfaces, rules, the ruler and field edges |
| Text: colourfulness | Body and secondary text. They follow the neutral hue shift. |
| Accent: strength and hue shift | The sage family: the primary button, accent text, focus, selection, and the hover and pressed tints |
| Hover and selection tint | A sage tint or a neutral tint |
| Primary button | Soft sage (the committed style), mid green, or white with a green edge |

Each colour keeps its OKLCH lightness. Only chroma is scaled and hue shifted, so contrast stays close to the committed values. The checks show exactly how close.

The Kiwi logo keeps its own colours. The error, success, warning and info colours don't change either.

## Share a palette

- **Copy values** puts a JSON block on the clipboard with the slider settings (`params`), every resulting colour (`roles`) and the token version the tuner started from (`tokensSource`). Paste it into an issue, a pull request or a message.
- **Paste values** applies a JSON block someone else copied, so you can see their palette.

## Turn a palette into the product's palette

`kiwi-ui/DESIGN.md` locks the palette. Changing it needs the design owner's sign-off, and it is recorded as a lock amendment. Once agreed:

1. **Tokens.** In [`../tokens/kiwi-ui.tokens.json`](../tokens/kiwi-ui.tokens.json), set the new values on their global steps. Record where each value comes from: given (from the tuner, with its `params`) or derived (the same transform). `check-tokens.mjs` §21 re-renders every derived value from that record. Derive the dark ramps with the same transform.
2. **Build and check:**
   ```bash
   node .design-foundations/tokens/build-tokens.mjs
   node .design-foundations/tokens/check-tokens.mjs
   ```
   `check-tokens` must pass. Never lower a contrast threshold to make it pass. Move a derived value's lightness instead.
3. **DESIGN.md.** Update the locked token block and every table or line that quotes a changed value. Then record the change and re-run the copy checks:
   ```bash
   node .design-foundations/copy/record-amendment.mjs --id <yyyy-mm-dd-short-name> --decided <yyyy-mm-dd> --decision "<who decided what>"
   node .design-foundations/copy/check-copy.mjs --write
   node .design-foundations/copy/check-copy.mjs
   ```
4. **Rebuild the tuner,** so it starts from the new palette:
   ```bash
   node .design-foundations/palette-tuner/build-palette-tuner.mjs
   ```

## Files

| File | Role |
|---|---|
| `palette-tuner.template.html` | The page: layout, specimen, colour maths, strings. Edit this. |
| `build-palette-tuner.mjs` | Reads the light block of `../tokens/generated/kiwi-ui.tokens.css` and writes `palette-tuner.html`. `--check` exits 1 when the page is stale. |
| `palette-tuner.html` | Generated. Don't edit it by hand. |
