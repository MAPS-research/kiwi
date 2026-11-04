/* Kiwi UI Stage 1 preview: the product side (runs inside the preview frame's iframe).
   The six screens are templates rendered by the same generator as the gated mocks (tools/lib/screens.mjs, preview mode);
   this script swaps them, keeps local view state (the Display menu, tabs, the drawer, the chat panel's modes, form edits,
   selections) and runs a scripted chat demo that drives the companion through the Phase 4 clip table on the Phase 4
   atlases, framed as the companion sheet frames them. Nothing is sent anywhere: there is no network code in this file.
   CFG (injected by build-preview.mjs): ASSETS (data URIs), COPY (index strings), CLIPS, GEOMETRY, STILL_ATLAS, AVATAR_STILL, REST,
   SNIP (markup snippets from the generator), DEMO (content). */
(() => {
  "use strict";
  const CFG = window.__KIWI_PREVIEW__;
  const { ASSETS, COPY, CLIPS, GEOMETRY, STILL_ATLAS, AVATAR_STILL, REST, SNIP, DEMO } = CFG;
  const FPS = 24, COLS = 6, ROWS = 4;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const html = (s) => { const t = document.createElement("template"); t.innerHTML = s.trim(); return t.content.firstElementChild; };
  const post = (msg) => { try { parent.postMessage({ source: "kiwi-preview-product", ...msg }, "*"); } catch (e) { /* the frame is optional */ } };
  const note = (text) => post({ event: "note", text }); // preview chrome speaks for the product's limits

  // ---------- assets: "asset:<path>" placeholders become data URIs ----------
  const assetUrl = (p) => { const u = ASSETS[p]; if (!u) throw new Error("missing asset " + p); return u; };
  function hydrate(root) {
    for (const el of root.querySelectorAll('[src^="asset:"]')) el.setAttribute("src", assetUrl(el.getAttribute("src").slice(6)));
    for (const el of root.querySelectorAll('[style*="asset:"]')) el.setAttribute("style", el.getAttribute("style").replace(/asset:([^'")]+)/g, (_, p) => assetUrl(p)));
  }

  // ---------- storage, motion controls (flag > reduced motion > switch), theme ----------
  let storageOk = true;
  const store = { get(k) { try { return localStorage.getItem("kiwi-preview:" + k); } catch (e) { storageOk = false; return null; } }, set(k, v) { try { localStorage.setItem("kiwi-preview:" + k, v); } catch (e) { storageOk = false; } } };
  const osReduced = matchMedia("(prefers-reduced-motion: reduce)");
  const state = {
    flag: true, // VITE_ENABLE_MASCOT_MOTION: on in this preview
    simReduced: false, // the preview frame's "Reduced motion" control
    switchOn: store.get("motion") !== "off",
    themeChoice: store.get("theme") || "light",
    screen: null,
    classLabel: DEMO.classTitle,
    panel: { open: true, mode: "snap" },
    failNext: false,
    online: true,
  };
  const reduced = () => osReduced.matches || state.simReduced;
  const motionOn = () => state.flag && !reduced() && state.switchOn;
  const darkQuery = matchMedia("(prefers-color-scheme: dark)");
  function applyTheme() {
    const t = state.themeChoice === "device" ? (darkQuery.matches ? "dark" : "light") : state.themeChoice;
    document.documentElement.dataset.theme = t;
    post({ event: "theme", theme: t, choice: state.themeChoice });
  }
  darkQuery.addEventListener("change", () => state.themeChoice === "device" && applyTheme());

  // ---------- the live region ----------
  const live = html('<div class="sr" aria-live="polite" id="live"></div>');
  const say = (text) => { live.textContent = ""; setTimeout(() => { live.textContent = text; }, 40); };

  // ---------- toasts (Phase 3: one at a time; success 6 s, paused on hover and focus) ----------
  let toastTimer = null;
  function toast(text, kind = "success") {
    $$(".toast").forEach((t) => t.remove());
    const icon = kind === "success" ? SNIP.iconCheck : SNIP.iconInfo;
    const t = html(`<div class="toast ${kind}" role="status">${icon}<span>${esc(text)}</span><button type="button" class="act">${esc(COPY.dismiss)}</button></div>`);
    t.querySelector(".act").addEventListener("click", () => t.remove());
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    const arm = () => { clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 6000); };
    t.addEventListener("mouseenter", () => clearTimeout(toastTimer)); t.addEventListener("mouseleave", arm);
    t.addEventListener("focusin", () => clearTimeout(toastTimer)); t.addEventListener("focusout", arm);
    arm();
  }

  // ---------- the companion player: one mover, whole drawings at 24 Hz ----------
  const geometry = (atlas) => GEOMETRY[atlas]; // the full-body atlases share one framing, so the figure never changes size
  function showStill(el, s) { // the still a state rests on (AVATAR_STILL): its 64 px WebP (the 32 px avatar at 2x)
    const f = el.firstElementChild; const name = AVATAR_STILL[s] || s;
    Object.assign(f.style, geometry(STILL_ATLAS[name]));
    f.style.backgroundImage = `url("${assetUrl(`mascot/stills/${name}.64.webp`)}")`; f.style.backgroundSize = "100% 100%"; f.style.backgroundPosition = "0 0";
    el.dataset.atlas = ""; el.dataset.state = s;
  }
  function showCell(el, atlas, cell, px) {
    const f = el.firstElementChild;
    if (el.dataset.atlas !== atlas) { Object.assign(f.style, geometry(atlas)); f.style.backgroundImage = `url("${assetUrl(`mascot/atlas/${atlas}.${px}.webp`)}")`; f.style.backgroundSize = `${COLS * 100}% ${ROWS * 100}%`; el.dataset.atlas = atlas; }
    f.style.backgroundPosition = `${(cell % COLS) / (COLS - 1) * 100}% ${Math.floor(cell / COLS) / (ROWS - 1) * 100}%`;
    el.dataset.cell = cell;
  }
  // The rest (DESIGN.md § Companion, the Collisions and the hand-off; inventory.json avatar.restSource): when the avatar
  // comes to rest it draws full-hop-flight's cell 23 exactly as the hop draws it if that atlas has loaded and motion is on,
  // and the standing still otherwise (before any atlas, or with motion off). The source is chosen then and kept while it
  // rests: nothing swaps when motion is switched off later or an atlas loads, so older rows never change.
  const loadedAtlases = new Set(); // full-hop-flight is prefetched the moment walk begins (review A-6)
  function comeToRest(el, s = "idle") {
    if (motionOn() && loadedAtlases.has(REST.atlas)) { showCell(el, REST.atlas, REST.cell, 64); el.dataset.rest = "atlas"; }
    else { showStill(el, s); el.dataset.rest = "still"; }
    el.dataset.state = s;
  }
  const atRest = (el) => !(mover && mover.el === el) && el.dataset.rest !== ""; // "" while a clip draws it; first paint: a still
  let mover = null; // { el, clip, seq, t0, px, onEnd }
  function play(el, clipName, { onEnd, px = 64, from = 0, seq, start } = {}) { // start: a clock time to begin at (the next tick)
    const c = CLIPS[clipName];
    mover = { el, clip: clipName, seq: seq || c.seq, loop: c.loop, t0: start ?? performance.now() - (from / FPS) * 1000, px, onEnd, atlas: c.atlas };
    el.dataset.playing = "true"; el.dataset.rest = "";
  }
  function stopMover(rest) { if (!mover) return; const m = mover; mover = null; m.el.dataset.playing = "false"; if (rest) rest(m); }
  // A hidden tab or an avatar scrolled out of its message region pauses too (DESIGN.md § Companion › Motion controls):
  // a loop resumes where it paused; a one-shot whose moment passes out of view is not played late, the still shows instead.
  function inView(el) {
    if (document.hidden || !el.isConnected) return false;
    const region = el.closest(".msgs"); if (!region) return true;
    const a = el.getBoundingClientRect(), r = region.getBoundingClientRect();
    return a.bottom > r.top && a.top < r.bottom;
  }
  function tick(now) {
    if (mover && now >= mover.t0) { // a clip that begins at the next tick leaves the drawing on screen until then
      if (!motionOn()) { const m = mover; mover = null; m.el.dataset.playing = "false"; if (m.onEnd) m.onEnd(true); }
      else if (mover.el !== chat.peekEl && !inView(mover.el)) {
        if (mover.loop) { if (mover.pausedAt == null) mover.pausedAt = now; }
        else { const m = mover; mover = null; m.el.dataset.playing = "false"; if (m.onEnd) m.onEnd(true); } // the one-shot comes to rest
      } else {
        if (mover.pausedAt != null) { mover.t0 += now - mover.pausedAt; mover.pausedAt = null; }
        let i = Math.floor(((now - mover.t0) * FPS) / 1000);
        if (mover.loop) i = ((i % mover.seq.length) + mover.seq.length) % mover.seq.length;
        if (i >= mover.seq.length) { showCell(mover.el, mover.atlas, mover.seq[mover.seq.length - 1], mover.px); const m = mover; mover = null; m.el.dataset.playing = "false"; if (m.onEnd) m.onEnd(false); }
        else showCell(mover.el, mover.atlas, mover.seq[Math.max(0, i)], mover.px);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // ---------- the chat panel: one global element, docked (snap) or floating ----------
  const host = html(`<div class="chat-host open snap" id="chat-host">${SNIP.panel}</div>`);
  const backdrop = html('<div class="panel-backdrop" hidden></div>');
  const launcher = html(SNIP.launcher);
  hydrate(host); hydrate(launcher);
  const msgs = () => $(".msgs", host); // the scroller (column-reverse: it opens on the newest row, scrollTop 0 is the end)
  const flow = () => $(".msgs-flow", host); // the rows, in reading order
  const atScrollEnd = (m) => (getComputedStyle(m).flexDirection === "column-reverse" ? m.scrollTop > -8 : m.scrollHeight - m.scrollTop - m.clientHeight < 8);
  const toScrollEnd = (m) => { m.scrollTop = getComputedStyle(m).flexDirection === "column-reverse" ? 0 : m.scrollHeight; };
  const newestRow = () => { const r = $$(".tutor-row", msgs()); return r[r.length - 1]; };
  const newestAvatar = () => { const r = newestRow(); return r && r.querySelector(".kiwi"); };
  const chat = { busy: false, phase: "idle", stream: null, pending: null, session: false, peekShown: false, peekEl: null, typingTimer: null, avatar: "idle", offlineTimer: null };

  const narrow = matchMedia("(max-width: 599.98px)");
  function coverPage() { app.inert = narrow.matches && state.panel.open && state.screen !== "sign-in"; } // the fullscreen panel covers it
  narrow.addEventListener("change", coverPage);
  function setPanel(open, mode = state.panel.mode) {
    const opening = open && !host.classList.contains("open");
    state.panel = { open, mode };
    host.className = `chat-host ${open ? "open" : ""} ${mode}`;
    backdrop.hidden = !(open && (mode === "side" || mode === "modal"));
    document.body.classList.toggle("panel-snap", open && mode === "snap");
    document.body.classList.toggle("panel-open", open && state.screen !== "sign-in");
    coverPage();
    launcher.hidden = open || state.screen === "sign-in";
    host.hidden = state.screen === "sign-in";
    for (const b of $$('[data-act^="mode:"]', host)) {
      const m = b.dataset.act.slice(5); const pressed = open && m === (mode === "full" ? "fullscreen" : mode);
      b.setAttribute("aria-pressed", String(pressed));
    }
    if (opening) requestAnimationFrame(() => toScrollEnd(msgs()));
    const fs = $('[data-act="mode:fullscreen"]', host);
    if (fs) { const lbl = mode === "full" ? COPY.exitFullscreen : COPY.fullscreen; fs.setAttribute("aria-label", lbl); fs.title = lbl; }
  }
  host.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b || b.getAttribute("aria-disabled") === "true") return;
    const act = b.dataset.act;
    if (act.startsWith("mode:")) { const m = act.slice(5); setPanel(true, m === "fullscreen" ? (state.panel.mode === "full" ? "snap" : "full") : m); }
    else if (act === "close-chat") { setPanel(false); launcher.focus(); }
    else if (act === "history") { const list = $(".history", host); if (list) list.remove(); else { $(".chat-session", host).insertAdjacentHTML("afterend", `<div class="history"><p class="t-caption t-secondary">${esc(COPY.noPrevious)}</p></div>`); } for (const h of $$('[data-act="history"]', host)) h.setAttribute("aria-expanded", String(!!$(".history", host))); }
    else if (act === "new-chat") newChat();
    else if (act === "send") send();
    else if (act === "stop") stopAnswer();
    else if (act === "like" || act === "dislike") feedback(b, act);
    else if (act === "flag") note(COPY.previewFlag);
    else if (act === "copy") { const tip = html(`<span class="copied" role="status">${esc(COPY.copied)}</span>`); b.parentElement.appendChild(tip); setTimeout(() => tip.remove(), 2000); }
    else if (act === "import") { go("code"); }
    else if (act === "retry") { const row = b.closest(".tutor-row"); row.remove(); answer(chat.lastQuestion || ""); }
    else if (act === "cite") note(COPY.previewCite);
  });
  // ---------- resize grips (local view state): drag, or the arrow keys on the focused separator, within its own range ----------
  function wireGrip(grip, { get, set, from }) { // from(v0, dx): the value after the pointer or a key moved the grip by dx px
    if (!grip) return;
    const min = Number(grip.getAttribute("aria-valuemin")), max = Number(grip.getAttribute("aria-valuemax"));
    const apply = (v) => { const w = Math.round(Math.min(max, Math.max(min, v))); set(w); grip.setAttribute("aria-valuenow", String(w)); };
    grip.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 64 : 16;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); apply(from(get(), e.key === "ArrowLeft" ? -step : step)); }
      else if (e.key === "Home") { e.preventDefault(); apply(min); } else if (e.key === "End") { e.preventDefault(); apply(max); }
    });
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault(); grip.setPointerCapture(e.pointerId);
      const x0 = e.clientX, v0 = get();
      const move = (ev) => apply(from(v0, ev.clientX - x0));
      const up = () => { grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up); };
      grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
    });
  }
  let panelW = 420; // SR-6: side and snap, 320-800 px; the grip sits on the panel's left edge
  wireGrip($(".chat-grip", host), { get: () => panelW, set: (v) => { panelW = v; document.body.style.setProperty("--panel-w", `${v}px`); }, from: (v0, dx) => v0 - dx });
  launcher.addEventListener("click", () => setPanel(true));
  backdrop.addEventListener("click", () => setPanel(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#display-menu")?.hidden) closeMenu(true); else if (chat.busy && document.activeElement === composerField()) stopAnswer(); } });

  // ---------- the composer, the focus session and the peek ----------
  const composerField = () => $(".composer textarea", host);
  const composerBox = () => $(".composer", host);
  let pointerFocus = false;
  host.addEventListener("pointerdown", (e) => { if (e.target.closest(".composer textarea")) pointerFocus = true; });
  host.addEventListener("focusin", (e) => { if (e.target.matches(".composer textarea") && (pointerFocus || e.target.dataset.appFocus !== "1")) { chat.session = true; chat.peekShown = false; } pointerFocus = false; e.target.dataset && delete e.target.dataset.appFocus; });
  host.addEventListener("focusout", (e) => { if (e.target.matches(".composer textarea")) retractPeek(); });
  host.addEventListener("input", (e) => {
    if (!e.target.matches(".composer textarea")) return;
    clearTimeout(chat.typingTimer); chat.typingTimer = setTimeout(retractPeek, 1500);
    const atEnd = atScrollEnd(msgs());
    if (chat.session && !chat.peekShown && !chat.busy && !mover && motionOn() && atEnd && !/^\/$/.test(e.target.value)) {
      chat.peekShown = true; chat.session = false;
      const slot = html(SNIP.peek); hydrate(slot); $(".control", composerBox()).appendChild(slot); chat.peekEl = slot.firstElementChild;
      play(chat.peekEl, "peek", { px: 96 });
    }
    if (/^\/$/.test(e.target.value)) cutPeek(); // the slash-command menu opens in the lane
  });
  host.addEventListener("keydown", (e) => { if (e.target.matches(".composer textarea") && e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  function cutPeek() { if (!chat.peekEl) return; if (mover && mover.el === chat.peekEl) mover = null; chat.peekEl.closest(".peek")?.remove(); chat.peekEl = null; }
  function retractPeek() {
    clearTimeout(chat.typingTimer);
    const el = chat.peekEl; if (!el) return;
    if (!motionOn()) { cutPeek(); return; }
    const cur = Number(el.dataset.cell || 23); const seq = [...CLIPS.peek.seq].reverse(); const start = Math.max(0, seq.indexOf(cur));
    play(el, "retract", { px: 96, seq: seq.slice(start), onEnd: () => cutPeek() });
  }

  // ---------- the avatar's states (DESIGN.md § Companion › The nine states, as amended 2026-10-18) ----------
  // One small full-body figure: it runs from the send until the answer is complete (speaking continues the walk loop, no
  // restart at the first token), hops and flies once at completion, waves for a like, and otherwise stands.
  let avatarCall = 0; // a later state supersedes a cut still waiting for its tick
  function setAvatar(s, { onEnd } = {}) {
    const el = newestAvatar(); if (!el) return;
    const c = CLIPS[s]; const call = ++avatarCall;
    if (c.continues && motionOn() && mover && mover.el === el && mover.clip === c.continues) { // the same loop runs on
      mover.clip = s; chat.avatar = s; if (onEnd) setTimeout(onEnd, 0); return;
    }
    const running = mover && mover.el === el ? mover : null;
    const nextTick = running ? running.t0 + Math.ceil(((performance.now() - running.t0) * FPS) / 1000) * (1000 / FPS) : undefined;
    const other = mover && mover.el !== el && mover.el !== chat.peekEl ? mover.el : null; // an older avatar cut mid-clip
    if (mover && mover.el !== chat.peekEl) stopMover();
    chat.avatar = s;
    if (other) comeToRest(other); // one mover: an older avatar cut mid-clip comes to rest; ones at rest keep their drawing
    if (!motionOn() || !c.seq.length) { // motion off, or a state with no clip: the avatar rests (hop and wave are skipped)
      if (atRest(el)) { el.dataset.state = s; if (onEnd) setTimeout(onEnd, 0); return; } // already resting: its source is kept
      const rest = () => { if (call === avatarCall) comeToRest(el, s); };
      if (motionOn() && nextTick !== undefined) setTimeout(rest, Math.max(0, nextTick - performance.now())); // the run cuts at the next tick
      else rest();
      if (onEnd) setTimeout(onEnd, 0);
      return;
    }
    cutPeek(); // the peek is lower than the avatar
    loadedAtlases.add(c.atlas); if (c.atlas === CLIPS.walk.atlas) loadedAtlases.add(REST.atlas); // the walk prefetches the hop
    play(el, s, { start: s === "hop" ? nextTick : undefined, onEnd: () => { if (c.loop) return; comeToRest(el, s); if (onEnd) onEnd(); } });
  }

  // ---------- sending, the scripted answer, Stop, errors, offline ----------
  function setComposer(busy, { offline = false } = {}) {
    const box = composerBox(); const f = composerField();
    const reason = $(".why", box); reason && reason.remove();
    const st = $(".status-line", box); st && st.remove();
    const btn = $('[data-act="send"], [data-act="stop"]', box);
    if (offline) { const line = html(SNIP.offline); box.insertBefore(line, box.firstChild); }
    if (busy || offline) {
      f.setAttribute("aria-disabled", "true"); f.readOnly = true; f.closest(".control").classList.add("is-disabled");
      if (!offline) { box.insertAdjacentHTML("beforeend", `<p class="why" id="composer-why">${esc(COPY.answering)}</p>`); f.setAttribute("aria-describedby", "composer-why"); }
      else f.setAttribute("aria-describedby", "composer-offline");
    } else { f.removeAttribute("aria-disabled"); f.readOnly = false; f.closest(".control").classList.remove("is-disabled"); f.removeAttribute("aria-describedby"); }
    const showStop = busy || (offline && chat.busy);
    btn.replaceWith(html(showStop ? SNIP.stop : SNIP.send));
  }
  function scrollEnd() { toScrollEnd(msgs()); }
  function send() {
    const f = composerField(); if (chat.busy || !state.online) return;
    const q = f.value.trim(); if (!q) return;
    cutPeek(); f.value = ""; chat.session = false;
    const empty = $(".empty-inline", msgs()); if (empty) { const w = html(SNIP.welcomeRow); hydrate(w); empty.replaceWith(w); }
    const row = html(SNIP.userRow.replace("{TEXT}", esc(q))); flow().appendChild(row);
    chat.lastQuestion = q;
    answer(q);
  }
  function answer() {
    chat.busy = true; chat.phase = "walk";
    const row = html(SNIP.tutorWalk); hydrate(row); flow().appendChild(row); scrollEnd();
    $$(".tutor-row [data-act]", msgs()).forEach(() => {});
    setComposer(true);
    setAvatar("walk");
    const dots = row.querySelector(".dots"); let n = 0;
    const dotTimer = setInterval(() => { if (!dots.isConnected) return clearInterval(dotTimer); dots.textContent = reduced() ? "…" : ".".repeat((n++ % 3) + 1); }, 500);
    chat.pending = { row, dotTimer, words: DEMO.answer.split(" "), i: 0, t: null };
    chat.pending.t = setTimeout(firstToken, 1600);
  }
  function firstToken() {
    const p = chat.pending; if (!p) return;
    if (state.failNext) { state.failNext = false; post({ event: "failConsumed" }); fail(); return; }
    clearInterval(p.dotTimer);
    chat.phase = "speaking";
    p.row.querySelector(".ans").innerHTML = '<p class="tk stream"></p>';
    setAvatar("speaking");
    stream();
  }
  function stream() {
    const p = chat.pending; if (!p || !state.online) return;
    const para = p.row.querySelector(".stream");
    para.textContent = p.words.slice(0, ++p.i).join(" ");
    scrollEnd();
    if (p.i < p.words.length) p.t = setTimeout(stream, 70);
    else complete();
  }
  function complete() {
    const p = chat.pending; chat.pending = null; chat.busy = false; chat.phase = "idle";
    const meta = html(SNIP.meta); p.row.querySelector(".ans").appendChild(meta);
    setComposer(false);
    setAvatar("hop", { onEnd: () => {} });
    say(COPY.finished);
    requestAnimationFrame(() => { const f = composerField(); f.dataset.appFocus = "1"; f.focus(); }); // the focus the app hands back starts no session
    scrollEnd();
  }
  function stopAnswer() {
    const p = chat.pending; if (!p) return;
    clearTimeout(p.t); clearInterval(p.dotTimer); chat.pending = null; chat.busy = false; chat.phase = "idle";
    if (!p.row.querySelector(".stream")) p.row.remove(); // nothing arrived yet
    setComposer(false, { offline: !state.online });
    setAvatar("idle");
  }
  function fail() {
    const p = chat.pending; if (p) { clearTimeout(p.t); clearInterval(p.dotTimer); }
    chat.pending = null; chat.busy = false; chat.phase = "error";
    const row = p ? p.row : newestRow();
    const err = html(SNIP.errorRow); row.querySelector(".ans").replaceWith(err.querySelector(".ans"));
    setComposer(false);
    setAvatar("error");
    scrollEnd();
  }
  function feedback(b, act) {
    const bar = b.closest(".feedback"); const up = bar.querySelector('[data-act="like"]'), down = bar.querySelector('[data-act="dislike"]');
    const on = b.getAttribute("aria-pressed") !== "true";
    for (const [x, glyph] of [[up, "up"], [down, "down"]]) { const pressed = on && x === b; x.setAttribute("aria-pressed", String(pressed)); x.innerHTML = SNIP[`thumb_${glyph}_${pressed ? "on" : "off"}`]; }
    if (on) say(COPY.feedbackSaved);
    const row = b.closest(".tutor-row");
    if (on && act === "like" && row === newestRow() && !chat.busy && !mover) setAvatar("wave"); // a like on an older message, or during a hop, plays nothing
  }
  function newChat() {
    if (chat.busy) stopAnswer();
    flow().innerHTML = SNIP.welcomeEmpty; hydrate(flow());
    chat.lastQuestion = "";
  }
  // offline and back online, each after 2 s of hysteresis (the preview frame's control)
  function setOnline(on) {
    clearTimeout(chat.offlineTimer);
    chat.offlineTimer = setTimeout(() => {
      if (state.online === on) return;
      state.online = on;
      if (!on) {
        const p = chat.pending;
        if (p) { clearTimeout(p.t); clearInterval(p.dotTimer); const ans = p.row.querySelector(".ans"); if (!ans.querySelector(".pending")) ans.insertAdjacentHTML("beforeend", `<p class="tk pending">${esc(COPY.paused)}</p>`); ans.querySelector(".wait")?.remove(); }
        setComposer(false, { offline: true });
        setAvatar("offline");
      } else {
        setComposer(chat.busy);
        const p = chat.pending;
        p && p.row.querySelector(".pending")?.remove();
        if (!p) setAvatar(chat.phase === "error" ? "error" : "idle"); // back online: the figure stands, or runs on with the answer
        else if (chat.phase === "walk") { p.row.querySelector(".ans").innerHTML = SNIP.thinking; setAvatar("walk"); p.t = setTimeout(firstToken, 1200); }
        else { setAvatar("speaking"); stream(); }
      }
    }, 2000);
  }

  // motion turned off: every state shows its still and the peek goes; turned back on: an ongoing loop resumes
  function resync() {
    if (!motionOn()) { stopMover(); cutPeek(); setAvatar(!state.online ? "offline" : chat.busy ? chat.phase : chat.avatar === "error" ? "error" : "idle"); }
    else if (chat.busy && state.online) setAvatar(chat.phase);
  }
  // ---------- the Display menu (both groups; inert switch under reduced motion; storage caption) ----------
  function syncMenu() {
    const menu = $("#display-menu"); if (!menu) return;
    for (const it of $$('[role="menuitemradio"]', menu)) { const k = it.dataset.act.slice(6); it.setAttribute("aria-checked", String(k === state.themeChoice)); it.tabIndex = k === state.themeChoice ? 0 : -1; }
    const sw = $('[role="menuitemcheckbox"]', menu);
    sw.setAttribute("aria-checked", String(state.switchOn));
    sw.querySelector(".switch-why")?.remove(); sw.removeAttribute("aria-disabled"); sw.removeAttribute("aria-describedby");
    if (reduced()) { sw.setAttribute("aria-disabled", "true"); sw.insertAdjacentHTML("beforeend", `<span class="switch-why" id="sw-why">${esc(COPY.reducedReason)}</span>`); sw.setAttribute("aria-describedby", "sw-why"); }
    $(".menu-cap", menu)?.remove();
    if (!storageOk) menu.insertAdjacentHTML("beforeend", `<p class="menu-cap t-caption t-secondary">${esc(COPY.storageCaption)}</p>`);
  }
  function openMenu() { const m = $("#display-menu"); if (!m) return; m.hidden = false; $('[data-act="display-menu"]').setAttribute("aria-expanded", "true"); syncMenu(); ($('[aria-checked="true"][role="menuitemradio"]', m) || m).focus(); }
  function closeMenu(refocus) { const m = $("#display-menu"); if (!m || m.hidden) return; m.hidden = true; const b = $('[data-act="display-menu"]'); b.setAttribute("aria-expanded", "false"); if (refocus) b.focus(); }
  document.addEventListener("click", (e) => { const m = $("#display-menu"); if (m && !m.hidden && !e.target.closest(".menu-anchor")) closeMenu(false); });

  // ---------- screens ----------
  const app = html('<div id="app"></div>');
  const KNOWN = ["sign-in", "course-list", "chat", "code", "enroll-students", "edit-class"];
  function go(key) {
    if (!KNOWN.includes(key)) return note(COPY.previewNotHere);
    closeMenu(false);
    $$(".toast").forEach((t) => t.remove());
    state.screen = key;
    app.innerHTML = $(`#tpl-${key}`).innerHTML;
    hydrate(app);
    const label = $(".class-switch-label", app); if (label) label.textContent = state.classLabel;
    wire(key);
    setPanel(key === "sign-in" ? false : state.panel.open, state.panel.mode);
    document.title = $(`#tpl-${key}`).dataset.title;
    post({ event: "screen", screen: key });
    window.scrollTo(0, 0);
  }
  function wire(key) {
    // in-product navigation
    for (const a of $$("[data-nav]", app)) a.addEventListener("click", (e) => { e.preventDefault(); const k = a.dataset.nav; if (a.classList.contains("class-card")) state.classLabel = a.querySelector(".title").textContent; go(k); });
    for (const a of $$(".side-item:not([data-nav])", app)) a.addEventListener("click", (e) => { e.preventDefault(); note(COPY.previewNotHere); });
    const tune = $('[data-act="display-menu"]', app); if (tune) tune.addEventListener("click", (e) => { e.stopPropagation(); const m = $("#display-menu"); m.hidden ? openMenu() : closeMenu(true); });
    const menu = $("#display-menu", app);
    if (menu) {
      menu.addEventListener("click", (e) => {
        const it = e.target.closest('[role="menuitemradio"]'); if (it) { state.themeChoice = it.dataset.act.slice(6); store.set("theme", state.themeChoice); applyTheme(); syncMenu(); return; }
        const sw = e.target.closest('[role="menuitemcheckbox"]'); if (sw) { if (sw.getAttribute("aria-disabled") === "true") return; state.switchOn = !state.switchOn; store.set("motion", state.switchOn ? "on" : "off"); syncMenu(); resync(); }
      });
      menu.addEventListener("keydown", (e) => { const items = $$('[role="menuitemradio"], [role="menuitemcheckbox"]', menu); const i = items.indexOf(document.activeElement); if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); items[(i + (e.key === "ArrowDown" ? 1 : items.length - 1)) % items.length].focus(); } if (e.key === "Enter" || e.key === " ") { e.preventDefault(); document.activeElement.click(); } });
    }
    const out = $('[data-act="sign-out"]', app); if (out) out.addEventListener("click", () => go("sign-in"));
    const sw = $(".class-switch", app); if (sw) sw.addEventListener("click", () => note(COPY.previewOneClass));
    // tabs (local view state)
    for (const tab of $$('.tabs [role="tab"]:not([data-nav])', app)) tab.addEventListener("click", () => { for (const t of tab.parentElement.children) t.setAttribute("aria-selected", String(t === tab)); });
    if (key === "chat") wireMaterials();
    if (key === "code") wireCode();
    if (key === "enroll-students") wireEnroll();
    if (key === "edit-class") wireEditClass();
    if (key === "sign-in") for (const b of $$('[aria-disabled="true"]', app)) b.addEventListener("click", (e) => e.preventDefault());
    // disabled controls state their reason on tap too (Phase 3: hover, focus and tap)
    for (const d of $$('.ctl-wrap > [aria-disabled="true"]', app)) d.addEventListener("click", () => { const tip = d.parentElement.querySelector(".toggletip"); if (tip) { tip.classList.add("open"); setTimeout(() => tip.classList.remove("open"), 2500); } });
  }
  function wireMaterials() {
    const drawer = $(".drawer", app), rail = $('[data-act="drawer"]', $(".rail", app));
    const toggle = (open) => { drawer.hidden = !open; rail.setAttribute("aria-pressed", String(open)); };
    for (const b of $$('[data-act="drawer"]', app)) b.addEventListener("click", () => toggle(drawer.hidden));
    const chips = $$(".drawer-filters .chip", app); const files = $(".drawer-files", app); const lectureHtml = files.innerHTML;
    for (const c of chips) c.addEventListener("click", () => { for (const x of chips) x.setAttribute("aria-pressed", String(x === c)); files.innerHTML = c === chips[0] ? lectureHtml : `<li><p class="t-caption t-secondary file-empty">${esc(COPY.noRecitations)}</p></li>`; hydrate(files); wireFiles(); });
    const wireFiles = () => { for (const r of $$(".file-row", app)) r.addEventListener("click", (e) => { e.preventDefault(); if (r.getAttribute("aria-current") !== "true") note(COPY.previewOneLecture); }); };
    wireFiles();
    let page = 3, zoom = 100;
    const lbls = $$(".pdf-bar .lbl", app); const papers = $$(".paper", app);
    const render = () => { lbls[0].textContent = `${page} / 12`; lbls[1].textContent = `${zoom}%`; papers.forEach((p, i) => p.classList.toggle("in-context", i === page - 3)); document.documentElement.style.setProperty("--paper-zoom", zoom / 100); papers[page - 3].scrollIntoView({ block: "nearest" }); };
    $('[data-act="next-page"]', app).addEventListener("click", () => { if (page < 4) { page++; render(); } else note(COPY.previewTwoPages); });
    $('[data-act="prev-page"]', app).addEventListener("click", () => { if (page > 3) { page--; render(); } else note(COPY.previewTwoPages); });
    $('[data-act="zoom-in"]', app).addEventListener("click", () => { zoom = Math.min(160, zoom + 20); render(); });
    $('[data-act="zoom-out"]', app).addEventListener("click", () => { zoom = Math.max(60, zoom - 20); render(); });
    $('[data-act="fullscreen"]', app).addEventListener("click", () => note(COPY.previewNotHere));
  }
  function wireCode() {
    const col = $(".ide-col", app); // the column is centred, so its right edge moves by half of a width change
    wireGrip($(".ide-grip", app), { get: () => col.getBoundingClientRect().width, set: (v) => col.style.setProperty("--ide-w", `${v}px`), from: (v0, dx) => v0 + 2 * dx });
    const fileInput = html('<input type="file" multiple hidden>'); app.appendChild(fileInput);
    const row = $(".upload-row", app);
    for (const b of $$('[data-act="upload"]', app)) b.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => { for (const f of fileInput.files) row.insertAdjacentHTML("beforeend", `<button type="button" class="file-chip">${esc(f.name)}</button>`); fileInput.value = ""; });
    $('[data-act="run"]', app).addEventListener("click", () => { toast(COPY.running, "info"); const out = $(".console", app); out.textContent = ""; setTimeout(() => { out.textContent = DEMO.output; }, 600); });
    $('[data-act="save-code"]', app).addEventListener("click", () => row.insertAdjacentHTML("beforeend", `<button type="button" class="file-chip">code-${Date.now()}.txt</button>`));
    const prefill = (text) => { setPanel(true); const f = composerField(); f.value = text; f.focus(); };
    $('[data-act="open-in-chat"]', app).addEventListener("click", () => prefill(DEMO.openInChat));
    $('[data-act="check"]', app).addEventListener("click", () => prefill(DEMO.checkAnswer));
  }
  function wireEnroll() {
    const rows = $$("tbody tr", app); const head = $('thead [role="checkbox"]', app);
    const sum = () => { const n = rows.filter((r) => r.getAttribute("aria-selected") === "true").length; $('[data-act="remove"] .btn-label', app).textContent = COPY.removeSelected.replace("{n}", n); $('[data-act="email"] .btn-label', app).textContent = COPY.emailSelected.replace("{n}", n); head.setAttribute("aria-checked", n === 0 ? "false" : n === rows.length ? "true" : "mixed"); head.innerHTML = n === 0 ? "" : n === rows.length ? SNIP.iconCheck : SNIP.iconDash; };
    const setRow = (r, on) => { r.setAttribute("aria-selected", String(on)); const c = r.querySelector('[role="checkbox"]'); c.setAttribute("aria-checked", String(on)); c.innerHTML = on ? SNIP.iconCheck : ""; };
    for (const r of rows) { const c = r.querySelector('[role="checkbox"]'); const t = () => { setRow(r, c.getAttribute("aria-checked") !== "true"); sum(); }; c.addEventListener("click", t); c.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); t(); } }); }
    head.addEventListener("click", () => { const all = head.getAttribute("aria-checked") !== "true"; for (const r of rows) if (!r.hidden) setRow(r, all); sum(); });
    const search = $('[data-act="search"]', app); const tbody = $("tbody", app);
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase(); let shown = 0;
      for (const r of rows) { const hit = !q || r.textContent.toLowerCase().includes(q); r.hidden = !hit; shown += hit ? 1 : 0; }
      $(".no-match", tbody)?.remove();
      if (!shown) tbody.insertAdjacentHTML("beforeend", `<tr class="no-match"><td colspan="4">${esc(COPY.noMatch.replace("{query}", search.value.trim()))}</td></tr>`);
    });
  }
  function wireEditClass() {
    const [title, instr] = [$('[data-act="title"]', app), $('[data-act="instructor"]', app)];
    const card = $(".preview-col .class-card", app);
    const upd = () => { card.querySelector(".title").textContent = title.value.trim() || COPY.untitled; card.querySelector(".who").textContent = instr.value.trim() || COPY.noInstructor; };
    title.addEventListener("input", upd); instr.addEventListener("input", upd);
    const sw = $('[data-act="instructions"]', app); const instrField = sw.closest(".fields").querySelector(".field");
    sw.addEventListener("click", () => { const on = sw.getAttribute("aria-checked") !== "true"; sw.setAttribute("aria-checked", String(on)); instrField.hidden = !on; const off = sw.closest(".fields").querySelector(".instr-off"); if (!on && !off) sw.closest(".fields").insertAdjacentHTML("beforeend", `<p class="instr-off t-secondary">${esc(COPY.instructionsOff)}</p>`); if (on && off) off.remove(); });
    const fileInput = html('<input type="file" accept="image/png,image/jpeg,image/webp" hidden>'); app.appendChild(fileInput);
    $('[data-act="upload-image"]', app).addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => { const f = fileInput.files[0]; if (!f) return; const url = URL.createObjectURL(f); card.querySelector(".cover").innerHTML = `<img src="${url}" alt="">`; $('[data-act="upload-image"] .btn-label', app).textContent = COPY.replaceImage; });
    const save = $('[data-act="save-class"]', app);
    save.addEventListener("click", () => { if (save.getAttribute("aria-busy") === "true") return; const lbl = save.querySelector(".btn-label"); const was = lbl.textContent; save.setAttribute("aria-busy", "true"); lbl.textContent = COPY.saving; setTimeout(() => { save.removeAttribute("aria-busy"); lbl.textContent = was; toast(COPY.classSaved); }, 900); });
    $('[data-act="cancel"]', app).addEventListener("click", () => go("edit-class"));
  }

  // ---------- the preview frame's controls ----------
  addEventListener("message", (e) => {
    const m = e.data; if (!m || m.source !== "kiwi-preview-frame") return;
    if (m.cmd === "screen") { state.panel.open = m.screen === "chat"; go(m.screen); } // the frame shows each screen as its gated mock does
    if (m.cmd === "theme") { state.themeChoice = m.theme; store.set("theme", m.theme); applyTheme(); syncMenu(); }
    if (m.cmd === "offline") setOnline(!m.on);
    if (m.cmd === "failNext") state.failNext = !!m.on;
    if (m.cmd === "reduced") { state.simReduced = !!m.on; syncMenu(); resync(); }
  });
  osReduced.addEventListener("change", () => { syncMenu(); resync(); });

  // ---------- start ----------
  document.body.append(app, backdrop, host, launcher, live);
  applyTheme();
  go(CFG.START || "chat");
  requestAnimationFrame(() => toScrollEnd(msgs()));
  post({ event: "ready" });
})();
