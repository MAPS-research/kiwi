/* Kiwi UI Stage 1 preview: the preview frame (outside the product). It holds the product in an iframe whose viewport is
   really 1440 or 390 px wide, scales it to the window, and sends it the frame's choices: screen, theme, width, and the
   chat demo's Offline, Fail the next answer and Reduced motion controls. It talks to the product by postMessage only. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const frame = $("#product"), device = $("#device"), stage = $("#stage"), note = $("#pv-note");
  const SIZES = { 1440: [1440, 900], 390: [390, 844] };
  const st = { width: 1440, theme: "light", screen: "chat" };
  const send = (cmd, extra = {}) => frame.contentWindow && frame.contentWindow.postMessage({ source: "kiwi-preview-frame", cmd, ...extra }, "*");
  function fit() {
    const [w, h] = SIZES[st.width];
    const r = stage.getBoundingClientRect();
    const s = Math.min(1, (r.width - 32) / w, (window.innerHeight - r.top - 24) / h);
    device.style.width = w + "px"; device.style.height = h + "px";
    device.style.transform = `scale(${s})`;
    $("#device-box").style.width = Math.round(w * s) + "px"; $("#device-box").style.height = Math.round(h * s) + "px";
    $("#pv-scale").textContent = `${w} × ${h} · ${Math.round(s * 100)} %`;
  }
  const press = (group, value) => { for (const b of $$(`[data-group="${group}"]`)) b.setAttribute("aria-pressed", String(b.dataset.value === String(value))); };
  let noteTimer = null;
  const say = (text) => { note.textContent = text; clearTimeout(noteTimer); noteTimer = setTimeout(() => { note.textContent = ""; }, 5000); };
  for (const b of $$("[data-group]")) b.addEventListener("click", () => {
    const g = b.dataset.group, v = b.dataset.value;
    if (g === "screen") { st.screen = v; send("screen", { screen: v }); press("screen", v); }
    if (g === "theme") { st.theme = v; send("theme", { theme: v }); press("theme", v); }
    if (g === "width") { st.width = Number(v); press("width", v); fit(); }
  });
  for (const t of $$("[data-toggle]")) t.addEventListener("click", () => {
    const on = t.getAttribute("aria-pressed") !== "true"; t.setAttribute("aria-pressed", String(on));
    send(t.dataset.toggle, { on });
    if (t.dataset.toggle === "offline") say(on ? t.dataset.onNote : t.dataset.offNote);
    if (t.dataset.toggle === "failNext" && on) say(t.dataset.onNote);
  });
  addEventListener("message", (e) => {
    const m = e.data; if (!m || m.source !== "kiwi-preview-product") return;
    if (m.event === "screen") { st.screen = m.screen; press("screen", m.screen); }
    if (m.event === "theme") { st.theme = m.theme; press("theme", m.theme); }
    if (m.event === "note") say(m.text);
    if (m.event === "failConsumed") $('[data-toggle="failNext"]').setAttribute("aria-pressed", "false");
    if (m.event === "ready") { send("screen", { screen: st.screen }); }
  });
  addEventListener("resize", fit);
  const src = $("#product-html").textContent.replace(/<\\\/script/g, "</script").replace(/<\\!--/g, "<!--");
  frame.srcdoc = src;
  fit();
})();
