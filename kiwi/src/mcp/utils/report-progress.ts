import { Logger } from '@nestjs/common';
import type { McpContext } from '@rekog/mcp-nest';
import type { Progress, ServerContext } from '@modelcontextprotocol/server';

const logger = new Logger('reportMcpProgress');

/** Keep legacy HTTP progress on the originating POST's SSE stream.
 *
 * Progress is best-effort: a failed notification (e.g. the client already
 * closed the request) is logged, never thrown, so it can't fail the tool or
 * surface as an unhandled rejection from a fire-and-forget call. */
export async function reportMcpProgress(
  context: McpContext,
  progress: Progress,
) {
  try {
    const session = context.getSession?.();
    if (session?.era === 'legacy' && session.transport === 'streamable-http') {
      const progressToken = context.mcpRequest.params?._meta?.progressToken;
      const sdkContext = context.getArgByIndex?.(4) as
        ServerContext | undefined;
      if (progressToken !== undefined && sdkContext) {
        // MCP-Nest 2.0.5 sends this without relatedRequestId, which routes it
        // to the standalone GET stream and can lose it when the POST completes.
        // The SDK's per-request notify ties it to the request being handled.
        // Don't derive the id from the raw HTTP request: MCP-Nest rebinds that
        // on every POST to a session, so parallel calls would read each
        // other's ids.
        await sdkContext.mcpReq.notify({
          method: 'notifications/progress',
          params: { ...progress, progressToken },
        });
        return;
      }
    }
    await context.reportProgress(progress);
  } catch (error) {
    logger.debug(`Dropped MCP progress notification: ${String(error)}`);
  }
}
