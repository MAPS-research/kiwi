import { applyDecorators } from '@nestjs/common';
import { ApiExtension } from '@nestjs/swagger';

/**
 * Describes an App API endpoint that frontend-only Kiwi Apps may invoke through
 * the kiwi-ui window/postMessage proxy (rather than calling the backend
 * directly). It is the single source of truth for the bridge: it surfaces as an
 * `x-kiwi-bridge-op` extension on the operation in `/docs-json`, from which the
 * bridge generator emits the kiwi-ui proxy op-table, the `@kiwi/app-sdk` typed
 * methods, and the developer reference — so op params, response types, and
 * scope requirements can never drift from the real endpoint.
 */
export interface BridgeOpDefinition {
  /** Stable camelCase op name exposed over the bridge (e.g. `documentChunks`). */
  op: string;
  /**
   * Scopes the app token must carry, checked as a host-side pre-flight for a
   * fast, clean error. NOT the enforcement boundary — the backend's
   * `requireScope` still runs. Keep in sync with the handler's requireScope
   * calls (adjacent in the same file).
   */
  requiredScopes: string[];
  /**
   * Scopes templated from request params (e.g. `llm:prompt:{promptId}`). These
   * are enforced by the backend only — the host cannot pre-check them because
   * the value is in the request body.
   */
  dynamicScopes?: string[];
  /**
   * OpenAPI param name → host-context key. These params are supplied by kiwi-ui
   * from trusted context (the current class / this app's slug); the app cannot
   * set them, so it cannot address another class or app.
   */
  injectedParams?: Record<string, 'classId' | 'appSlug'>;
  /** Host-side abort timeout in ms (default 30_000). */
  timeoutMs?: number;
  /** If true, only app tokens may invoke it (user JWTs are rejected). */
  appTokenOnly?: boolean;
}

export const BRIDGE_OP_EXTENSION = 'x-kiwi-bridge-op';

export function BridgeOp(def: BridgeOpDefinition) {
  return applyDecorators(ApiExtension(BRIDGE_OP_EXTENSION, def));
}
