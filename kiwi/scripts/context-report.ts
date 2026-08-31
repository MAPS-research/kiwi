/**
 * Report how one conversation's prompt context evolved, turn by turn.
 *
 * Reads the `chat-context-snapshot` ServerActions the unified chat writes for
 * every v2 turn (block layout, sizes, per-block hashes, prefix fingerprint) and
 * the `agent-loop-complete` rows next to them (prompt / cached / completion
 * tokens), then prints:
 *
 *   - the block layout of each turn, with tier and estimated size
 *   - the real prompt-cache hit rate reported by the provider
 *   - a diff of consecutive turns' prefixes, naming the block that changed
 *
 * That last line is the point. Both engines cache automatically on an exact
 * prompt prefix (OpenAI needs ≥1,024 tokens and also hashes the `tools` array;
 * Qwen's implicit cache starts around 256 tokens), so a persistently low hit
 * rate is a prompt-ordering problem. This says which block caused it.
 *
 * Usage:
 *   nvm use && npx ts-node scripts/context-report.ts --conversationId <id>
 *   npx ts-node scripts/context-report.ts --userId <uuid> --limit 20
 *
 * With no --conversationId it reports the most recent turns for a user, which
 * is the usual way to look at "what just happened".
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SnapshotBlock {
  index: number;
  role: string;
  label: string;
  tier: string;
  chars: number;
  estTokens: number;
  hash?: string;
}

interface Snapshot {
  prefixHash: string;
  toolNames: string[];
  blocks: SnapshotBlock[];
  totals: {
    blocks: number;
    chars: number;
    estTokens: number;
    stableEstTokens: number;
    historyEstTokens: number;
    volatileEstTokens: number;
  };
  resume?: boolean;
  conversationTurns?: number;
}

interface Usage {
  promptTokens?: number;
  cachedTokens?: number;
  completionTokens?: number;
  reasoningTokens?: number;
  cacheHitRate?: number;
  engineChoice?: string;
}

function parseArgs(): {
  conversationId?: string;
  userId?: string;
  limit: number;
} {
  const args = process.argv.slice(2);
  let conversationId: string | undefined;
  let userId: string | undefined;
  let limit = 10;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--conversationId') conversationId = args[++i];
    else if (args[i] === '--userId') userId = args[++i];
    else if (args[i] === '--limit') limit = Number(args[++i]);
  }
  if (!conversationId && !userId) {
    console.error(
      'Usage: context-report.ts --conversationId <id> | --userId <uuid> [--limit N]',
    );
    process.exit(1);
  }
  return { conversationId, userId, limit };
}

/** OpenAI will not cache a prefix below this; most Qwen models start near 256. */
const OPENAI_MIN_CACHEABLE_TOKENS = 1024;

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

async function main() {
  const { conversationId, userId, limit } = parseArgs();

  const where: any = {};
  if (userId) where.userId = userId;
  if (conversationId) {
    where.OR = [{ stringTag: conversationId }, { id: conversationId }];
  }

  const interactions = await prisma.userInteraction.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: limit,
    include: { serverActions: true },
  });

  if (interactions.length === 0) {
    console.log('No interactions matched.');
    return;
  }

  // Oldest first, so the prefix diff reads forwards in time.
  interactions.reverse();

  let previousBlocks: SnapshotBlock[] | undefined;
  let previousPrefix: string | undefined;
  let previousTools: string[] | undefined;

  for (const interaction of interactions) {
    const snapshotAction = interaction.serverActions.find(
      (a) => a.type === 'chat-context-snapshot',
    );
    if (!snapshotAction) continue;

    const snapshot = snapshotAction.context as unknown as Snapshot;
    const completion = interaction.serverActions.find(
      (a) => a.type === 'agent-loop-complete',
    );
    const usage = (completion?.context ?? {}) as Usage;

    console.log('');
    console.log('═'.repeat(78));
    console.log(
      `${interaction.timestamp.toISOString()}  interaction=${interaction.id}` +
        `  thread=${interaction.stringTag || '(none)'}` +
        (snapshot.resume ? '  [resume]' : ''),
    );

    for (const block of snapshot.blocks) {
      console.log(
        `  [${String(block.index).padStart(2)}] ${block.role.padEnd(9)} ` +
          `${block.label.padEnd(19)} ${block.tier.padEnd(8)} ` +
          `${String(block.chars).padStart(7)}c ~${String(block.estTokens).padStart(6)}t ` +
          `${block.hash ?? ''}`,
      );
    }

    const t = snapshot.totals;
    console.log(
      `  totals: ~${t.estTokens}t  stable=${t.stableEstTokens} ` +
        `history=${t.historyEstTokens} volatile=${t.volatileEstTokens}  ` +
        `tools=${snapshot.toolNames.length}  prefix=${snapshot.prefixHash}`,
    );

    if (t.stableEstTokens < OPENAI_MIN_CACHEABLE_TOKENS) {
      console.log(
        `  ⚠ stable tier is ~${t.stableEstTokens}t, below OpenAI's ` +
          `${OPENAI_MIN_CACHEABLE_TOKENS}-token minimum — nothing can cache on that engine.`,
      );
    }

    if (usage.promptTokens) {
      const cached = usage.cachedTokens ?? 0;
      console.log(
        `  actual: prompt=${usage.promptTokens} cached=${cached} ` +
          `(${pct(cached / usage.promptTokens)}) ` +
          `completion=${usage.completionTokens ?? 0} ` +
          `reasoning=${usage.reasoningTokens ?? 0} ` +
          `engine=${usage.engineChoice ?? '?'}`,
      );
    } else {
      console.log('  actual: no usage recorded for this turn');
    }

    // The diff: what stopped the previous prefix from being reusable.
    if (previousPrefix !== undefined) {
      if (previousPrefix === snapshot.prefixHash) {
        console.log('  ✓ prefix unchanged since the previous turn');
      } else {
        console.log('  ✗ prefix CHANGED since the previous turn:');
        const changed = snapshot.blocks.filter((block) => {
          const before = previousBlocks?.find((b) => b.label === block.label);
          return before && before.hash !== block.hash;
        });
        for (const block of changed) {
          const before = previousBlocks!.find((b) => b.label === block.label)!;
          console.log(
            `      ${block.label} (${block.tier}): ${before.chars}c → ${block.chars}c`,
          );
        }
        const toolsBefore = (previousTools ?? []).join(',');
        const toolsNow = snapshot.toolNames.join(',');
        if (toolsBefore !== toolsNow) {
          console.log(`      tools: [${toolsBefore}] → [${toolsNow}]`);
        }
        if (changed.length === 0 && toolsBefore === toolsNow) {
          console.log(
            '      (no labelled block differs — a block was added or removed)',
          );
        }
      }
    }

    previousBlocks = snapshot.blocks;
    previousPrefix = snapshot.prefixHash;
    previousTools = snapshot.toolNames;
  }

  console.log('');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
