#!/usr/bin/env python3
"""export-mascot.py — Phase 4 (Companion) export from the mascot source repository.

Exports into this script's own directory, from a read-only checkout of
NYUSH-ML/kiwi-ui at the pinned commit (branch kiwi-icon):

  still-<state>.png      one still per G9 state: the named 256 px atlas cell, pixels unchanged (G11)
  stills/<state>.<N>.webp the same still resampled to the 2x size of its placement (192 = 96 px slots, 128 = 64 px slots, 64 = the 32 px avatar)
  atlas/<atlas>.<N>.webp  the runtime atlases resampled to N px cells (64: the 32 px avatar at 2x; 96: the 48 px peek at 2x;
                          128: the companion sheet's inspection stage), lossless WebP, 6 x 4 cells like the source
  launcher-glyph.svg      the launcher's one-colour (currentColor) glyph: the portrait silhouette derived from the source's own
                          KiwiArtwork.tsx Portrait() geometry, scaled to 78 % and set bottom-left, with a filled speech bubble
                          top-right (review F6). One path, no mask, no colour literal: the eyes are subpaths wound against the
                          body, so the nonzero fill rule leaves them unfilled (review A-13); an icon, not mascot art
  provenance.md          repo, commit, source paths, SHA-256 of every source file read, measured sizes, this command
  inventory.json         the machine-readable twin: sizes, the budget sums, the peek wall column, each still's ink box under the
                          circle framing, and the pixel-sampled colour extremes of every shipped asset (for check-tokens.mjs § 20)

Usage:  python3 export-mascot.py --source <path to the kiwi-ui checkout at fbb4db8> [--commit <sha>]
Requires Pillow (webp support) and NumPy. Nothing here is machine-specific: the only path is the --source argument.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import subprocess
import sys
from datetime import date

import numpy as np
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
# the stills the placements load: 64 px for the states the 32 px avatar can rest on with motion off (hop and wave are skipped),
# 128 px for the inline slots (idle; error on S-08 view A; walk on not-found below md), 192 px for the 96 px slots
SHIPPED_STILLS = {64: ["idle", "walk", "speaking", "error", "offline"], 128: ["idle", "error", "walk"], 192: ["idle", "walk", "error"]}
# framing.ts: one union centre and scale per atlas (256 px camera)
FRAMING = {
    "full-hop-flight": (146.5, 126, 0.83003190847445), "full-walk": (146, 150, 0.8798355627014727),
    "full-wave-bow": (151, 157.5, 0.9277835265599006), "portrait-blink": (127, 140.5, 0.7862688297336701),
    "portrait-doze": (125.5, 145, 0.8484632115135211), "portrait-nod-sleep": (131, 142.5, 0.8304032920387532),
    "portrait-turn": (125.5, 139, 0.8160039448611324), "stamp-peek": (150, 150, 1),
}
# registration.json mask rules of the source (the forest silhouette and the tan bill)
def is_forest(r, g, b, a): return (a > 100) & (g > r * 1.12) & (r < 100)
def is_tan(r, g, b, a): return (a > 100) & (r > 140) & (g > 115) & (b > 75) & (r > g + 6) & (g > b + 8)

# ---------- the launcher glyph: Portrait() geometry from src/components/KiwiMascot/KiwiArtwork.tsx (viewBox 0 0 160 160) ----------
# The head path of the source is dropped: it lies inside the body outline, so the silhouette is body + bill + wing.
BODY = "M23 148C26 128 38 117 39 98C33 81 33 62 40 45C49 24 67 17 83 18C106 17 127 34 130 55C132 72 127 88 120 102C123 121 137 132 138 148Z"
BILL = "M89 63C93 59 98 61 102 65C119 80 139 107 152 131C155 138 151 140 146 134C129 115 110 94 88 77C82 73 83 67 89 63Z"
WING = "M34 112C19 97 14 106 20 121C25 133 34 137 41 133Z"
EYE_FRONT = (61, 68, 6.3, 6.3, 0)         # cx, cy, rx, ry, rotation
EYE_BACK = (109, 49, 3.8, 5.4, -24)
BUBBLE = "M104 18h34a12 12 0 0 1 12 12v16a12 12 0 0 1-12 12h-18l-14 12 2-12h-4a12 12 0 0 1-12-12V30a12 12 0 0 1 12-12z"
GLYPH_SCALE, GLYPH_DY = 0.78, 35          # the bird scaled to 78 % and set bottom-left; the bubble top-right

def parse_mc(d: str):
    """Parse an absolute M/C/Z path into (start, [cubic control triples])."""
    nums = [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", d)]
    start = (nums[0], nums[1]); cubics = []
    rest = nums[2:]
    for k in range(0, len(rest), 6):
        cubics.append([(rest[k], rest[k + 1]), (rest[k + 2], rest[k + 3]), (rest[k + 4], rest[k + 5])])
    return start, cubics

def flatten(d: str, steps: int = 24):
    start, cubics = parse_mc(d); pts = [start]; p0 = start
    for c1, c2, p3 in cubics:
        for t in [i / steps for i in range(1, steps + 1)]:
            x = (1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * c1[0] + 3 * (1 - t) * t ** 2 * c2[0] + t ** 3 * p3[0]
            y = (1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * c1[1] + 3 * (1 - t) * t ** 2 * c2[1] + t ** 3 * p3[1]
            pts.append((x, y))
        p0 = p3
    return pts

def signed_area(pts):
    return sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(pts, pts[1:] + pts[:1])) / 2

def reverse_mc(d: str) -> str:
    """Reverse an absolute M/C/Z path: the segments in reverse order, each with its control points swapped (same shape, opposite winding)."""
    start, cubics = parse_mc(d)
    segs = []; p0 = start
    for c1, c2, p3 in cubics:
        segs.append((p0, c1, c2, p3)); p0 = p3
    out = ["M%g %g" % segs[-1][3]]
    for p0, c1, c2, p3 in reversed(segs):
        out.append("C%g %g %g %g %g %g" % (*c2, *c1, *p0))
    return "".join(out) + "Z"

def tx(d: str) -> str:
    """Apply the glyph transform (scale 0.78, then translate 0 35) to an absolute M/C/Z path, 2-decimal output."""
    start, cubics = parse_mc(d)
    f = lambda p: (round(p[0] * GLYPH_SCALE, 2), round(p[1] * GLYPH_SCALE + GLYPH_DY, 2))
    out = ["M%g %g" % f(start)]
    for c1, c2, p3 in cubics:
        out.append("C%g %g %g %g %g %g" % (*f(c1), *f(c2), *f(p3)))
    return "".join(out) + "Z"

def eye_subpath(cx, cy, rx, ry, rot, sweep):
    """An ellipse as two arcs, transformed like the bird, wound by `sweep` (chosen against the body)."""
    cx, cy, rx, ry = cx * GLYPH_SCALE, cy * GLYPH_SCALE + GLYPH_DY, rx * GLYPH_SCALE, ry * GLYPH_SCALE
    th = math.radians(rot); dx, dy = rx * math.cos(th), rx * math.sin(th)
    p1 = (cx + dx, cy + dy); p2 = (cx - dx, cy - dy)
    return "M%.2f %.2fA%.2f %.2f %g 1 %d %.2f %.2fA%.2f %.2f %g 1 %d %.2f %.2fZ" % (p1[0], p1[1], rx, ry, rot, sweep, p2[0], p2[1], rx, ry, rot, sweep, p1[0], p1[1])

def build_glyph(commit: str) -> tuple[str, dict]:
    areas = {name: signed_area(flatten(d)) for name, d in [("body", BODY), ("bill", BILL), ("wing", WING)]}
    body_sign = 1 if areas["body"] > 0 else -1
    # every solid subpath must wind like the body (overlaps then add, never cancel); reverse any that does not
    parts = []; reversed_parts = []
    for name, d in [("body", BODY), ("bill", BILL), ("wing", WING)]:
        if (1 if areas[name] > 0 else -1) != body_sign:
            d = reverse_mc(d); reversed_parts.append(name)
            assert (1 if signed_area(flatten(d)) > 0 else -1) == body_sign
        parts.append(tx(d))
    # an arc with sweep=1 runs clockwise on screen (y down), whose shoelace sign is positive; pick the sweep against the body
    sweep = 0 if body_sign > 0 else 1
    eyes = [eye_subpath(*EYE_FRONT, sweep), eye_subpath(*EYE_BACK, sweep)]
    d = "".join(parts + eyes) + BUBBLE
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="28" height="28" fill="currentColor" aria-hidden="true" focusable="false">
  <!-- Launcher glyph (companion.slot.launcher, 28 px on the 56 px --accent-solid disc, drawn in --accent-on-solid): the companion's portrait as a
       one-colour silhouette with a filled speech bubble, so the disc reads as "chat with Kiwi" at 1x (Phase 4 review F6). One path in currentColor,
       no mask and no colour literal (review A-13): the body, bill and wing are the Portrait() paths of NYUSH-ML/kiwi-ui@{commit[:7]}
       src/components/KiwiMascot/KiwiArtwork.tsx, scaled to 78 % and set bottom-left, all wound one way; the two eyes are subpaths wound the other
       way, so the nonzero fill rule leaves them unfilled and the disc shows through (evenodd would also cut holes where the bill and wing overlap
       the body). The bubble is plain iconography, not mascot art. -->
  <path fill-rule="nonzero" d="{d}"/>
</svg>
"""
    return svg, {"bodyArea": round(areas["body"], 1), "billArea": round(areas["bill"], 1), "wingArea": round(areas["wing"], 1), "eyeSweep": sweep, "reversedToMatchBody": reversed_parts}

