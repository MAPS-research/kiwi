# Mascot assets — provenance (Phase 4, Companion)

- **Source repository:** `NYUSH-ML/kiwi-ui`, branch `kiwi-icon`, commit `fbb4db85f90aeda3a1250c8e9c8aa2d7473e2e11` ("feat: Add Kiwi icon and drawn-frame motion library"). Read-only; nothing was pushed or modified there.
- **Exported on:** 2026-10-17 by `export-mascot.py` (this directory): `python3 export-mascot.py --source <checkout>`; Pillow 11.1.0.
- **What the source holds:** `public/kiwi-mascot/` (61 MB: v2 sources, lossless PNG twins, per-frame PNGs, animated preview WebPs, the superseded v1 SVG rigs). Runtime needs only the eight v3 WebP atlases below (`frames.ts`: a state is a sequence over an atlas; 6 × 4 cells of 256 px; the 24 Hz timeline clock with explicit holds).
- **Pixels:** every `still-<state>.png` is the named cell of the lossless PNG twin of its atlas, unchanged (G11: the artwork keeps its exact colours `#234631 #92ae70 #f5f4e8 #ccbd99`). The `atlas/` and `stills/` files are the same drawings resampled (Lanczos) to the 2× size of their placement and saved as lossless WebP; no recolouring, cropping, warping or interpolation between drawings.
- **`launcher-glyph.svg`** is a one-colour (`currentColor`) glyph: the `Portrait()` path geometry of `src/components/KiwiMascot/KiwiArtwork.tsx` at the same commit, with the eyes cut out, scaled to 78 % and set bottom-left, plus a filled speech bubble top-right (fix round 1, review F6: at 24 px the head alone read as a ghost; the bubble restores the chat signifier). It is the launcher's icon (Phase 3 icon policy: glyphs are `currentColor`), not mascot art.

## Runtime assets in the source (the port inventory), measured

| Atlas | Source path | Bytes | Pixels | SHA-256 | G9 states |
|---|---|---:|---|---|---|
| `full-hop-flight` | `public/kiwi-mascot/frames-v3/full-hop-flight.webp` | 564,972 | 1536 × 1024 (256 px cells) | `d0514dadca7db547318ec799ac94427cf034224ff040014c6560e77b205ab85b` | hop |
| `full-walk` | `public/kiwi-mascot/frames-v3/full-walk.webp` | 571,354 | 1536 × 1024 (256 px cells) | `aa6589578d81fd1b07085d9193139000279bfc4ce42bf54bcd58d159ae4519f6` | walk |
| `full-wave-bow` | `public/kiwi-mascot/frames-v3/full-wave-bow.webp` | 496,314 | 1536 × 1024 (256 px cells) | `2c7ab49db2f3152d7cdd9efb1514aa0c7c2167cd03b955985af319906c838daa` | wave |
| `portrait-blink` | `public/kiwi-mascot/frames-v3/portrait-blink.webp` | 688,748 | 1536 × 1024 (256 px cells) | `b192e2a85a1d2a3d3282fb6d8eda728135cf33eff9050554ed6a425283272e77` | idle (still only) |
| `portrait-doze` | `public/kiwi-mascot/frames-v3/portrait-doze.webp` | 595,390 | 1536 × 1024 (256 px cells) | `ef6c6eb5097617fc4ca40dc23aa0a0df2403ab531b28939755ce6a3fadb4db1f` | offline |
| `portrait-nod-sleep` | `public/kiwi-mascot/frames-v3/portrait-nod-sleep.webp` | 599,782 | 1536 × 1024 (256 px cells) | `c8979c6155c0f62a40a76e8a0ed1278cd3a42f6bb29740c175925a2efc01b304` | speaking, error |
| `portrait-turn` | `public/kiwi-mascot/frames-v3/portrait-turn.webp` | 597,534 | 1536 × 1024 (256 px cells) | `1304ec61676eb4683f5751b9bc6268d181b31192695d436d40b6c9b736b3c0b3` | none (thinking / listening / curious / notification are not G9 states) |
| `stamp-peek` | `public/kiwi-mascot/frames-v3/stamp-peek.webp` | 343,046 | 1536 × 1024 (256 px cells) | `61a6b5e434bf9aa892301ff609c261f2e5627a188b17561310c8edc861302d30` | peek, retract |
| **Total** | | **4,457,140** | | | |

