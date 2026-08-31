/** Public types for @maps-research/kiwi-app-sdk. */

export type ChatDisplayMode = 'modal' | 'sidepanel' | 'snap' | 'fullscreen';

export type SdkMode = 'auto' | 'live' | 'sim';

export type SdkStatus = 'connecting' | 'live' | 'sim';

/** Runtime context the host sends after the handshake. */
export interface KiwiContext {
  classId: string;
  className?: string;
  userId: string;
  username?: string;
  /** The viewer's role in this class — already here, no extra call needed. */
  userRole?: string;
  appId?: string;
  appSlug?: string;
  uiSlug?: string;
  capabilities?: string[];
}

/** Scoped app token, only sent to apps that ask for it. Host-proxied ops do
 *  NOT need it — the host holds its own copy. */
export interface KiwiAppToken {
  accessToken: string;
  scopes: string[];
  expiresIn: number;
  appSlug: string;
}

export interface BridgeError {
  /** e.g. unknown_op, op_not_granted, invalid_params, not_ready, token_error,
   *  backend_error, network_error, timeout, blocked_out_of_scope, invalid_mode */
  code: string;
  message: string;
}

/** Result of an acked fire-and-forget message. Never rejects. */
export interface AckResult {
  ok: boolean;
  error?: BridgeError;
}

// ---------------------------------------------------------------------------
// Host-proxied App API ops
//
// These come from `ops.generated.ts`, emitted by `npm run generate-bridge` from
// the backend's OpenAPI `x-kiwi-bridge-op` extensions — so op params, result
// shapes and required scopes cannot drift from the real endpoints. The aliases
// below give them ergonomic names as the SDK's public surface.
// ---------------------------------------------------------------------------

export type {
  AppChunkDto,
  AppDocumentChunksDto,
  ClassDocumentChunksResponseDto,
  ContextRequestDto,
  ContextualChatRequestDto,
  ContextualChatResponseDto,
  DocumentChunksParams,
  BridgeOpMeta,
  KiwiOps,
  OpName,
} from './ops.generated';
export { BRIDGE_OPS } from './ops.generated';

import type {
  AppChunkDto,
  AppDocumentChunksDto,
  ClassDocumentChunksResponseDto,
  ContextRequestDto,
  ContextualChatRequestDto,
  ContextualChatResponseDto,
  DocumentChunksParams,
  KiwiOps,
  OpName,
} from './ops.generated';

/** A parsed chunk of a class document. Image/Table chunks carry a text
 *  description only — never raw image bytes. */
export type DocumentChunk = AppChunkDto;
export type DocumentWithChunks = AppDocumentChunksDto;
export type DocumentChunksResult = ClassDocumentChunksResponseDto;
export type ContextRequest = ContextRequestDto;
export type ContextualChatParams = ContextualChatRequestDto;
export type ContextualChatResult = ContextualChatResponseDto;
/** Derived from the generated request type, so it tracks the backend enum. */
export type ContextInclude = ContextRequestDto['include'][number];

// ---------------------------------------------------------------------------
// Streaming AI
// ---------------------------------------------------------------------------

export interface AskAIHandlers {
  /** (delta, fullSoFar) — prefer `full`, the agent's text can be revised. */
  onChunk?: (chunk: string, full: string) => void;
  onDone?: (full: string) => void;
  onError?: (error: Error) => void;
}

// ---------------------------------------------------------------------------
// Simulator
// ---------------------------------------------------------------------------

export interface SimulatorFixtures {
  context?: KiwiContext;
  /** Pass `null` to suppress the simulated token entirely. */
  token?: KiwiAppToken | null;
  ai?: (prompt: string) => string;
  ops?: Partial<{
    [K in OpName]: KiwiOps[K]['result'] | ((params: KiwiOps[K]['params']) => KiwiOps[K]['result']);
  }>;
}

export interface CreateKiwiAppOptions {
  appSlug?: string;
  /** 'auto' (default): live when embedded, Simulator when standalone. */
  mode?: SdkMode;
  /** Per-op timeout in ms (default 30000). */
  timeoutMs?: number;
  /** Debug hook — every bridge message in and out. */
  onEvent?: (direction: 'out' | 'in' | 'sim' | 'err', type: string, data?: unknown) => void;
  simulator?: SimulatorFixtures;
  readyPayload?: Record<string, unknown>;
  /** Fall back to the Simulator if the host doesn't answer (default 1500ms). */
  liveFallbackMs?: number;
}

export interface KiwiAppClient {
  /** Post kiwi:ready; resolves with the first context. */
  ready(): Promise<KiwiContext>;
  onContext(cb: (ctx: KiwiContext) => void): KiwiAppClient;
  onToken(cb: (token: KiwiAppToken) => void): KiwiAppClient;
  onStatus(cb: (status: SdkStatus) => void): KiwiAppClient;
  askAI(prompt: string, handlers?: AskAIHandlers): Promise<string>;
  updateContext(text: string): void;
  /** Acked — resolves { ok, error? }, never rejects. */
  navigate(p: { action?: 'back' | 'forward'; path?: string }): Promise<AckResult>;
  /** Acked — resolves { ok, error? }, never rejects. */
  setChatDisplayMode(mode: ChatDisplayMode): Promise<AckResult>;
  requestToken(): void;
  /** Escape hatch for ops without a typed wrapper. */
  call<K extends OpName>(op: K, params: KiwiOps[K]['params']): Promise<KiwiOps[K]['result']>;
  documentChunks(params?: DocumentChunksParams): Promise<DocumentChunksResult>;
  contextualChat(params: ContextualChatParams): Promise<ContextualChatResult>;
  ops(): OpName[];
  setMode(mode: SdkMode): KiwiAppClient;
  readonly context: KiwiContext | null;
  readonly mode: 'live' | 'sim';
}
