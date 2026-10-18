#!/usr/bin/env node
// paper.mjs: draws the two lecture-slide pages the Materials mock shows on paper (assets/paper/*.webp). They are the
// PDF's own content, the way react-pdf draws a page into a canvas: content pixels, never recoloured in dark mode (G5),
// so their colours are the slide's, not tokens. The page frame, the in-context outline and the dark-mode dim around
// them are tokens (mock.css). Rendered by headless Chrome (tokens/tools/cdp.mjs) at 1280 × 720 for a 640 × 360 slot.
//   node paper.mjs
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ASSETS, CDP, TOOLS } from "./lib/paths.mjs";

const { withPage } = await import(pathToFileURL(CDP).href);
const OUT = join(ASSETS, "paper");
mkdirSync(OUT, { recursive: true });

const slide = (n, body) => `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1280px; height: 720px; background: #ffffff; }
  body { box-sizing: border-box; padding: 64px 88px; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #1f2328; position: relative; }
  .kicker { font-size: 22px; color: #5b6470; letter-spacing: .01em; }
  h1 { font-size: 52px; line-height: 1.15; margin: 18px 0 36px; font-weight: 700; }
  ul { margin: 0; padding-left: 30px; font-size: 28px; line-height: 1.55; }
  li { margin-bottom: 6px; } code { font-family: Menlo, monospace; font-size: .92em; background: #eef1f4; padding: 0 6px; border-radius: 4px; }
  .cols { display: grid; grid-template-columns: 1.15fr 1fr; gap: 56px; align-items: start; }
  .chart { border-left: 2px solid #8a929c; border-bottom: 2px solid #8a929c; height: 300px; display: flex; align-items: flex-end; gap: 34px; padding: 0 24px; }
  .bar { width: 54px; background: #8fa7bf; position: relative; } .bar.hi { background: #2f5d8a; }
  .bar b { position: absolute; top: -34px; left: 0; right: 0; text-align: center; font-size: 22px; font-weight: 600; }
  .bar i { position: absolute; bottom: -36px; left: -10px; right: -10px; text-align: center; font-size: 20px; font-style: normal; color: #5b6470; }
  .cap { font-size: 20px; color: #5b6470; margin: 0 0 18px; }
  .pg { position: absolute; right: 56px; bottom: 40px; font-size: 20px; color: #5b6470; }
  p { font-size: 28px; line-height: 1.55; margin: 0 0 18px; max-width: 980px; }
</style></head><body>${body}<div class="pg">${n}</div></body></html>`;

const P3 = slide(3, `<div class="kicker">Lecture 3 · Missing data</div><h1>Why <code>mean()</code> returns NA</h1>
<div class="cols"><ul><li>One missing value makes the whole mean missing</li><li><code>mean(x, na.rm = TRUE)</code> drops them first</li><li>Count them: <code>sum(is.na(x))</code></li><li>Ask whether they are missing at random</li></ul>
<div><p class="cap">Missing answers by question (n = 240)</p><div class="chart"><div class="bar" style="height:6%"><b>2</b><i>Q1</i></div><div class="bar" style="height:30%"><b>14</b><i>Q2</i></div><div class="bar" style="height:12%"><b>5</b><i>Q3</i></div><div class="bar hi" style="height:66%"><b>31</b><i>Income</i></div></div></div></div>`);
const P4 = slide(4, `<div class="kicker">Lecture 3 · Missing data</div><h1>Missing at random?</h1>
<p>Compare the people who answered with those who did not, on variables you observe for everyone: age, region, year of study.</p>
<p>If the groups differ, dropping the missing answers changes who the average describes.</p>`);

for (const [name, html] of [["lecture-3-page-3", P3], ["lecture-3-page-4", P4]]) {
  const file = join(TOOLS, "generated", `${name}.html`);
  mkdirSync(join(TOOLS, "generated"), { recursive: true });
  writeFileSync(file, html);
  await withPage({ url: pathToFileURL(file).href, width: 1280, height: 720 }, async ({ send }) => {
    const shot = await send("Page.captureScreenshot", { format: "webp", quality: 90 });
    writeFileSync(join(OUT, `${name}.webp`), Buffer.from(shot.data, "base64"));
  });
  console.log("wrote", `assets/paper/${name}.webp`);
}
