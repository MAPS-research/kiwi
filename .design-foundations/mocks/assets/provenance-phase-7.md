# Assets added for Phase 7 (final mocks), with provenance

Everything here is a local copy or a local render; nothing was downloaded. The mascot drawings are Phase 4's export as amended on 2026-10-18, unchanged (`mascot/provenance.md`): the tutor avatar and the welcome frame use only `stills/stand.*` and the `full-walk`, `full-hop-flight` and `full-wave-bow` atlases in their one shared framing, the composer peek `stamp-peek`, and the page placements (sign-in, the class-card fallback) the portrait idle still. Source Sans 3 is the copy committed in `6e06f91` (`fonts/source-sans-3.css`).

| File | What it is | Where it came from | Licence or status |
|---|---|---|---|
| `fonts/montserrat-latin-wght-italic.woff2` | Montserrat, variable italic, Latin subset: the face of `KiwiWordmark` only (G6) | the copy installed in `kiwi-ui/node_modules/@fontsource-variable/montserrat` 5.3.0 (`files/montserrat-latin-wght-italic.woff2`), copied | SIL Open Font License 1.1, `fonts/OFL-Montserrat.txt` (the package's `LICENSE`, copied) |
| `fonts/montserrat-wordmark.css` | the `@font-face` for it; read by the wordmark only, through `--font-wordmark` | written for the mocks | as the font |
| `brand/kiwi-mark.svg` | Kiwi's own app tile, the top bar's mark when no institution is configured (SR-1; G2 lets Kiwi's own marks keep the brand palette) | `kiwi-ui/public/assets/images/kiwi-mark.svg`, copied byte for byte; its root carries `data-motion="reduced"`, so it never animates | the product's own asset; its four colours are the mascot palette, allowlisted (`DESIGN.md § Raw-colour guard`) |
| `covers/intro-to-cs.webp`, `covers/machine-learning.webp` | two class cover images on the course list (content, never recoloured) | `kiwi-ui/public/assets/images/intro_to_cs.webp` and `ai.webp`, resized to 800 × 457 (Lanczos) and saved as WebP, quality 78 | the product's own demo covers |
| `paper/lecture-3-page-3.webp`, `paper/lecture-3-page-4.webp` | two pages of a fictional lecture PDF, as react-pdf draws a page: content pixels on the paper (G5) | rendered by `mocks/tools/paper.mjs` (headless Chrome, 1280 × 720) | written for the mocks; fictional content |

The demo people, classes, files, the student's question, the tutor's answer and the code are fictional (`mocks/tools/lib/demo.mjs`; addresses use the documentation domain `example.edu`).
