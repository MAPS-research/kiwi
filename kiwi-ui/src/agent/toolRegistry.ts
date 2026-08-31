/**
 * WebMCP-shaped tool registry.
 *
 * Mirrors the draft WebMCP API (document.modelContext.registerTool) so that if/
 * when browsers ship it, we can swap this for the native registry. Today the
 * "agent" is our backend chat agent, which emits clientAction directives that we
 * dispatch through here via executeClientAction().
 *
 * See: https://webmachinelearning.github.io/webmcp/
 */

export interface ToolDefinition {
  name: string;
  title?: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<unknown> | unknown;
}

class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();

  registerTool(tool: ToolDefinition): () => void {
    this.tools.set(tool.name, tool);
    return () => this.tools.delete(tool.name);
  }

  listTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getToolMap(): Record<string, Omit<ToolDefinition, 'execute'>> {
    const out: Record<string, Omit<ToolDefinition, 'execute'>> = {};
    for (const [name, t] of this.tools) {
      out[name] = {
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
      };
    }
    return out;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  /** Execute a tool by name. Throws if the tool is unknown. */
  async execute(name: string, input: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool "${name}".`);
    return tool.execute(input ?? {});
  }
}

/** Single app-wide registry instance. */
export const toolRegistry = new ToolRegistry();
