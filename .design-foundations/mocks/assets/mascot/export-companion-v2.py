#!/usr/bin/env python3
"""export-companion-v2.py: the companion v2 assets (kiwi-ui/DESIGN.md § Companion, the 2026-10-19 amendment), made from files
already in this folder and from the original logo; nothing is redrawn.

  line/{walk,hop}.{light,dark}.webp  the status line's drawings: the 64 px cells of atlas/full-walk.64.webp and
                                      atlas/full-hop-flight.64.webp (6 x 4), each padded to 72 px (4 px of transparency on
                                      every side) so the dark set's rim never clips at the bill's tip; the dark set carries a
                                      cream (#f5f4e8) die-cut rim behind the drawing (the forest outline is about 1.5:1 on the
                                      dark sheet). The drawing's own pixels are never recoloured, resampled or warped (G11).
  line/stand.{light,dark}.webp        the standing still (stills/stand.64.webp, full-hop-flight 23), padded and rimmed alike
  launcher-round.svg                  the launcher's face: the original logo in round form (step C). The button's circle is
                                      the logo's sage ground (no tile); the bird is the logo's own paths in its own colours,
                                      scaled 0.68 about the circle's lower left (135 degrees), so the neck stays cut by the
                                      arc; a plain forest speech bubble sits inside the circle. A shade layer under the bird
                                      takes the hover and pressed opacities; the 1 px edge runs over the bird, all the way round.
  v2-inventory.json                   bytes, sha256 and the pixel samples check-tokens.mjs § 20 asserts: the lightest forest
                                      pixel of every light line cell, the darkest rim pixel of every dark one, the original
                                      logo's forest core at the sizes it is drawn, and the round launcher's forest in each state

The logo is read from ../brand/kiwi-mark.svg (the same file as kiwi-ui/public/assets/images/kiwi-mark.svg and favicon.svg).
Rasters of the logo and the launcher are drawn here from the same paths, 8x supersampled and box-filtered, for the samples
only. Nothing here is machine-specific.
  python3 export-companion-v2.py
"""
from __future__ import annotations

import hashlib
import json
import math
import re
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import distance_transform_edt

HERE = Path(__file__).resolve().parent
MARK = HERE.parent / "brand" / "kiwi-mark.svg"
LINE = HERE / "line"
CELL, PAD, COLS, ROWS = 64, 4, 6, 4
RIM_PX = 3.0
C = {"forest": "#234631", "sage": "#92ae70", "cream": "#f5f4e8", "tan": "#ccbd99"}
CREAM = tuple(int(C["cream"][i:i + 2], 16) for i in (1, 3, 5))

# the launcher, step C (the user, 2026-10-18 and 2026-10-19; plan Decision Log "Launcher glyph", "Launcher bubble and sizes",
# "Launcher size step"): the 160 box is the 56 px disc
ROUND_K = 0.68
ROUND_ANCHOR_DEG = 135
ROUND_BUBBLE = (70, 24, 56, 40, 12)  # x, y, w, h, r
EDGE_W = 160 / 56  # 1 px at 56 px
LOGO_SIZES = (16, 24, 28, 32, 48, 64, 96)
SHADES = {"rest": 0.0, "hovered": 0.10, "pressed": 0.18}  # companion.launcher.shade-hover / -active


# ---------------------------------------------------------------- the source paths
mark = MARK.read_text()
side = mark[mark.index('class="kiwi-icon-side"'):mark.index('class="kiwi-icon-peek"')]
feathers = re.findall(r'class="kiwi-feather" d="([^"]+)"', side)
BODY, HEAD = feathers[0], feathers[1]
BILL = re.search(r'class="kiwi-bill" d="([^"]+)"', side).group(1)
m = re.search(r'<circle class="kiwi-cream" cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', side)
EYE = (float(m.group(1)), float(m.group(2)), float(m.group(3)))
if 'class="kiwi-tile" width="160" height="160" rx="35"' not in mark:
    raise SystemExit("kiwi-mark.svg no longer has the 160 px tile with rx 35; re-check the source")
