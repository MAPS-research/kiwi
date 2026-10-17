#!/usr/bin/env python3
"""export-mascot.py — Phase 4 (Companion) export from the mascot source repository.

Exports into this script's own directory, from a read-only checkout of
NYUSH-ML/kiwi-ui at the pinned commit (branch kiwi-icon):

  still-<state>.png      one still per G9 state: the named 256 px atlas cell, pixels unchanged (G11)
  stills/<state>.<N>.webp the same still resampled to the 2x size of its placement (192 = 96 px slots, 128 = 64 px slots, 64 = the 32 px avatar)
  atlas/<atlas>.<N>.webp  the runtime atlases resampled to N px cells (64: the 32 px avatar at 2x; 96: the 48 px peek at 2x;
                          128: the companion sheet's inspection stage), lossless WebP, 6 x 4 cells like the source
  launcher-glyph.svg      the launcher's one-colour (currentColor) glyph: the portrait silhouette derived from the source's own
                          KiwiArtwork.tsx Portrait() geometry (eyes as cut-outs), scaled to 78 % and set bottom-left, with a filled
                          speech bubble top-right (fix round 1, F6: at 24 px the head alone read as a ghost); an icon, not mascot art
  provenance.md           repo, commit, source paths, SHA-256 of every source file read, measured sizes, this command

Usage:  python3 export-mascot.py --source <path to the kiwi-ui checkout at fbb4db8> [--commit <sha>]
Requires Pillow (webp support). Nothing here is machine-specific: the only path is the --source argument.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
import sys
from datetime import date

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
PINNED = "fbb4db85f90aeda3a1250c8e9c8aa2d7473e2e11"
REPO = "NYUSH-ML/kiwi-ui"
BRANCH = "kiwi-icon"
FRAMES = "public/kiwi-mascot/frames-v3"
CELL = 256
COLS, ROWS = 6, 4

# The eight runtime atlases of the source (frames.ts: a state is a sequence over an atlas).
ATLASES = ["full-hop-flight", "full-walk", "full-wave-bow", "portrait-blink",
           "portrait-doze", "portrait-nod-sleep", "portrait-turn", "stamp-peek"]

# G9 state -> (atlas, still cell). The still is the drawing shown whenever motion is off
# at any level (DESIGN.md ## Companion, state table).
STILLS = {
    "idle": ("portrait-blink", 0),
    "peek": ("stamp-peek", 23),
    "retract": ("stamp-peek", 0),
    "walk": ("full-walk", 0),
    "speaking": ("portrait-nod-sleep", 0),
    "hop": ("full-hop-flight", 23),
    "wave": ("full-wave-bow", 8),
    "error": ("portrait-nod-sleep", 8),
    "offline": ("portrait-doze", 23),
}
# Which atlases play (the stills above come from the lossless PNG twins; playback uses these).
PLAYBACK = ["full-walk", "portrait-nod-sleep", "full-hop-flight", "full-wave-bow", "portrait-doze", "stamp-peek"]
ATLAS_STATES = {
    "full-walk": ["walk"], "portrait-nod-sleep": ["speaking", "error"], "full-hop-flight": ["hop"],
    "full-wave-bow": ["wave"], "portrait-doze": ["offline"], "stamp-peek": ["peek", "retract"],
    "portrait-blink": ["idle (still only)"], "portrait-turn": ["none (thinking / listening / curious / notification are not G9 states)"],
}
SIZES = {"avatar": 64, "peek": 96, "stage": 128}
STILL_SIZES = [192, 128, 64]

# Portrait() geometry from src/components/KiwiMascot/KiwiArtwork.tsx (viewBox 0 0 160 160), one colour.
GLYPH = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="28" height="28" fill="currentColor" aria-hidden="true" focusable="false">
  <!-- Launcher glyph (companion.slot.launcher, 28 px on the 56 px --accent-solid disc, drawn in --accent-on-solid): the companion's portrait as a
       one-colour silhouette with a filled speech bubble, so the disc reads as "chat with Kiwi" at 1x (Phase 4 review F6: at 24 px the head alone is a ghost).
       Geometry: the Portrait() paths of NYUSH-ML/kiwi-ui@%(commit)s src/components/KiwiMascot/KiwiArtwork.tsx, scaled to 78 %% and set bottom-left; the eyes
       are cut out so the disc shows through; the bubble is plain iconography, not mascot art. -->
  <defs>
    <mask id="eyes" maskUnits="userSpaceOnUse" x="0" y="0" width="160" height="160">
      <rect width="160" height="160" fill="#fff"/>
      <g transform="translate(0 35) scale(0.78)">
        <circle cx="61" cy="68" r="6.3" fill="#000"/>
        <ellipse cx="109" cy="49" rx="3.8" ry="5.4" transform="rotate(-24 109 49)" fill="#000"/>
      </g>
    </mask>
  </defs>
  <g mask="url(#eyes)" transform="translate(0 35) scale(0.78)">
    <path d="M23 148C26 128 38 117 39 98C33 81 33 62 40 45C49 24 67 17 83 18C106 17 127 34 130 55C132 72 127 88 120 102C123 121 137 132 138 148Z"/>
    <path d="M39 98C33 81 33 62 40 45C49 24 67 17 83 18C106 17 127 34 130 55C132 72 127 88 120 102C98 115 60 112 39 98Z"/>
    <path d="M89 63C93 59 98 61 102 65C119 80 139 107 152 131C155 138 151 140 146 134C129 115 110 94 88 77C82 73 83 67 89 63Z"/>
    <path d="M34 112C19 97 14 106 20 121C25 133 34 137 41 133Z"/>
  </g>
  <path d="M104 18h34a12 12 0 0 1 12 12v16a12 12 0 0 1-12 12h-18l-14 12 2-12h-4a12 12 0 0 1-12-12V30a12 12 0 0 1 12-12z"/>
</svg>
"""


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def cell_box(index: int, cell: int = CELL) -> tuple[int, int, int, int]:
    c, r = index % COLS, index // COLS
    return (c * cell, r * cell, (c + 1) * cell, (r + 1) * cell)