Also in the source and **not ported**: `frames-v2/` (32 MB, superseded sources), `*.png` lossless twins (used here only to cut stills), `*.source.png`, the per-frame `<atlas>/frame-NNN.png` directories, the animated `kiwi-<state>.webp` previews (gallery downloads; no pause, reduced-motion or completion API), the v1 `kiwi-<state>.svg` rigs (superseded by the drawn frames), `KiwiLoader` (a walking journey whose end means nothing), `KiwiStamp` as the launcher (the peek moves to the composer edge, G9).

## Stills exported (one per G9 state)

| State | File | Atlas · cell | Bytes (256 px PNG) | 192 px WebP | 128 px WebP | 64 px WebP |
|---|---|---|---:|---:|---:|---:|
| `idle` | `still-idle.png` | `portrait-blink` · 0 | 40,170 | 14,776 | 8,130 | 2,998 |
| `peek` | `still-peek.png` | `stamp-peek` · 23 | 20,058 | 9,346 | 5,006 | 1,964 |
| `retract` | `still-retract.png` | `stamp-peek` · 0 | 16,662 | 5,466 | 3,128 | 1,230 |
| `walk` | `still-walk.png` | `full-walk` · 0 | 32,795 | 10,028 | 5,140 | 1,982 |
| `speaking` | `still-speaking.png` | `portrait-nod-sleep` · 0 | 36,372 | 14,006 | 7,646 | 2,750 |
| `hop` | `still-hop.png` | `full-hop-flight` · 23 | 32,165 | 9,956 | 5,250 | 1,920 |
| `wave` | `still-wave.png` | `full-wave-bow` · 8 | 30,951 | 10,536 | 5,474 | 1,974 |
| `error` | `still-error.png` | `portrait-nod-sleep` · 8 | 28,652 | 11,988 | 6,326 | 2,262 |
| `offline` | `still-offline.png` | `portrait-doze` · 23 | 32,514 | 13,516 | 7,314 | 2,614 |

## Playback atlases exported (resampled, lossless WebP, 6 × 4 cells)

| File | Cell | Bytes | Use |
|---|---:|---:|---|
| `atlas/full-walk.64.webp` | 64 | 34,942 | shipped: the 32 px tutor avatar at 2× |
| `atlas/full-walk.128.webp` | 128 | 109,236 | evidence only: the companion sheet's 128 px inspection stage |
| `atlas/portrait-nod-sleep.64.webp` | 64 | 50,852 | shipped: the 32 px tutor avatar at 2× |
| `atlas/portrait-nod-sleep.128.webp` | 128 | 163,452 | evidence only: the companion sheet's 128 px inspection stage |
| `atlas/full-hop-flight.64.webp` | 64 | 34,622 | shipped: the 32 px tutor avatar at 2× |
| `atlas/full-hop-flight.128.webp` | 128 | 107,870 | evidence only: the companion sheet's 128 px inspection stage |
| `atlas/full-wave-bow.64.webp` | 64 | 34,430 | shipped: the 32 px tutor avatar at 2× |
| `atlas/full-wave-bow.128.webp` | 128 | 107,118 | evidence only: the companion sheet's 128 px inspection stage |
| `atlas/portrait-doze.64.webp` | 64 | 53,610 | shipped: the 32 px tutor avatar at 2× |
| `atlas/portrait-doze.128.webp` | 128 | 175,252 | evidence only: the companion sheet's 128 px inspection stage |
| `atlas/stamp-peek.96.webp` | 96 | 60,786 | shipped: the 48 px composer peek at 2× |
| `atlas/stamp-peek.128.webp` | 128 | 100,186 | evidence only: the companion sheet's 128 px inspection stage |

Before the first answer completes, lazily by state: the welcome row's idle still at 128 px (8,130 B) + the newest row's idle still at 64 px (2,998 B) + `full-walk` + `portrait-nod-sleep` + `full-hop-flight` at 64 px (120,416 B) = **131,544 B**; with `stamp-peek` at 96 px (only if the student typed) **192,330 B**. Budget: 300 KB (brief done-when 7).