TILE_RX = 35


def flatten(d: str, steps: int = 32) -> list[list[tuple[float, float]]]:
    toks = re.findall(r"[MLHVCZmlhvcz]|-?\d*\.?\d+(?:e-?\d+)?", d)
    loops, cur, i, cmd, pos = [], [], 0, None, (0.0, 0.0)

    def num():
        nonlocal i
        v = float(toks[i]); i += 1; return v
    while i < len(toks):
        t = toks[i]
        if re.match(r"[A-Za-z]", t):
            cmd = t; i += 1
            if cmd in "Zz":
                if cur: loops.append(cur)
                cur = []
                continue
        if cmd is None or cmd.islower():
            raise ValueError("only absolute M L H V C Z are used by these sources")
        if cmd == "M":
            if cur: loops.append(cur)
            pos = (num(), num()); cur = [pos]; cmd = "L"
        elif cmd == "L":
            pos = (num(), num()); cur.append(pos)
        elif cmd == "H":
            pos = (num(), pos[1]); cur.append(pos)
        elif cmd == "V":
            pos = (pos[0], num()); cur.append(pos)
        elif cmd == "C":
            p1, p2, p3 = (num(), num()), (num(), num()), (num(), num())
            p0 = pos
            for k in range(1, steps + 1):
                u = k / steps; a = 1 - u
                cur.append((a**3 * p0[0] + 3 * a * a * u * p1[0] + 3 * a * u * u * p2[0] + u**3 * p3[0],
                            a**3 * p0[1] + 3 * a * a * u * p1[1] + 3 * a * u * u * p2[1] + u**3 * p3[1]))
            pos = p3
    if cur: loops.append(cur)
    return loops


def hexrgb(h: str) -> tuple[int, int, int]:
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def lum(rgb) -> float:
    f = lambda c: (c / 255) / 12.92 if c / 255 <= 0.04045 else ((c / 255 + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])


def hexs(rgb) -> str:
    return "#%02x%02x%02x" % tuple(int(round(v)) for v in rgb[:3])


# the source's own mask rules (registration.json; export-mascot.py)
def is_forest(r, g, b, a): return (a > 100) & (g > r * 1.12) & (r < 100)
def is_cream(r, g, b, a): return (a > 100) & (r > 200) & (g > 200) & (b > 170) & (abs(r - g) < 24)


# ---------------------------------------------------------------- the line's drawings
def rimmed(cell: Image.Image, rim: bool) -> Image.Image:
    padded = Image.new("RGBA", (CELL + 2 * PAD, CELL + 2 * PAD), (0, 0, 0, 0))
    padded.paste(cell, (PAD, PAD))
    if not rim:
        return padded
    a = np.asarray(padded, dtype=np.float64)[..., 3] / 255.0
    d = distance_transform_edt(~(a >= 0.5))
    rim_a = np.maximum(np.clip(RIM_PX + 0.5 - d, 0.0, 1.0), a)  # under the drawing too, so its edge blends onto cream
    under = np.zeros((*a.shape, 4), dtype=np.uint8)
    under[..., 0], under[..., 1], under[..., 2] = CREAM
    under[..., 3] = (rim_a * 255).round().astype(np.uint8)
    base = Image.fromarray(under, "RGBA")
    base.alpha_composite(padded)
    return base


def cell_samples(img: Image.Image, rim: bool) -> dict:
    a = np.asarray(img.convert("RGBA")).reshape(-1, 4).astype(int)
    r, g, b, al = a[:, 0], a[:, 1], a[:, 2], a[:, 3]
    solid = al >= 128
    out = {}
    if rim:
        cream = solid & is_cream(r, g, b, al)
        out["rimPixels"] = int(cream.sum())
        if cream.any():
            ls = np.array([lum(row) for row in a[cream]]); out["rimDarkest"] = hexs(a[cream][ls.argmin()])
    else:
        forest = solid & is_forest(r, g, b, al)
        out["forestPixels"] = int(forest.sum())
        if forest.any():
            ls = np.array([lum(row) for row in a[forest]]); out["forestLightest"] = hexs(a[forest][ls.argmax()])
    return out