def resample_atlas(atlas: Image.Image, cell: int) -> Image.Image:
    out = Image.new("RGBA", (COLS * cell, ROWS * cell), (0, 0, 0, 0))
    for i in range(COLS * ROWS):
        frame = atlas.crop(cell_box(i)).resize((cell, cell), Image.LANCZOS)
        out.paste(frame, (i % COLS * cell, i // COLS * cell))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", required=True, help="path to the NYUSH-ML/kiwi-ui checkout at the pinned commit")
    ap.add_argument("--commit", default=None, help="override the commit recorded in provenance (default: git rev-parse HEAD of --source)")
    args = ap.parse_args()
    src = os.path.abspath(args.source)
    frames_dir = os.path.join(src, FRAMES)
    if not os.path.isdir(frames_dir):
        print(f"error: {FRAMES} not found under --source", file=sys.stderr)
        return 2
    commit = args.commit
    if commit is None:
        try:
            commit = subprocess.check_output(["git", "-C", src, "rev-parse", "HEAD"], text=True).strip()
        except Exception:
            commit = PINNED
    if commit != PINNED:
        print(f"warning: --source is at {commit}, the plan pins {PINNED}", file=sys.stderr)

    os.makedirs(os.path.join(HERE, "atlas"), exist_ok=True)
    os.makedirs(os.path.join(HERE, "stills"), exist_ok=True)
    read_files: list[tuple[str, int, str]] = []  # (repo-relative path, bytes, sha256)
    runtime: list[dict] = []
    for a in ATLASES:
        webp = os.path.join(frames_dir, a + ".webp")
        png = os.path.join(frames_dir, a + ".png")
        with Image.open(webp) as im:
            size = im.size
        runtime.append({"atlas": a, "file": f"{FRAMES}/{a}.webp", "bytes": os.path.getsize(webp), "px": size, "sha256": sha256(webp)})
        read_files.append((f"{FRAMES}/{a}.webp", os.path.getsize(webp), sha256(webp)))
        read_files.append((f"{FRAMES}/{a}.png", os.path.getsize(png), sha256(png)))

    # 1. stills: the named cell of the lossless PNG twin, pixels unchanged
    stills_out = []
    for state, (atlas, cell) in STILLS.items():
        with Image.open(os.path.join(frames_dir, atlas + ".png")) as im:
            im = im.convert("RGBA")
            frame = im.crop(cell_box(cell))
            p = os.path.join(HERE, f"still-{state}.png")
            frame.save(p, "PNG", optimize=True)
            sized = {}
            for n in STILL_SIZES:
                q = os.path.join(HERE, "stills", f"{state}.{n}.webp")
                frame.resize((n, n), Image.LANCZOS).save(q, "WEBP", lossless=True, quality=100, method=6)
                sized[n] = os.path.getsize(q)
        stills_out.append({"state": state, "atlas": atlas, "cell": cell, "file": f"still-{state}.png", "bytes": os.path.getsize(p), "sized": sized})

    # 2. playback atlases at the shipped and the inspection cell sizes
    atlases_out = []
    for a in PLAYBACK:
        with Image.open(os.path.join(frames_dir, a + ".png")) as im:
            im = im.convert("RGBA")
            for label, n in SIZES.items():
                if label == "peek" and a != "stamp-peek":
                    continue
                if label == "avatar" and a == "stamp-peek":
                    continue  # the peek never plays in the 32 px avatar slot; it ships at 96 only
                q = os.path.join(HERE, "atlas", f"{a}.{n}.webp")
                resample_atlas(im, n).save(q, "WEBP", lossless=True, quality=100, method=6)
                atlases_out.append({"atlas": a, "cell": n, "file": f"atlas/{a}.{n}.webp", "bytes": os.path.getsize(q), "use": label})

    # 3. the launcher glyph
    with open(os.path.join(HERE, "launcher-glyph.svg"), "w", encoding="utf-8") as f:
        f.write(GLYPH % {"commit": commit[:7]})
    glyph_bytes = os.path.getsize(os.path.join(HERE, "launcher-glyph.svg"))

    # 4. provenance
    total_runtime = sum(r["bytes"] for r in runtime)
    lines = []
    lines.append("# Mascot assets — provenance (Phase 4, Companion)\n")
    lines.append(f"- **Source repository:** `{REPO}`, branch `{BRANCH}`, commit `{commit}` (\"feat: Add Kiwi icon and drawn-frame motion library\"). Read-only; nothing was pushed or modified there.")
    lines.append(f"- **Exported on:** {date.today().isoformat()} by `export-mascot.py` (this directory): `python3 export-mascot.py --source <checkout>`; Pillow {Image.__version__ if hasattr(Image, '__version__') else 'n/a'}.")
    lines.append("- **What the source holds:** `public/kiwi-mascot/` (61 MB: v2 sources, lossless PNG twins, per-frame PNGs, animated preview WebPs, the superseded v1 SVG rigs). Runtime needs only the eight v3 WebP atlases below (`frames.ts`: a state is a sequence over an atlas; 6 × 4 cells of 256 px; the 24 Hz timeline clock with explicit holds).")
    lines.append("- **Pixels:** every `still-<state>.png` is the named cell of the lossless PNG twin of its atlas, unchanged (G11: the artwork keeps its exact colours `#234631 #92ae70 #f5f4e8 #ccbd99`). The `atlas/` and `stills/` files are the same drawings resampled (Lanczos) to the 2× size of their placement and saved as lossless WebP; no recolouring, cropping, warping or interpolation between drawings.")
    lines.append("- **`launcher-glyph.svg`** is a one-colour (`currentColor`) glyph: the `Portrait()` path geometry of `src/components/KiwiMascot/KiwiArtwork.tsx` at the same commit, with the eyes cut out, scaled to 78 % and set bottom-left, plus a filled speech bubble top-right (fix round 1, review F6: at 24 px the head alone read as a ghost; the bubble restores the chat signifier). It is the launcher's icon (Phase 3 icon policy: glyphs are `currentColor`), not mascot art.\n")
    lines.append("## Runtime assets in the source (the port inventory), measured\n")
    lines.append("| Atlas | Source path | Bytes | Pixels | SHA-256 | G9 states |")
    lines.append("|---|---|---:|---|---|---|")
    for r in runtime:
        lines.append(f"| `{r['atlas']}` | `{r['file']}` | {r['bytes']:,} | {r['px'][0]} × {r['px'][1]} (256 px cells) | `{r['sha256']}` | {', '.join(ATLAS_STATES[r['atlas']])} |")
    lines.append(f"| **Total** | | **{total_runtime:,}** | | | |\n")
    lines.append("Also in the source and **not ported**: `frames-v2/` (32 MB, superseded sources), `*.png` lossless twins (used here only to cut stills), `*.source.png`, the per-frame `<atlas>/frame-NNN.png` directories, the animated `kiwi-<state>.webp` previews (gallery downloads; no pause, reduced-motion or completion API), the v1 `kiwi-<state>.svg` rigs (superseded by the drawn frames), `KiwiLoader` (a walking journey whose end means nothing), `KiwiStamp` as the launcher (the peek moves to the composer edge, G9).\n")
    lines.append("## Stills exported (one per G9 state)\n")
    lines.append("| State | File | Atlas · cell | Bytes (256 px PNG) | 192 px WebP | 128 px WebP | 64 px WebP |")
    lines.append("|---|---|---|---:|---:|---:|---:|")
    for s in stills_out:
        lines.append(f"| `{s['state']}` | `{s['file']}` | `{s['atlas']}` · {s['cell']} | {s['bytes']:,} | {s['sized'][192]:,} | {s['sized'][128]:,} | {s['sized'][64]:,} |")
    lines.append("")
    lines.append("## Playback atlases exported (resampled, lossless WebP, 6 × 4 cells)\n")
    lines.append("| File | Cell | Bytes | Use |")
    lines.append("|---|---:|---:|---|")
    for a in atlases_out:
        use = {"avatar": "shipped: the 32 px tutor avatar at 2×", "peek": "shipped: the 48 px composer peek at 2×", "stage": "evidence only: the companion sheet's 128 px inspection stage"}[a["use"]]
        lines.append(f"| `{a['file']}` | {a['cell']} | {a['bytes']:,} | {use} |")
    by = {(a["atlas"], a["cell"]): a["bytes"] for a in atlases_out}
    sized = {s["state"]: s["sized"] for s in stills_out}
    first_atlases = by[("full-walk", 64)] + by[("portrait-nod-sleep", 64)] + by[("full-hop-flight", 64)]
    first = first_atlases + sized["idle"][128] + sized["idle"][64]
    # the stills the placements load: 64 px for the states the 32 px avatar can rest on with motion off (hop and wave are skipped),
    # 128 px for the inline slots (idle; error on S-08 view A), 192 px for the 96 px slots (idle; walk on not-found; error on the error frame)
    SHIPPED_STILLS = {64: ["idle", "walk", "speaking", "error", "offline"], 128: ["idle", "error"], 192: ["idle", "walk", "error"]}
    stills_bytes = sum(sized[st][n] for n, lst in SHIPPED_STILLS.items() for st in lst)
    stills_list = "; ".join(f"{n} px: {', '.join(lst)}" for n, lst in SHIPPED_STILLS.items())
    atlases64 = sum(b for (a, c), b in by.items() if c == 64)
    shipped_total = atlases64 + by[("stamp-peek", 96)] + stills_bytes + glyph_bytes
    lines.append("")
    lines.append(f"Before the first answer completes, lazily by state: the welcome row's idle still at 128 px ({sized['idle'][128]:,} B) + the newest row's idle still at 64 px ({sized['idle'][64]:,} B) + `full-walk` + `portrait-nod-sleep` + `full-hop-flight` at 64 px ({first_atlases:,} B) = **{first:,} B**; with `stamp-peek` at 96 px (only if the student typed) **{first + by[('stamp-peek', 96)]:,} B**. Budget: 300 KB (brief done-when 7).")
    lines.append(f"\nThe whole shipped set: the five avatar atlases at 64 px ({atlases64:,} B) + `stamp-peek` at 96 px ({by[('stamp-peek', 96)]:,} B) + the stills the placements load ({stills_bytes:,} B: {stills_list}) + the launcher glyph ({glyph_bytes:,} B) = **{shipped_total:,} B**.")
    lines.append(f"\n`launcher-glyph.svg`: {glyph_bytes:,} B.\n")
    lines.append("## Every source file read\n")
    lines.append("| Path (repo-relative) | Bytes | SHA-256 |")
    lines.append("|---|---:|---|")
    for p, b, h in read_files:
        lines.append(f"| `{p}` | {b:,} | `{h}` |")
    lines.append(f"| `src/components/KiwiMascot/KiwiArtwork.tsx` (glyph geometry) | {os.path.getsize(os.path.join(src, 'src/components/KiwiMascot/KiwiArtwork.tsx')):,} | `{sha256(os.path.join(src, 'src/components/KiwiMascot/KiwiArtwork.tsx'))}` |")
    lines.append(f"| `src/components/KiwiMascot/frames.ts` (timelines) | {os.path.getsize(os.path.join(src, 'src/components/KiwiMascot/frames.ts')):,} | `{sha256(os.path.join(src, 'src/components/KiwiMascot/frames.ts'))}` |")
    lines.append(f"| `src/components/KiwiMascot/framing.ts` (circle framing) | {os.path.getsize(os.path.join(src, 'src/components/KiwiMascot/framing.ts')):,} | `{sha256(os.path.join(src, 'src/components/KiwiMascot/framing.ts'))}` |")
    with open(os.path.join(HERE, "provenance.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    # machine-readable twin for the sheet and the checks
    with open(os.path.join(HERE, "inventory.json"), "w", encoding="utf-8") as f:
        json.dump({"repo": REPO, "branch": BRANCH, "commit": commit, "runtime": runtime, "stills": stills_out, "atlases": atlases_out,
                   "glyphBytes": glyph_bytes, "beforeFirstAnswer": {"atlases64": first_atlases, "idleStill128": sized["idle"][128], "idleStill64": sized["idle"][64], "total": first, "withPeek96": first + by[("stamp-peek", 96)]},
                   "shipped": {"atlases64": atlases64, "peek96": by[("stamp-peek", 96)], "stillsBytes": stills_bytes, "stillsList": stills_list, "glyph": glyph_bytes, "total": shipped_total}}, f, indent=1)
    print(f"exported {len(stills_out)} stills, {len(atlases_out)} atlases, glyph; runtime total {total_runtime:,} B; before-first-answer {first:,} B (+peek {first + by[('stamp-peek', 96)]:,} B)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