The whole shipped set: the five avatar atlases at 64 px (208,456 B) + `stamp-peek` at 96 px (60,786 B) + the stills the placements load (63,854 B: 64 px: idle, walk, speaking, error, offline; 128 px: idle, error; 192 px: idle, walk, error) + the launcher glyph (1,748 B) = **334,844 B**.

`launcher-glyph.svg`: 1,748 B.

## Every source file read

| Path (repo-relative) | Bytes | SHA-256 |
|---|---:|---|
| `public/kiwi-mascot/frames-v3/full-hop-flight.webp` | 564,972 | `d0514dadca7db547318ec799ac94427cf034224ff040014c6560e77b205ab85b` |
| `public/kiwi-mascot/frames-v3/full-hop-flight.png` | 826,142 | `94bcff6aac74d1b0826b0aea8e5cf271a41c11425ba91e48e4fe376dab073373` |
| `public/kiwi-mascot/frames-v3/full-walk.webp` | 571,354 | `aa6589578d81fd1b07085d9193139000279bfc4ce42bf54bcd58d159ae4519f6` |
| `public/kiwi-mascot/frames-v3/full-walk.png` | 830,741 | `4da6fc33d2293cd193f677bf71625fc061aac8d41cf5d1d022f559e3768f79e6` |
| `public/kiwi-mascot/frames-v3/full-wave-bow.webp` | 496,314 | `2c7ab49db2f3152d7cdd9efb1514aa0c7c2167cd03b955985af319906c838daa` |
| `public/kiwi-mascot/frames-v3/full-wave-bow.png` | 728,966 | `0f39cf4734b52154c53a3e3ec46aba3eed023bc35735432b22c22796f5a79b13` |
| `public/kiwi-mascot/frames-v3/portrait-blink.webp` | 688,748 | `b192e2a85a1d2a3d3282fb6d8eda728135cf33eff9050554ed6a425283272e77` |
| `public/kiwi-mascot/frames-v3/portrait-blink.png` | 1,023,020 | `8fd109f119ef63d9d468aa4a83b6165e307acd0efbdc7aa84b37efd765694853` |
| `public/kiwi-mascot/frames-v3/portrait-doze.webp` | 595,390 | `ef6c6eb5097617fc4ca40dc23aa0a0df2403ab531b28939755ce6a3fadb4db1f` |
| `public/kiwi-mascot/frames-v3/portrait-doze.png` | 887,839 | `abc3b94de7378d794ac838ff70c3be1e76fc17cf3d2f3fba39103a5b85bc4d48` |
| `public/kiwi-mascot/frames-v3/portrait-nod-sleep.webp` | 599,782 | `c8979c6155c0f62a40a76e8a0ed1278cd3a42f6bb29740c175925a2efc01b304` |
| `public/kiwi-mascot/frames-v3/portrait-nod-sleep.png` | 888,319 | `4fc57c40ceb200cb917dafa34c1503ae764eb69cd8d96269625d279d91b85041` |
| `public/kiwi-mascot/frames-v3/portrait-turn.webp` | 597,534 | `1304ec61676eb4683f5751b9bc6268d181b31192695d436d40b6c9b736b3c0b3` |
| `public/kiwi-mascot/frames-v3/portrait-turn.png` | 877,998 | `898f53e9625536e50c1283d015666df1dc072ae370b1f5a508dea95c11b96ed0` |
| `public/kiwi-mascot/frames-v3/stamp-peek.webp` | 343,046 | `61a6b5e434bf9aa892301ff609c261f2e5627a188b17561310c8edc861302d30` |
| `public/kiwi-mascot/frames-v3/stamp-peek.png` | 505,255 | `8f090cfcd357d6db97f5d43dd1e023190867185ea82879be954d4837237bab2b` |
| `src/components/KiwiMascot/KiwiArtwork.tsx` (glyph geometry) | 4,604 | `e094b733ee4dcd1e68c295c60a4f46b9fba43e9dfaba3f07f8157d5147b6cdcf` |
| `src/components/KiwiMascot/frames.ts` (timelines) | 4,305 | `1f1d5a6f96dbd31ec3252583eb683253451852577e2b3f519a1dbbbc30387be5` |
| `src/components/KiwiMascot/framing.ts` (circle framing) | 2,488 | `6dd64d4f5cad95bcb73f07916ed21105d23eef9bca8e729e0dca1b5603687476` |
