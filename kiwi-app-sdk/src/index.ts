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

import { defaultAI, defaultContext, defaultFixtures, defaultToken } from './simulator';
// Ops the host will proxy, and the params an app may send for each — emitted by
// `npm run generate-bridge` from the backend's OpenAPI `x-kiwi-bridge-op`
// extensions, so this cannot drift from the real endpoints. classId/appSlug are
// injected by the host from trusted context, never sent from here.
import { BRIDGE_OPS } from './ops.generated';
import type {
  AckResult,
  AskAIHandlers,
  ChatDisplayMode,
  ContextualChatParams,
  ContextualChatResult,
  CreateKiwiAppOptions,
  DocumentChunksParams,
  DocumentChunksResult,
  KiwiAppClient,
  KiwiAppToken,
  KiwiContext,
  KiwiOps,
  OpName,
  SdkMode,
  SdkStatus,
} from './types';

export * from './types';


function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  return c?.randomUUID
    ? c.randomUUID()
    : `r-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Grace period on top of an op's host-side deadline (see `call`). */
const TIMEOUT_GRACE_MS = 5_000;

export function createKiwiApp(options: CreateKiwiAppOptions = {}): KiwiAppClient {
  const cfg = {
    appSlug: options.appSlug ?? '',
    mode: options.mode ?? ('auto' as SdkMode),
    timeoutMs: options.timeoutMs ?? 30_000,
    onEvent: options.onEvent ?? (() => {}),
    simulator: options.simulator ?? {},
    readyPayload: options.readyPayload ?? { preferredChatMode: 'sidepanel' },
    liveFallbackMs: options.liveFallbackMs ?? 1500,
  };

  let sim = false;
  let kiwiOrigin = '*';
  let ctx: KiwiContext | null = null;
  let appToken: KiwiAppToken | null = null;

  const pending = new Map<string, { resolve: (v: never) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  const pendingAcks = new Map<string, { resolve: (v: AckResult) => void; timer: ReturnType<typeof setTimeout> }>();
  const aiStreams = new Map<string, {
    handlers: AskAIHandlers; buf: string;
    resolve: (v: string) => void; reject: (e: Error) => void;
    timer: ReturnType<typeof setTimeout>;
  }>();

  const listeners = {
    context: [] as ((c: KiwiContext) => void)[],
    token: [] as ((t: KiwiAppToken) => void)[],
    status: [] as ((s: SdkStatus) => void)[],
  };

  let readyResolve: ((c: KiwiContext) => void) | null = null;
  const readyPromise = new Promise<KiwiContext>((res) => { readyResolve = res; });

  const emit = <T,>(cbs: ((v: T) => void)[], v: T) => {
    cbs.forEach((cb) => { try { cb(v); } catch { /* listener errors are the app's */ } });
  };

  /** Same contract as `emit`, for the one-off askAI handlers: a throwing
   *  callback must not escape into the message listener and strand the stream
   *  bookkeeping mid-update. */
  const safe = (fn: (() => void) | undefined) => {
    try { fn?.(); } catch { /* handler errors are the app's */ }
  };

  // ---- outbound -----------------------------------------------------------
  function post(type: string, payload: Record<string, unknown> = {}): void {
    cfg.onEvent(sim ? 'sim' : 'out', type, payload);
    if (sim) { simHandle(type, payload); return; }
    window.parent.postMessage({ type, payload }, kiwiOrigin);
  }

  // ---- inbound ------------------------------------------------------------
  function onMessage(event: MessageEvent): void {
    const data = event.data as { type?: string; payload?: Record<string, unknown> } | null;
    const type = data?.type;
    if (!type || !type.startsWith('kiwi:')) return;
    if (!sim) {
      // Only the embedding host drives this bridge. The origin check alone
      // still lets any window holding a reference to ours win the race to the
      // first `kiwi:` message and pin `kiwiOrigin` to itself, after which it
      // is the host as far as we're concerned — so check the sender too.
      if (event.source !== window.parent) return;
      if (kiwiOrigin === '*') kiwiOrigin = event.origin; // pin on first kiwi: message
      else if (event.origin !== kiwiOrigin) return;      // reject all other origins
    }
    cfg.onEvent(sim ? 'sim' : 'in', type, data?.payload);
    dispatch(type, (data?.payload ?? {}) as Record<string, never>);
  }

  function dispatch(type: string, payload: Record<string, never>): void {
    const p = payload as unknown as Record<string, unknown>;

    if (type === 'kiwi:context') {
      ctx = p as unknown as KiwiContext;
      emit(listeners.context, ctx);
      emit(listeners.status, sim ? 'sim' : 'live');
      if (readyResolve) { readyResolve(ctx); readyResolve = null; }
      return;
    }
    if (type === 'kiwi:appToken') {
      appToken = p as unknown as KiwiAppToken;
      emit(listeners.token, appToken);
      return;
    }
    if (type === 'kiwi:ack') {
      const entry = pendingAcks.get(p.requestId as string);
      if (!entry) return;
      pendingAcks.delete(p.requestId as string);
      clearTimeout(entry.timer);
      entry.resolve({ ok: !!p.ok, error: p.error as AckResult['error'] });
      return;
    }
    if (type === 'kiwi:apiResponse') {
      const entry = pending.get(p.requestId as string);
      if (!entry) return;
      pending.delete(p.requestId as string);
      clearTimeout(entry.timer);
      if (p.ok) { entry.resolve(p.data as never); return; }
      const err = p.error as { code?: string; message?: string } | undefined;
      entry.reject(Object.assign(new Error(err?.message ?? 'apiRequest failed'), {
        code: err?.code, status: p.status,
      }));
      return;
    }
    if (type === 'kiwi:aiChunk') {
      const s = aiStreams.get(p.requestId as string);
      if (!s) return;
      // The host may send an authoritative cumulative snapshot; the agent's text
      // can shrink when transient tool narration is dropped, so prefer it.
      if (typeof p.full === 'string') s.buf = p.full;
      else s.buf += (p.chunk as string) ?? '';
      safe(() => s.handlers.onChunk?.((p.chunk as string) ?? '', s.buf));
      return;
    }
    if (type === 'kiwi:aiComplete') {
      const s = aiStreams.get(p.requestId as string);
      if (!s) return;
      aiStreams.delete(p.requestId as string);
      clearTimeout(s.timer);
      safe(() => s.handlers.onDone?.(s.buf));
      s.resolve(s.buf);
      return;
    }
    if (type === 'kiwi:aiError') {
      const s = aiStreams.get(p.requestId as string);
      if (!s) return;
      aiStreams.delete(p.requestId as string);
      clearTimeout(s.timer);
      const err = new Error((p.error as string) ?? 'AI error');
      safe(() => s.handlers.onError?.(err));
      s.reject(err);
    }
  }

  // ---- host-proxied ops ---------------------------------------------------
  function call<K extends OpName>(op: K, params: KiwiOps[K]['params']): Promise<KiwiOps[K]['result']> {
    const def = BRIDGE_OPS[op];
    if (!def) return Promise.reject(new Error(`unknown op: ${op}`));
    const requestId = uuid();
    const clean: Record<string, unknown> = {};
    const src = (params ?? {}) as Record<string, unknown>;
    for (const k of def.appParams) if (src[k] !== undefined) clean[k] = src[k];

    // The host enforces this op's own deadline (`contextualChat` gets 120s, not
    // the 30s default) and answers with a structured 408. Fire a little after
    // that, so the host's reason wins the race instead of a generic client-side
    // timeout; an app that explicitly asked for longer still gets longer.
    const timeoutMs = Math.max(cfg.timeoutMs, def.timeoutMs + TIMEOUT_GRACE_MS);

    return new Promise<KiwiOps[K]['result']>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          reject(Object.assign(new Error(`op timed out: ${op}`), { code: 'timeout' }));
        }
      }, timeoutMs);
      pending.set(requestId, {
        resolve: resolve as (v: never) => void,
        reject,
        timer,
      });
      post('kiwi:apiRequest', { requestId, op, params: clean });
    });
  }

  // ---- acked fire-and-forget ----------------------------------------------
  // navigate / setChatDisplayMode used to be send-and-hope: a refused path and a
  // dropped mode both looked like success. Resolves (never rejects) so callers
  // that ignore the promise can't produce unhandled rejections.
  function ackable(type: string, payload: Record<string, unknown>, timeoutMs = 5000): Promise<AckResult> {
    const requestId = uuid();
    return new Promise<AckResult>((resolve) => {
      const timer = setTimeout(() => {
        if (pendingAcks.has(requestId)) {
          pendingAcks.delete(requestId);
          resolve({ ok: false, error: { code: 'timeout', message: `${type} was not acknowledged (older host?)` } });
        }
      }, timeoutMs);
      pendingAcks.set(requestId, { resolve, timer });
      post(type, { requestId, ...payload });
    });
  }

  // ---- streaming AI -------------------------------------------------------
  function askAI(prompt: string, handlers: AskAIHandlers = {}): Promise<string> {
    const requestId = uuid();
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (aiStreams.has(requestId)) {
          aiStreams.delete(requestId);
          const err = Object.assign(new Error(`askAI timed out`), { code: 'timeout' });
          safe(() => handlers.onError?.(err));
          reject(err);
        }
      }, cfg.timeoutMs);
      aiStreams.set(requestId, { handlers, buf: '', resolve, reject, timer });
      post('kiwi:askAI', { prompt, requestId });
    });
  }

  // ---- simulator ----------------------------------------------------------
  function deliver(type: string, payload: Record<string, unknown>): void {
    onMessage({ data: { type, payload }, origin: '(sim)' } as MessageEvent);
  }

  function simHandle(type: string, payload: Record<string, unknown>): void {
    const S = cfg.simulator;
    if (type === 'kiwi:ready') {
      setTimeout(() => {
        const c = S.context ?? defaultContext;
        deliver('kiwi:context', c as unknown as Record<string, unknown>);
        if (S.token !== null) {
          const t = S.token ?? defaultToken(c, cfg.appSlug);
          deliver('kiwi:appToken', t as unknown as Record<string, unknown>);
        }
      }, 150);
      return;
    }
    if (type === 'kiwi:askAI') {
      void simAI(payload.prompt as string, payload.requestId as string, S.ai);
      return;
    }
    if (type === 'kiwi:apiRequest') {
      const op = payload.op as OpName;
      const fixture = S.ops?.[op] ?? defaultFixtures.ops[op];
      setTimeout(() => {
        if (!fixture) {
          deliver('kiwi:apiResponse', {
            requestId: payload.requestId, ok: false, status: 404,
            error: { code: 'unknown_op', message: `no simulator fixture for op ${op}` },
          });
          return;
        }
        const data = typeof fixture === 'function'
          ? (fixture as (p: unknown) => unknown)(payload.params)
          : fixture;
        deliver('kiwi:apiResponse', { requestId: payload.requestId, ok: true, status: 200, data });
      }, 400);
      return;
    }
    if (type === 'kiwi:navigate') {
      // Mirror the host's rules, so offline behaviour matches live: relative
      // paths and "/" resolve inside the class; an absolute path outside the
      // current class is refused.
      const classId = (ctx ?? S.context ?? defaultContext).classId;
      const path = payload.path as string | undefined;
      let ack: { ok: boolean; error?: { code: string; message: string } };
      if (payload.action === 'back' || payload.action === 'forward') {
        ack = { ok: true };
      } else if (path === '/' || path === '') {
        ack = { ok: true };
      } else if (typeof path === 'string' && path.length > 0) {
        const inClass = !path.startsWith('/') || path === `/${classId}` || path.startsWith(`/${classId}/`);
        ack = inClass
          ? { ok: true }
          : { ok: false, error: { code: 'blocked_out_of_scope', message: `path "${path}" is outside the current class` } };
      } else {
        ack = { ok: false, error: { code: 'invalid_request', message: 'navigate needs an action or a path' } };
      }
      setTimeout(() => deliver('kiwi:ack', { requestId: payload.requestId, ...ack }), 80);
      return;
    }
    if (type === 'kiwi:setChatDisplayMode') {
      const ok = ['modal', 'sidepanel', 'snap', 'fullscreen'].includes(payload.mode as string);
      setTimeout(() => deliver('kiwi:ack', {
        requestId: payload.requestId, ok,
        error: ok ? undefined : { code: 'invalid_mode', message: `unknown chat display mode "${payload.mode}"` },
      }), 80);
    }
    // kiwi:updateContext has no host reply
  }

  async function simAI(prompt: string, requestId: string, aiFn?: (p: string) => string): Promise<void> {
    const answer = String(aiFn ? aiFn(prompt) : defaultAI(prompt));
    const words = answer.split(' ');
    for (let i = 0; i < words.length; i++) {
      await wait(35);
      deliver('kiwi:aiChunk', { requestId, chunk: words[i] + (i < words.length - 1 ? ' ' : '') });
    }
    deliver('kiwi:aiComplete', { requestId });
  }

  // ---- mode + boot --------------------------------------------------------
  function setModeInternal(m: 'live' | 'sim'): void {
    sim = m === 'sim';
    emit(listeners.status, sim ? 'sim' : 'connecting');
  }

  function ready(): Promise<KiwiContext> {
    post('kiwi:ready', cfg.readyPayload);
    return readyPromise;
  }

  (function boot() {
    window.addEventListener('message', onMessage);
    const embedded = window.parent && window.parent !== window;
    if (cfg.mode === 'sim' || (cfg.mode === 'auto' && !embedded)) { setModeInternal('sim'); return; }
    setModeInternal('live');
    if (cfg.mode === 'auto' && embedded && cfg.liveFallbackMs > 0) {
      setTimeout(() => {
        if (!ctx) {
          cfg.onEvent('err', 'no kiwi:context', 'falling back to Simulator');
          setModeInternal('sim');
          post('kiwi:ready', cfg.readyPayload);
        }
      }, cfg.liveFallbackMs);
    }
  })();

  const client: KiwiAppClient = {
    ready,
    onContext(cb) { listeners.context.push(cb); if (ctx) { try { cb(ctx); } catch { /* app's */ } } return client; },
    onToken(cb) { listeners.token.push(cb); return client; },
    onStatus(cb) { listeners.status.push(cb); return client; },
    askAI,
    updateContext(text) { post('kiwi:updateContext', { context: text }); },
    navigate(p) { return ackable('kiwi:navigate', p ?? {}); },
    setChatDisplayMode(mode: ChatDisplayMode) { return ackable('kiwi:setChatDisplayMode', { mode }); },
    requestToken() { post('kiwi:requestToken'); },
    call,
    documentChunks(params: DocumentChunksParams = {}): Promise<DocumentChunksResult> {
      return call('documentChunks', params);
    },
    contextualChat(params: ContextualChatParams): Promise<ContextualChatResult> {
      return call('contextualChat', params);
    },
    ops() { return Object.keys(BRIDGE_OPS) as OpName[]; },
    setMode(m: SdkMode) { setModeInternal(m === 'sim' ? 'sim' : 'live'); post('kiwi:ready', cfg.readyPayload); return client; },
    get context() { return ctx; },
    get mode() { return sim ? 'sim' : 'live'; },
  };

  return client;
}

/** Alias, so the IIFE build reads `KiwiApp.create({...})`. */
export const create = createKiwiApp;

export const version = '0.1.0';

export default { create: createKiwiApp, createKiwiApp, version };
