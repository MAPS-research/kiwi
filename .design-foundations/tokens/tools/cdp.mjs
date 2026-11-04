// tools/cdp.mjs — a minimal headless-Chrome DevTools-protocol helper with no dependencies, for the audits beside
// check-tokens.mjs (coarse-audit.mjs, forced-audit.mjs). Launches Chrome with a throw-away profile in the OS temp
// directory, opens one page, exposes send() / evaluate() / on(), and always kills Chrome at the end.
// Chrome is found from $CHROME or $CHROME_PATH, else the usual install locations; nothing here is machine-specific.
import { spawn } from "node:child_process";
import { existsSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const CANDIDATES = [
  process.env.CHROME, process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium",
].filter(Boolean);
export const CHROME = CANDIDATES.find((p) => existsSync(p));

export async function withPage({ url, width = 1440, height = 900, waitFor, extraArgs = [] }, fn) {
  if (!CHROME) throw new Error("no Chrome or Chromium found; set CHROME=/path/to/chrome");
  const profile = mkdtempSync(join(tmpdir(), "kiwi-cdp-"));
  const proc = spawn(CHROME, [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-sync",
    "--hide-scrollbars=false", `--window-size=${width},${height}`,
    ...extraArgs, "about:blank",
  ], { stdio: "ignore" });
  const kill = () => { try { proc.kill("SIGKILL"); } catch {} try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  process.on("exit", kill);
  try {
    let port;
    for (let i = 0; i < 100; i++) {
      const f = join(profile, "DevToolsActivePort");
      if (existsSync(f)) { port = readFileSync(f, "utf8").split("\n")[0].trim(); if (port) break; }
      await new Promise((r) => setTimeout(r, 100));
    }
    if (!port) throw new Error("Chrome did not expose a debugging port");
    const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(tgt.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    let id = 0; const pending = new Map(); const listeners = [];
    ws.onmessage = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && pending.has(m.id)) { const { res, rej } = pending.get(m.id); pending.delete(m.id); m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result); }
      else if (m.method) listeners.forEach((l) => l(m));
    };
    const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
    const on = (fnl) => listeners.push(fnl);
    const evaluate = async (expression, { awaitPromise = true } = {}) => {
      const r = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true, timeout: 120000 });
      if (r.exceptionDetails) throw new Error("eval error: " + JSON.stringify(r.exceptionDetails).slice(0, 800));
      return r.result.value;
    };
    await send("Page.enable"); await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
    const loaded = new Promise((res) => on((m) => { if (m.method === "Page.loadEventFired") res(); }));
    await send("Page.navigate", { url });
    await Promise.race([loaded, new Promise((r) => setTimeout(r, 60000))]);
    if (waitFor) for (let i = 0; i < 300; i++) { if (await evaluate(waitFor).catch(() => false)) break; await new Promise((r) => setTimeout(r, 200)); }
    const out = await fn({ send, evaluate, on });
    ws.close();
    return out;
  } finally { kill(); }
}
