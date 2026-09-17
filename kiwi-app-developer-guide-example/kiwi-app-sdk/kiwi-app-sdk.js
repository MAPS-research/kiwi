"use strict";
var KiwiApp = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.ts
  var src_exports = {};
  __export(src_exports, {
    BRIDGE_OPS: () => BRIDGE_OPS,
    create: () => create,
    createKiwiApp: () => createKiwiApp,
    default: () => src_default,
    version: () => version
  });

  // src/simulator.ts
  var defaultContext = {
    classId: "demo-class-101",
    className: "Calculus I (simulated)",
    userId: "demo-user-1",
    userRole: "student",
    appId: "demo-app",
    appSlug: "demo",
    uiSlug: "student",
    capabilities: ["ai"]
  };
  function defaultToken(ctx, appSlug) {
    const scopes = ["class:materials:chunks:read", "context:student_learning:read"];
    const body = {
      sub: ctx.userId,
      type: "app_token",
      appSlug: appSlug || "demo",
      classId: ctx.classId,
      scopes
    };
    const b64 = typeof btoa === "function" ? btoa(JSON.stringify(body)).replace(/=+$/, "") : "simulated";
    return { accessToken: `sim.${b64}.sim`, scopes, expiresIn: 3600, appSlug: appSlug || "demo" };
  }
  function defaultAI(prompt) {
    return `This is a simulated AI answer to: "${prompt || ""}". Embed the app in a real Kiwi class for genuine responses.`;
  }
  var defaultFixtures = {
    ops: {
      // A real two-page cursor walk, so paging code terminates offline.
      documentChunks: (params) => {
        const page2 = params?.cursor === "sim-page-2";
        if (!page2) {
          return {
            classId: defaultContext.classId,
            documents: [
              {
                documentId: "sim-doc-1",
                fileName: "lecture1-recursion.pdf",
                totalChunks: 4,
                chunks: [
                  { chunkId: "sim-c0", index: 0, pageNumber: 1, type: "CompositeElement", text: "Recursion is a technique where a function calls itself to solve smaller subproblems." },
                  { chunkId: "sim-c1", index: 1, pageNumber: 1, type: "CompositeElement", text: "A base case stops the recursion; without one the calls never terminate." },
                  { chunkId: "sim-img", index: 2, pageNumber: 2, type: "Image", text: "Figure 1: a diagram of the call stack for factorial(3) unwinding to the base case." }
                ]
              }
            ],
            nextCursor: "sim-page-2",
            hasMore: true
          };
        }
        return {
          classId: defaultContext.classId,
          documents: [
            {
              documentId: "sim-doc-1",
              fileName: "lecture1-recursion.pdf",
              totalChunks: 4,
              chunks: [
                { chunkId: "sim-c3", index: 3, pageNumber: 2, type: "CompositeElement", text: "factorial(n) = n * factorial(n-1), with factorial(0) = 1 as the base case." }
              ]
            },
            {
              documentId: "sim-doc-2",
              fileName: "lecture2-sorting.pdf",
              totalChunks: 2,
              chunks: [
                { chunkId: "sim-d2-c0", index: 0, pageNumber: 1, type: "CompositeElement", text: "Merge sort splits the array, sorts each half, then merges them in O(n log n)." },
                { chunkId: "sim-d2-t0", index: 1, pageNumber: 1, type: "Table", text: "Table 1: comparison of merge sort and quicksort in best/average/worst case." }
              ]
            }
          ],
          nextCursor: null,
          hasMore: false
        };
      },
      contextualChat: () => ({
        output: JSON.stringify({
          summary: "This week you focused on recursion and sorting \u2014 base cases and merge sort stood out. (simulated)",
          focusAreas: [
            "Trace a recursion step by step to see how the base case terminates it",
            "Practice merge sort splitting and merging on a small array",
            "Compare merge sort and quicksort in the worst case"
          ]
        }),
        promptId: "weekly-summary",
        promptName: "Weekly Study Summary",
        contextIncluded: ["recent_questions", "weak_concepts", "relevant_materials"],
        contextOmitted: []
      })
    }
  };

  // src/ops.generated.ts
  var BRIDGE_OPS = {
    contextualChat: {
      op: "contextualChat",
      method: "POST",
      path: "/api/kiwi-apps/{slug}/contextual-chat",
      operationId: "AppDataController_contextualChat",
      clientMethod: "appDataControllerContextualChat",
      requiredScopes: ["context:student_learning:read"],
      dynamicScopes: ["llm:prompt:{promptId}"],
      injectedParams: { "slug": "appSlug" },
      appParams: ["promptId", "userMessage", "contextRequest", "outputSchema"],
      timeoutMs: 12e4,
      appTokenOnly: true
    },
    documentChunks: {
      op: "documentChunks",
      method: "GET",
      path: "/api/kiwi-apps/classes/{classId}/document-chunks",
      operationId: "AppDataController_getDocumentChunks",
      clientMethod: "appDataControllerGetDocumentChunks",
      requiredScopes: ["class:materials:chunks:read"],
      dynamicScopes: [],
      injectedParams: { "classId": "classId" },
      appParams: ["documentIds", "cursor", "limit"],
      timeoutMs: 3e4,
      appTokenOnly: false
    }
  };

  // src/index.ts
  function uuid() {
    const c = globalThis.crypto;
    return c?.randomUUID ? c.randomUUID() : `r-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  }
  var wait = (ms) => new Promise((r) => setTimeout(r, ms));
  var TIMEOUT_GRACE_MS = 5e3;
  function createKiwiApp(options = {}) {
    const cfg = {
      appSlug: options.appSlug ?? "",
      mode: options.mode ?? "auto",
      timeoutMs: options.timeoutMs ?? 3e4,
      onEvent: options.onEvent ?? (() => {
      }),
      simulator: options.simulator ?? {},
      readyPayload: options.readyPayload ?? { preferredChatMode: "sidepanel" },
      liveFallbackMs: options.liveFallbackMs ?? 1500
    };
    let sim = false;
    let kiwiOrigin = "*";
    let ctx = null;
    let appToken = null;
    const pending = /* @__PURE__ */ new Map();
    const pendingAcks = /* @__PURE__ */ new Map();
    const aiStreams = /* @__PURE__ */ new Map();
    const listeners = {
      context: [],
      token: [],
      status: []
    };
    let readyResolve = null;
    const readyPromise = new Promise((res) => {
      readyResolve = res;
    });
    const emit = (cbs, v) => {
      cbs.forEach((cb) => {
        try {
          cb(v);
        } catch {
        }
      });
    };
    const safe = (fn) => {
      try {
        fn?.();
      } catch {
      }
    };
    function post(type, payload = {}) {
      cfg.onEvent(sim ? "sim" : "out", type, payload);
      if (sim) {
        simHandle(type, payload);
        return;
      }
      window.parent.postMessage({ type, payload }, kiwiOrigin);
    }
    function onMessage(event) {
      const data = event.data;
      const type = data?.type;
      if (!type || !type.startsWith("kiwi:")) return;
      if (!sim) {
        if (event.source !== window.parent) return;
        if (kiwiOrigin === "*") kiwiOrigin = event.origin;
        else if (event.origin !== kiwiOrigin) return;
      }
      cfg.onEvent(sim ? "sim" : "in", type, data?.payload);
      dispatch(type, data?.payload ?? {});
    }
    function dispatch(type, payload) {
      const p = payload;
      if (type === "kiwi:context") {
        ctx = p;
        emit(listeners.context, ctx);
        emit(listeners.status, sim ? "sim" : "live");
        if (readyResolve) {
          readyResolve(ctx);
          readyResolve = null;
        }
        return;
      }
      if (type === "kiwi:appToken") {
        appToken = p;
        emit(listeners.token, appToken);
        return;
      }
      if (type === "kiwi:ack") {
        const entry = pendingAcks.get(p.requestId);
        if (!entry) return;
        pendingAcks.delete(p.requestId);
        clearTimeout(entry.timer);
        entry.resolve({ ok: !!p.ok, error: p.error });
        return;
      }
      if (type === "kiwi:apiResponse") {
        const entry = pending.get(p.requestId);
        if (!entry) return;
        pending.delete(p.requestId);
        clearTimeout(entry.timer);
        if (p.ok) {
          entry.resolve(p.data);
          return;
        }
        const err = p.error;
        entry.reject(Object.assign(new Error(err?.message ?? "apiRequest failed"), {
          code: err?.code,
          status: p.status
        }));
        return;
      }
      if (type === "kiwi:aiChunk") {
        const s = aiStreams.get(p.requestId);
        if (!s) return;
        if (typeof p.full === "string") s.buf = p.full;
        else s.buf += p.chunk ?? "";
        safe(() => s.handlers.onChunk?.(p.chunk ?? "", s.buf));
        return;
      }
      if (type === "kiwi:aiComplete") {
        const s = aiStreams.get(p.requestId);
        if (!s) return;
        aiStreams.delete(p.requestId);
        clearTimeout(s.timer);
        safe(() => s.handlers.onDone?.(s.buf));
        s.resolve(s.buf);
        return;
      }
      if (type === "kiwi:aiError") {
        const s = aiStreams.get(p.requestId);
        if (!s) return;
        aiStreams.delete(p.requestId);
        clearTimeout(s.timer);
        const err = new Error(p.error ?? "AI error");
        safe(() => s.handlers.onError?.(err));
        s.reject(err);
      }
    }
    function call(op, params) {
      const def = BRIDGE_OPS[op];
      if (!def) return Promise.reject(new Error(`unknown op: ${op}`));
      const requestId = uuid();
      const clean = {};
      const src = params ?? {};
      for (const k of def.appParams) if (src[k] !== void 0) clean[k] = src[k];
      const timeoutMs = Math.max(cfg.timeoutMs, def.timeoutMs + TIMEOUT_GRACE_MS);
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (pending.has(requestId)) {
            pending.delete(requestId);
            reject(Object.assign(new Error(`op timed out: ${op}`), { code: "timeout" }));
          }
        }, timeoutMs);
        pending.set(requestId, {
          resolve,
          reject,
          timer
        });
        post("kiwi:apiRequest", { requestId, op, params: clean });
      });
    }
    function ackable(type, payload, timeoutMs = 5e3) {
      const requestId = uuid();
      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          if (pendingAcks.has(requestId)) {
            pendingAcks.delete(requestId);
            resolve({ ok: false, error: { code: "timeout", message: `${type} was not acknowledged (older host?)` } });
          }
        }, timeoutMs);
        pendingAcks.set(requestId, { resolve, timer });
        post(type, { requestId, ...payload });
      });
    }
    function askAI(prompt, handlers = {}) {
      const requestId = uuid();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          if (aiStreams.has(requestId)) {
            aiStreams.delete(requestId);
            const err = Object.assign(new Error(`askAI timed out`), { code: "timeout" });
            safe(() => handlers.onError?.(err));
            reject(err);
          }
        }, cfg.timeoutMs);
        aiStreams.set(requestId, { handlers, buf: "", resolve, reject, timer });
        post("kiwi:askAI", { prompt, requestId });
      });
    }
    function deliver(type, payload) {
      onMessage({ data: { type, payload }, origin: "(sim)" });
    }
    function simHandle(type, payload) {
      const S = cfg.simulator;
      if (type === "kiwi:ready") {
        setTimeout(() => {
          const c = S.context ?? defaultContext;
          deliver("kiwi:context", c);
          if (S.token !== null) {
            const t = S.token ?? defaultToken(c, cfg.appSlug);
            deliver("kiwi:appToken", t);
          }
        }, 150);
        return;
      }
      if (type === "kiwi:askAI") {
        void simAI(payload.prompt, payload.requestId, S.ai);
        return;
      }
      if (type === "kiwi:apiRequest") {
        const op = payload.op;
        const fixture = S.ops?.[op] ?? defaultFixtures.ops[op];
        setTimeout(() => {
          if (!fixture) {
            deliver("kiwi:apiResponse", {
              requestId: payload.requestId,
              ok: false,
              status: 404,
              error: { code: "unknown_op", message: `no simulator fixture for op ${op}` }
            });
            return;
          }
          const data = typeof fixture === "function" ? fixture(payload.params) : fixture;
          deliver("kiwi:apiResponse", { requestId: payload.requestId, ok: true, status: 200, data });
        }, 400);
        return;
      }
      if (type === "kiwi:navigate") {
        const classId = (ctx ?? S.context ?? defaultContext).classId;
        const path = payload.path;
        let ack;
        if (payload.action === "back" || payload.action === "forward") {
          ack = { ok: true };
        } else if (path === "/" || path === "") {
          ack = { ok: true };
        } else if (typeof path === "string" && path.length > 0) {
          const inClass = !path.startsWith("/") || path === `/${classId}` || path.startsWith(`/${classId}/`);
          ack = inClass ? { ok: true } : { ok: false, error: { code: "blocked_out_of_scope", message: `path "${path}" is outside the current class` } };
        } else {
          ack = { ok: false, error: { code: "invalid_request", message: "navigate needs an action or a path" } };
        }
        setTimeout(() => deliver("kiwi:ack", { requestId: payload.requestId, ...ack }), 80);
        return;
      }
      if (type === "kiwi:setChatDisplayMode") {
        const ok = ["modal", "sidepanel", "snap", "fullscreen"].includes(payload.mode);
        setTimeout(() => deliver("kiwi:ack", {
          requestId: payload.requestId,
          ok,
          error: ok ? void 0 : { code: "invalid_mode", message: `unknown chat display mode "${payload.mode}"` }
        }), 80);
      }
    }
    async function simAI(prompt, requestId, aiFn) {
      const answer = String(aiFn ? aiFn(prompt) : defaultAI(prompt));
      const words = answer.split(" ");
      for (let i = 0; i < words.length; i++) {
        await wait(35);
        deliver("kiwi:aiChunk", { requestId, chunk: words[i] + (i < words.length - 1 ? " " : "") });
      }
      deliver("kiwi:aiComplete", { requestId });
    }
    function setModeInternal(m) {
      sim = m === "sim";
      emit(listeners.status, sim ? "sim" : "connecting");
    }
    function ready() {
      post("kiwi:ready", cfg.readyPayload);
      return readyPromise;
    }
    (function boot() {
      window.addEventListener("message", onMessage);
      const embedded = window.parent && window.parent !== window;
      if (cfg.mode === "sim" || cfg.mode === "auto" && !embedded) {
        setModeInternal("sim");
        return;
      }
      setModeInternal("live");
      if (cfg.mode === "auto" && embedded && cfg.liveFallbackMs > 0) {
        setTimeout(() => {
          if (!ctx) {
            cfg.onEvent("err", "no kiwi:context", "falling back to Simulator");
            setModeInternal("sim");
            post("kiwi:ready", cfg.readyPayload);
          }
        }, cfg.liveFallbackMs);
      }
    })();
    const client = {
      ready,
      onContext(cb) {
        listeners.context.push(cb);
        if (ctx) {
          try {
            cb(ctx);
          } catch {
          }
        }
        return client;
      },
      onToken(cb) {
        listeners.token.push(cb);
        return client;
      },
      onStatus(cb) {
        listeners.status.push(cb);
        return client;
      },
      askAI,
      updateContext(text) {
        post("kiwi:updateContext", { context: text });
      },
      navigate(p) {
        return ackable("kiwi:navigate", p ?? {});
      },
      setChatDisplayMode(mode) {
        return ackable("kiwi:setChatDisplayMode", { mode });
      },
      requestToken() {
        post("kiwi:requestToken");
      },
      call,
      documentChunks(params = {}) {
        return call("documentChunks", params);
      },
      contextualChat(params) {
        return call("contextualChat", params);
      },
      ops() {
        return Object.keys(BRIDGE_OPS);
      },
      setMode(m) {
        setModeInternal(m === "sim" ? "sim" : "live");
        post("kiwi:ready", cfg.readyPayload);
        return client;
      },
      get context() {
        return ctx;
      },
      get mode() {
        return sim ? "sim" : "live";
      }
    };
    return client;
  }
  var create = createKiwiApp;
  var version = "0.1.0";
  var src_default = { create: createKiwiApp, createKiwiApp, version };
  return __toCommonJS(src_exports);
})();
/*!
 * @maps-research/kiwi-app-sdk — SDK for external Kiwi Apps.
 *
 * A Kiwi App is your own web page that Kiwi embeds in an <iframe>. It talks to
 * Kiwi ONLY through the window/postMessage bridge, which this SDK wraps:
 *
 *   - handshake + live context   (kiwi:ready / kiwi:context)
 *   - streaming AI               (kiwi:askAI -> kiwi:aiChunk / aiComplete)
 *   - HOST-PROXIED App API ops   (kiwi:apiRequest / kiwi:apiResponse)
 *   - acked UI control           (kiwi:navigate / kiwi:setChatDisplayMode -> kiwi:ack)
 *
 * Your app never calls the Kiwi backend directly: the host makes the real call
 * with the app token, so there is no CORS to configure and the token never
 * touches your app. Access is always the signed-in user's, narrowed by the
 * scopes the app was granted — an app can never widen a user's access.
 *
 * Runs standalone via a built-in Simulator so you can build offline.
 */
//# sourceMappingURL=kiwi-app-sdk.global.js.map