# ---------- helpers ----------
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

def lum(rgb):
    r, g, b = [c / 255 for c in rgb]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def pixel_extremes(im: Image.Image) -> dict:
    """The lightest and darkest forest-class pixels (alpha >= 128) and the lightest tan pixel of an image, as hex: the checker
    asserts their contrast against the resolved backing and surfaces (§ 20), so resampling can never hide an outline that fails."""
    a = np.asarray(im.convert("RGBA")).reshape(-1, 4).astype(int)
    r, g, b, al = a[:, 0], a[:, 1], a[:, 2], a[:, 3]
    solid = al >= 128
    forest = solid & is_forest(r, g, b, al); tan = solid & is_tan(r, g, b, al)
    hexs = lambda row: "#%02x%02x%02x" % (row[0], row[1], row[2])
    out = {"solidPixels": int(solid.sum()), "forestPixels": int(forest.sum()), "tanPixels": int(tan.sum())}
    if forest.any():
        fl = np.array([lum((row[0], row[1], row[2])) for row in a[forest]])
        out["forestLightest"] = hexs(a[forest][fl.argmax()]); out["forestDarkest"] = hexs(a[forest][fl.argmin()])
    if tan.any():
        tl = np.array([lum((row[0], row[1], row[2])) for row in a[tan]])
        out["tanLightest"] = hexs(a[tan][tl.argmax()])
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
    read_files: list[tuple[str, int, str]] = []
    runtime: list[dict] = []
    for a in ATLASES:
        webp = os.path.join(frames_dir, a + ".webp"); png = os.path.join(frames_dir, a + ".png")
        with Image.open(webp) as im:
            size = im.size
        runtime.append({"atlas": a, "file": f"{FRAMES}/{a}.webp", "bytes": os.path.getsize(webp), "px": size, "sha256": sha256(webp)})
        read_files.append((f"{FRAMES}/{a}.webp", os.path.getsize(webp), sha256(webp)))
        read_files.append((f"{FRAMES}/{a}.png", os.path.getsize(png), sha256(png)))

    # the peek's drawn wall (review A-3): the rightmost column with any ink, over all 24 drawings of stamp-peek
    with Image.open(os.path.join(frames_dir, "stamp-peek.png")) as im:
        arr = np.asarray(im.convert("RGBA"))
    wall = 0
    for i in range(24):
        x0, y0, x1, y1 = cell_box(i); cols = np.where(arr[y0:y1, x0:x1, 3] > 0)[1]
        if cols.size: wall = max(wall, int(cols.max()) + 1)
    peek_wall = {"column": wall, "fractionOfCanvas": round(wall / CELL, 4), "frameLeftPercent": round((CELL - wall) / CELL * 100, 2)}

    # 1. stills: the named cell of the lossless PNG twin, pixels unchanged; plus the ink box under the circle framing and the pixel extremes
    stills_out = []
    for state, (atlas, cell) in STILLS.items():
        with Image.open(os.path.join(frames_dir, atlas + ".png")) as im:
            im = im.convert("RGBA")
            frame = im.crop(cell_box(cell))
            p = os.path.join(HERE, f"still-{state}.png")
            frame.save(p, "PNG", optimize=True)
            sized = {}; extremes = {}
            for n in STILL_SIZES:
                q = os.path.join(HERE, "stills", f"{state}.{n}.webp")
                small = frame.resize((n, n), Image.LANCZOS); small.save(q, "WEBP", lossless=True, quality=100, method=6)
                sized[n] = os.path.getsize(q); extremes[n] = pixel_extremes(small)
            alpha = np.asarray(frame)[:, :, 3]; ys, xs = np.where(alpha > 0)
            cx, cy, s = FRAMING[atlas]
            left, top = 0.5 - cx / CELL * s, 0.5 - cy / CELL * s
            ink = {"canvasBox": [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
                   "slotFractions": {"left": round(left + xs.min() / CELL * s, 4), "top": round(top + ys.min() / CELL * s, 4),
                                     "right": round(left + (xs.max() + 1) / CELL * s, 4), "bottom": round(top + (ys.max() + 1) / CELL * s, 4)}}
        stills_out.append({"state": state, "atlas": atlas, "cell": cell, "file": f"still-{state}.png", "bytes": os.path.getsize(p), "sized": sized, "ink": ink, "pixels": extremes})

    # 2. playback atlases at the shipped and the inspection cell sizes, with pixel extremes of the shipped ones
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
                small = resample_atlas(im, n); small.save(q, "WEBP", lossless=True, quality=100, method=6)
                entry = {"atlas": a, "cell": n, "file": f"atlas/{a}.{n}.webp", "bytes": os.path.getsize(q), "use": label}
                if label != "stage":
                    entry["pixels"] = pixel_extremes(small)
                atlases_out.append(entry)

    # 3. the launcher glyph
    svg, glyph_meta = build_glyph(commit)
    with open(os.path.join(HERE, "launcher-glyph.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    glyph_bytes = os.path.getsize(os.path.join(HERE, "launcher-glyph.svg"))

    # 4. sums
    by = {(a["atlas"], a["cell"]): a["bytes"] for a in atlases_out}
    sized = {s["state"]: s["sized"] for s in stills_out}
    first_atlases = by[("full-walk", 64)] + by[("portrait-nod-sleep", 64)] + by[("full-hop-flight", 64)]
    first = first_atlases + sized["idle"][128] + sized["idle"][64]
    stills_bytes = sum(sized[st][n] for n, lst in SHIPPED_STILLS.items() for st in lst)
    stills_list = "; ".join(f"{n} px: {', '.join(lst)}" for n, lst in SHIPPED_STILLS.items())
    atlases64 = sum(b for (a, c), b in by.items() if c == 64)
    shipped_total = atlases64 + by[("stamp-peek", 96)] + stills_bytes + glyph_bytes
    total_runtime = sum(r["bytes"] for r in runtime)

    # 5. provenance
    lines = []
    lines.append("# Mascot assets — provenance (Phase 4, Companion)\n")
    lines.append(f"- **Source repository:** `{REPO}`, branch `{BRANCH}`, commit `{commit}` (\"feat: Add Kiwi icon and drawn-frame motion library\"). Read-only; nothing was pushed or modified there.")
    lines.append(f"- **Exported on:** {date.today().isoformat()} by `export-mascot.py` (this directory): `python3 export-mascot.py --source <checkout>`; Pillow {getattr(Image, '__version__', 'n/a')}.")
    lines.append("- **What the source holds:** `public/kiwi-mascot/` (61 MB: v2 sources, lossless PNG twins, per-frame PNGs, animated preview WebPs, the superseded v1 SVG rigs). Runtime needs only the eight v3 WebP atlases below (`frames.ts`: a state is a sequence over an atlas; 6 × 4 cells of 256 px; the 24 Hz timeline clock with explicit holds).")
    lines.append("- **Pixels:** every `still-<state>.png` is the named cell of the lossless PNG twin of its atlas, unchanged (G11: the artwork keeps its four colours, the pinned hue family `#234631 #92ae70 #f5f4e8 #ccbd99`; anti-aliased and resampled pixels vary around them, which is why the colour extremes below are sampled and asserted). The `atlas/` and `stills/` files are the same drawings resampled (Lanczos) to the 2× size of their placement and saved as lossless WebP; no recolouring, cropping, warping or interpolation between drawings.")
    lines.append("- **`launcher-glyph.svg`** is a one-colour (`currentColor`) glyph in a single path with no mask and no colour literal: the `Portrait()` body, bill and wing of `src/components/KiwiMascot/KiwiArtwork.tsx` at the same commit, scaled to 78 % and set bottom-left, all wound one way, the two eyes wound the other way so the nonzero rule leaves them unfilled, plus a filled speech bubble top-right (review F6 and A-13). It is the launcher's icon (Phase 3 icon policy: glyphs are `currentColor`), not mascot art.")
    lines.append(f"- **The peek's wall** (review A-3): the rightmost inked column over the 24 `stamp-peek` drawings is x = {peek_wall['column']} of 256 ({peek_wall['fractionOfCanvas'] * 100:.1f} %). The peek slot frames the drawing with that column on the slot's right edge (frame left {peek_wall['frameLeftPercent']} %, width 100 %), not with the union-circle framing, so the head emerges from the edge.\n")
    lines.append("## Runtime assets in the source (the port inventory), measured\n")
    lines.append("| Atlas | Source path | Bytes | Pixels | SHA-256 | G9 states |")
    lines.append("|---|---|---:|---|---|---|")
    for r in runtime:
        lines.append(f"| `{r['atlas']}` | `{r['file']}` | {r['bytes']:,} | {r['px'][0]} × {r['px'][1]} (256 px cells) | `{r['sha256']}` | {', '.join(ATLAS_STATES[r['atlas']])} |")
    lines.append(f"| **Total** | | **{total_runtime:,}** | | | |\n")
    lines.append("Also in the source and **not ported**: `frames-v2/` (32 MB, superseded sources), `*.png` lossless twins (used here only to cut stills), `*.source.png`, the per-frame `<atlas>/frame-NNN.png` directories, the animated `kiwi-<state>.webp` previews (gallery downloads; no pause, reduced-motion or completion API), the v1 `kiwi-<state>.svg` rigs (superseded by the drawn frames), `KiwiLoader` (a walking journey whose end means nothing), `KiwiStamp` as the launcher (the peek moves to the composer edge, G9).\n")
    lines.append("## Stills exported (one per G9 state)\n")
    lines.append("| State | File | Atlas · cell | Bytes (256 px PNG) | 192 px WebP | 128 px WebP | 64 px WebP | Ink box in the slot (left, top, right, bottom; fractions) |")
    lines.append("|---|---|---|---:|---:|---:|---:|---|")
    for s in stills_out:
        f = s["ink"]["slotFractions"]
        lines.append(f"| `{s['state']}` | `{s['file']}` | `{s['atlas']}` · {s['cell']} | {s['bytes']:,} | {s['sized'][192]:,} | {s['sized'][128]:,} | {s['sized'][64]:,} | {f['left']:.3f}, {f['top']:.3f}, {f['right']:.3f}, {f['bottom']:.3f} |")
    lines.append("")
    lines.append("## Playback atlases exported (resampled, lossless WebP, 6 × 4 cells)\n")
    lines.append("| File | Cell | Bytes | Use |")
    lines.append("|---|---:|---:|---|")
    for a in atlases_out:
        use = {"avatar": "shipped: the 32 px tutor avatar at 2×", "peek": "shipped: the 48 px composer peek at 2×", "stage": "evidence only: the companion sheet's 128 px inspection stage"}[a["use"]]
        lines.append(f"| `{a['file']}` | {a['cell']} | {a['bytes']:,} | {use} |")
    lines.append("")
    lines.append(f"Before the first answer completes, lazily by state: the welcome row's idle still at 128 px ({sized['idle'][128]:,} B) + the newest row's idle still at 64 px ({sized['idle'][64]:,} B) + `full-walk` + `portrait-nod-sleep` + `full-hop-flight` at 64 px ({first_atlases:,} B) = **{first:,} B**; `portrait-nod-sleep` and `full-hop-flight` are prefetched when `walk` begins, so the first answer can speak and hop (review A-6); with `stamp-peek` at 96 px (only if the student typed) **{first + by[('stamp-peek', 96)]:,} B**. Budget: 300 KB (brief done-when 7).")
    lines.append(f"\nThe whole shipped set: the five avatar atlases at 64 px ({atlases64:,} B) + `stamp-peek` at 96 px ({by[('stamp-peek', 96)]:,} B) + the stills the placements load ({stills_bytes:,} B: {stills_list}) + the launcher glyph ({glyph_bytes:,} B) = **{shipped_total:,} B**.")
    lines.append("\n## Pixel-sampled colour extremes (for `check-tokens.mjs` § 20)\n")
    lines.append("Over every solid pixel (alpha ≥ 128) of each shipped asset, classified by the source's own mask rules (`registration.json`): the lightest and the darkest forest-class pixel, and the lightest tan-class pixel. The checker resolves the backing and the light surfaces from the tokens and asserts the lightest forest pixel of every asset still clears 3:1 on each.\n")
    lines.append("| Asset | Solid px | Forest px | Forest lightest | Forest darkest | Tan lightest |")
    lines.append("|---|---:|---:|---|---|---|")
    for a in atlases_out:
        if "pixels" in a:
            px = a["pixels"]; lines.append(f"| `{a['file']}` | {px['solidPixels']:,} | {px['forestPixels']:,} | `{px.get('forestLightest', '—')}` | `{px.get('forestDarkest', '—')}` | `{px.get('tanLightest', '—')}` |")
    for s in stills_out:
        for n in STILL_SIZES:
            px = s["pixels"][n]; lines.append(f"| `stills/{s['state']}.{n}.webp` | {px['solidPixels']:,} | {px['forestPixels']:,} | `{px.get('forestLightest', '—')}` | `{px.get('forestDarkest', '—')}` | `{px.get('tanLightest', '—')}` |")
    lines.append("\n## Every source file read\n")
    lines.append("| Path (repo-relative) | Bytes | SHA-256 |")
    lines.append("|---|---:|---|")
    for p, b, h in read_files:
        lines.append(f"| `{p}` | {b:,} | `{h}` |")
    for extra, why in [("src/components/KiwiMascot/KiwiArtwork.tsx", "glyph geometry"), ("src/components/KiwiMascot/frames.ts", "timelines"), ("src/components/KiwiMascot/framing.ts", "circle framing")]:
        q = os.path.join(src, extra); lines.append(f"| `{extra}` ({why}) | {os.path.getsize(q):,} | `{sha256(q)}` |")
    with open(os.path.join(HERE, "provenance.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    with open(os.path.join(HERE, "inventory.json"), "w", encoding="utf-8") as f:
        json.dump({"repo": REPO, "branch": BRANCH, "commit": commit, "runtime": runtime, "stills": stills_out, "atlases": atlases_out,
                   "glyphBytes": glyph_bytes, "glyph": glyph_meta, "peekWall": peek_wall, "framing": {k: {"cx": v[0], "cy": v[1], "scale": v[2]} for k, v in FRAMING.items()},
                   "beforeFirstAnswer": {"atlases64": first_atlases, "idleStill128": sized["idle"][128], "idleStill64": sized["idle"][64], "total": first, "withPeek96": first + by[("stamp-peek", 96)]},
                   "shipped": {"atlases64": atlases64, "peek96": by[("stamp-peek", 96)], "stillsBytes": stills_bytes, "stillsList": stills_list, "glyph": glyph_bytes, "total": shipped_total}}, f, indent=1)
    print(f"exported {len(stills_out)} stills, {len(atlases_out)} atlases, glyph ({glyph_bytes} B, eyes sweep {glyph_meta['eyeSweep']}, body area {glyph_meta['bodyArea']}); peek wall x={peek_wall['column']}; runtime total {total_runtime:,} B; before-first-answer {first:,} B (+peek {first + by[('stamp-peek', 96)]:,} B); shipped {shipped_total:,} B")
    return 0


if __name__ == "__main__":
    sys.exit(main())