def build_atlas(src: Path, rim: bool) -> tuple[Image.Image, list[dict]]:
    im = Image.open(src).convert("RGBA")
    if im.size != (CELL * COLS, CELL * ROWS):
        raise SystemExit(f"{src.name}: expected {CELL * COLS} x {CELL * ROWS}, got {im.size}")
    S = CELL + 2 * PAD
    out = Image.new("RGBA", (S * COLS, S * ROWS), (0, 0, 0, 0))
    cells = []
    for i in range(COLS * ROWS):
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        c = rimmed(im.crop((x, y, x + CELL, y + CELL)), rim)
        out.paste(c, ((i % COLS) * S, (i // COLS) * S))
        cells.append({"cell": i, **cell_samples(c, rim)})
    return out, cells


def save_webp(img: Image.Image, path: Path) -> dict:
    img.save(path, "WEBP", lossless=True, quality=100, method=6)
    b = path.read_bytes()
    return {"file": path.relative_to(HERE).as_posix(), "bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()[:16], "size": list(img.size)}


# ---------------------------------------------------------------- rasters for the samples (the logo, the launcher)
S8 = 8


def draw_paths(size: int, layers, clip=None, ground=None) -> Image.Image:
    """layers: (colour, [loops in the 160 box]); clip: a mask function (draw, scale) drawn at 8x; ground: a colour filling the clip."""
    N = size * S8
    sc = N / 160
    img = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    if ground:
        g = Image.new("RGBA", (N, N), hexrgb(ground) + (255,)); img.alpha_composite(g)
    for colour, loops in layers:
        mk = Image.new("L", (N, N), 0); dr = ImageDraw.Draw(mk)
        for loop in loops:
            dr.polygon([(x * sc, y * sc) for x, y in loop], fill=255)
        layer = Image.new("RGBA", (N, N), hexrgb(colour) + (255,)); layer.putalpha(mk)
        img.alpha_composite(layer)
    if clip:
        cm = Image.new("L", (N, N), 0); clip(ImageDraw.Draw(cm), sc)
        alpha = np.minimum(np.asarray(img)[..., 3], np.asarray(cm))
        arr = np.asarray(img).copy(); arr[..., 3] = alpha; img = Image.fromarray(arr, "RGBA")
    return img.resize((size, size), Image.BOX)


def circle_loop(cx, cy, r, n=64):
    return [(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)) for k in range(n)]


def logo_raster(size: int) -> Image.Image:
    tile = lambda dr, sc: dr.rounded_rectangle([0, 0, 160 * sc - 1, 160 * sc - 1], radius=TILE_RX * sc, fill=255)
    layers = [(C["forest"], flatten(BODY) + flatten(HEAD)), (C["tan"], flatten(BILL)), (C["cream"], [circle_loop(*EYE)])]
    return draw_paths(size, layers, clip=tile, ground=C["sage"])


def round_anchor() -> tuple[float, float]:
    t = math.radians(ROUND_ANCHOR_DEG)
    return (80 + 80 * math.cos(t), 80 + 80 * math.sin(t))


def tf(loops, k, q):
    return [[(q[0] + k * (x - q[0]), q[1] + k * (y - q[1])) for x, y in loop] for loop in loops]


def round_tail(x, y, w, h):
    return x + 0.18 * w, x + 0.40 * w, x + 0.06 * w, y + 1.36 * h


def launcher_raster(shade: float, size: int = 56) -> Image.Image:
    q = round_anchor()
    x, y, w, h, r = ROUND_BUBBLE
    a, b, tx, ty = round_tail(x, y, w, h)
    fr, fg, fb = hexrgb(C["forest"]); sr, sg, sb = hexrgb(C["sage"])
    ground = hexs((sr * (1 - shade) + fr * shade, sg * (1 - shade) + fg * shade, sb * (1 - shade) + fb * shade))
    disc = lambda dr, sc: dr.ellipse([0, 0, 160 * sc - 1, 160 * sc - 1], fill=255)
    layers = [(C["forest"], tf(flatten(BODY) + flatten(HEAD), ROUND_K, q)), (C["tan"], tf(flatten(BILL), ROUND_K, q)),
              (C["cream"], tf([circle_loop(*EYE)], ROUND_K, q))]
    img = draw_paths(size, layers, clip=disc, ground=ground)
    # the bubble (a rounded rectangle and its tail), drawn over the bird's layer and inside the circle
    N = size * S8; sc = N / 160
    bm = Image.new("L", (N, N), 0); dr = ImageDraw.Draw(bm)
    dr.rounded_rectangle([x * sc, y * sc, (x + w) * sc, (y + h) * sc], radius=r * sc, fill=255)
    dr.polygon([(a * sc, (y + h - 1) * sc), (b * sc, (y + h - 1) * sc), (tx * sc, ty * sc)], fill=255)
    bub = Image.new("RGBA", (N, N), hexrgb(C["forest"]) + (255,)); bub.putalpha(bm)
    return Image.alpha_composite(img, bub.resize((size, size), Image.BOX)), ground


def forest_core(img: Image.Image, sample_xy) -> dict:
    a = np.asarray(img.convert("RGBA")).astype(int)
    F = np.array(hexrgb(C["forest"]))
    core = (a[..., 3] == 255) & (np.abs(a[..., :3] - F).sum(axis=2) < 18)
    sx, sy = sample_xy
    s = a[sy, sx, :3]
    out = {"forestCorePixels": int(core.sum()), "groundSample": hexs(s)}
    if core.any():
        out["forestCore"] = hexs(a[core][:, :3].mean(axis=0))
    return out


# ---------------------------------------------------------------- the launcher's face (SVG)
def round_bubble_d(x, y, w, h, r) -> str:
    a, b, tx, ty = round_tail(x, y, w, h)
    return (f"M{x + r:g} {y:g}H{x + w - r:g}A{r:g} {r:g} 0 0 1 {x + w:g} {y + r:g}V{y + h - r:g}"
            f"A{r:g} {r:g} 0 0 1 {x + w - r:g} {y + h:g}H{b:g}L{tx:g} {ty:g}L{a:g} {y + h:g}H{x + r:g}"
            f"A{r:g} {r:g} 0 0 1 {x:g} {y + h - r:g}V{y + r:g}A{r:g} {r:g} 0 0 1 {x + r:g} {y:g}Z")


def launcher_svg() -> str:
    ex, ey, er = EYE
    qx, qy = round_anchor()
    k = ROUND_K
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="56" height="56" class="launcher-face" aria-hidden="true" focusable="false">'
        '<!-- The launcher (kiwi-ui/DESIGN.md § Companion, v2, step C): the original logo in round form. The button sets two local properties: '
        '--launcher-face-shade (0, or companion.launcher.shade-hover / -active) and --launcher-face-edge (focus: --focus-ring at 2 px). '
        'Clip ids must be made unique per copy in a page. -->'
        '<defs><clipPath id="launcher-face-disc"><circle cx="80" cy="80" r="80"/></clipPath></defs>'
        f'<circle cx="80" cy="80" r="80" fill="{C["sage"]}"/>'
        f'<circle class="shade" cx="80" cy="80" r="80" fill="{C["forest"]}" style="fill-opacity:var(--launcher-face-shade, 0)"/>'
        f'<g clip-path="url(#launcher-face-disc)"><g transform="translate({qx:.3f} {qy:.3f}) scale({k:g}) translate({-qx:.3f} {-qy:.3f})">'
        f'<path fill="{C["forest"]}" d="{BODY}"/><path fill="{C["forest"]}" d="{HEAD}"/><path fill="{C["tan"]}" d="{BILL}"/>'
        f'<circle fill="{C["cream"]}" cx="{ex:g}" cy="{ey:g}" r="{er:g}"/></g></g>'
        f'<circle class="edge" cx="80" cy="80" r="{80 - EDGE_W / 2:.3f}" fill="none" stroke-width="{EDGE_W:.3f}" '
        'style="stroke:var(--launcher-face-edge, var(--launcher-border))"/>'
        f'<path class="bubble" fill="{C["forest"]}" d="{round_bubble_d(*ROUND_BUBBLE)}"/>'
        '</svg>\n')


def main() -> None:
    LINE.mkdir(parents=True, exist_ok=True)
    inv = {"about": "Companion v2 assets (kiwi-ui/DESIGN.md § Companion, 2026-10-19): written by export-companion-v2.py; read by check-tokens.mjs § 20.",
           "line": {"cell": CELL + 2 * PAD, "inner": CELL, "pad": PAD, "columns": COLS, "rows": ROWS, "rimPx": RIM_PX, "rim": C["cream"],
                    "camera": "the 256 px Phase 4 camera maps to the inner 64 px; the padded cell spans 288 camera units", "files": {}},
           "launcher": {}, "logo": {}}
    for name, src in (("walk", HERE / "atlas" / "full-walk.64.webp"), ("hop", HERE / "atlas" / "full-hop-flight.64.webp")):
        for mode in ("light", "dark"):
            img, cells = build_atlas(src, mode == "dark")
            inv["line"]["files"][f"{name}.{mode}"] = {**save_webp(img, LINE / f"{name}.{mode}.webp"), "mode": mode, "cells": cells}
    stand = Image.open(HERE / "stills" / "stand.64.webp").convert("RGBA")
    if stand.size != (CELL, CELL):
        raise SystemExit(f"stand.64.webp: expected {CELL} px, got {stand.size}")
    for mode in ("light", "dark"):
        img = rimmed(stand, mode == "dark")
        inv["line"]["files"][f"stand.{mode}"] = {**save_webp(img, LINE / f"stand.{mode}.webp"), "mode": mode, "cells": [{"cell": 0, **cell_samples(img, mode == "dark")}]}
    svg = launcher_svg()
    (HERE / "launcher-round.svg").write_text(svg)
    inv["launcher"] = {"file": "launcher-round.svg", "bytes": len(svg.encode()), "step": "C", "scale": ROUND_K, "anchorDeg": ROUND_ANCHOR_DEG,
                       "bubble": list(ROUND_BUBBLE), "states": {}}
    for state, shade in SHADES.items():
        img, ground = launcher_raster(shade)
        inv["launcher"]["states"][state] = {"shade": shade, "ground": ground, **forest_core(img, (round(135 / 160 * 56), round(105 / 160 * 56)))}
    for px in LOGO_SIZES:
        k = round(px * 0.12)
        inv["logo"][str(px)] = forest_core(logo_raster(px), (k, k))
    inv["logo"]["file"] = "../brand/kiwi-mark.svg"
    (HERE / "v2-inventory.json").write_text(json.dumps(inv, indent=1) + "\n")
    print(json.dumps({k: v["bytes"] for k, v in inv["line"]["files"].items()}), "launcher", inv["launcher"]["bytes"], "B")
    print("launcher", {s: (v["forestCore"], v["groundSample"], v["forestCorePixels"]) for s, v in inv["launcher"]["states"].items()})
    print("logo", {s: (v.get("forestCore"), v["groundSample"], v["forestCorePixels"]) for s, v in inv["logo"].items() if s != "file"})


if __name__ == "__main__":
    main()
