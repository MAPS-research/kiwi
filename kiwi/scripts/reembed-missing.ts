/**
 * Copy/generate embeddings for an embedding model over existing chunks.
 *
 * For the given provider it:
 *   1. Resolves the EmbeddingModel registry row (auto-detecting & caching its
 *      dimensions if unknown).
 *   2. Ensures a per-model partial HNSW index exists (required when adding a
 *      brand-new model — the migration only creates indexes for the seeded ones).
 *   3. Finds every Embedding (chunk) that has no EmbeddingVector for this model,
 *      embeds the chunk text in batches, and inserts the vectors.
 *
 * Idempotent — re-running only fills gaps. Use it to backfill a newly added
 * provider (e.g. bge-m3) for documents already embedded with another model.
 *
 * Usage:
 *   nvm use && npx ts-node scripts/reembed-missing.ts --provider qwen
 *   npx ts-node scripts/reembed-missing.ts --provider qwen --documentId <uuid>
 *
 * Reads the same env vars the runtime LlmService uses for each engine:
 *   openai : LLM_API_KEY / LLM_BASE_URL / LLM_EMBEDDING_MODEL
 *   qwen   : QWEN_API_KEY / QWEN_BASE_URL / QWEN_EMBEDDING_MODEL
 *            (in this deployment QWEN_EMBEDDING_MODEL is bge-m3, 1024-dim)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

type Provider = 'openai' | 'qwen';

const BATCH_SIZE = 32;
const prisma = new PrismaClient();

function parseArgs(): { provider: Provider; documentId?: string } {
  const args = process.argv.slice(2);
  let provider: string | undefined;
  let documentId: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--provider') provider = args[++i];
    else if (args[i] === '--documentId') documentId = args[++i];
  }
  if (provider !== 'openai' && provider !== 'qwen') {
    throw new Error(
      'Usage: reembed-missing.ts --provider <openai|qwen> [--documentId <id>]',
    );
  }
  return { provider, documentId };
}

function buildClient(provider: Provider): { client: OpenAI; model: string } {
  const env = process.env;
  let apiKey: string | undefined;
  let baseURL: string | undefined;
  let model: string | undefined;

  if (provider === 'openai') {
    apiKey = env.LLM_API_KEY;
    baseURL = env.LLM_BASE_URL;
    model = env.LLM_EMBEDDING_MODEL;
  } else {
    apiKey = env.QWEN_API_KEY;
    baseURL = env.QWEN_BASE_URL;
    model = env.QWEN_EMBEDDING_MODEL;
  }

  if (!apiKey || !baseURL || !model) {
    throw new Error(
      `Missing env for provider '${provider}' (need api key, base URL, embedding model).`,
    );
  }
  return { client: new OpenAI({ apiKey, baseURL }), model };
}

/** Ensure the EmbeddingModel row exists and has its dimensions resolved. */
async function resolveModel(
  provider: Provider,
  client: OpenAI,
  modelName: string,
) {
  let model = await prisma.embeddingModel.findFirst({
    where: { provider, isActive: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!model) {
    model = await prisma.embeddingModel.create({
      data: { provider, model: modelName, isActive: true },
    });
    console.log(`[reembed] registered new model ${provider}/${modelName}`);
  }
  if (model.dimensions == null) {
    const probe = await client.embeddings.create({
      model: modelName,
      input: 'dim probe',
      encoding_format: 'float',
    });
    const dimensions = probe.data[0].embedding.length;
    model = await prisma.embeddingModel.update({
      where: { id: model.id },
      data: { dimensions },
    });
    console.log(`[reembed] detected ${provider} dimensions = ${dimensions}`);
  }
  return model;
}

/** Create the per-model partial HNSW index if it doesn't already exist. */
async function ensureIndex(modelId: string, dimensions: number) {
  const indexName = `EmbeddingVector_${modelId.replace(/[^a-zA-Z0-9]/g, '_')}_hnsw`;
  // Identifiers can't be bound params; modelId is from our DB and dimensions is
  // validated as an integer, so this interpolation is safe.
  if (!Number.isInteger(dimensions) || dimensions <= 0) {
    throw new Error(`Invalid dimensions ${dimensions}`);
  }
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "${indexName}" ON "EmbeddingVector" ` +
      `USING hnsw (("embedding"::vector(${dimensions})) vector_cosine_ops) ` +
      `WHERE "modelId" = '${modelId}';`,
  );
  console.log(`[reembed] index ensured: ${indexName}`);
}

async function main() {
  const { provider, documentId } = parseArgs();
  const { client, model: modelName } = buildClient(provider);
  const model = await resolveModel(provider, client, modelName);
  await ensureIndex(model.id, model.dimensions!);

  // Chunks missing a vector for this model.
  const missing = await prisma.embedding.findMany({
    where: {
      ...(documentId ? { documentId } : {}),
      vectors: { none: { modelId: model.id } },
    },
    select: { id: true, text: true },
  });
  console.log(`[reembed] ${missing.length} chunk(s) need ${provider} vectors`);

  let done = 0;
  let failed = 0;
  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    try {
      const res = await client.embeddings.create({
        model: modelName,
        input: batch.map((c) => c.text),
        encoding_format: 'float',
      });
      await Promise.all(
        batch.map((chunk, idx) => {
          const vec = JSON.stringify(res.data[idx].embedding);
          return prisma.$executeRaw`
            INSERT INTO "EmbeddingVector" ("id", "embeddingId", "modelId", "embedding")
            VALUES (${uuidv4()}, ${chunk.id}, ${model.id}, ${vec}::vector)
            ON CONFLICT ("embeddingId", "modelId") DO NOTHING;
          `;
        }),
      );
      done += batch.length;
    } catch (err) {
      failed += batch.length;
      console.error(
        `[reembed] batch ${i}-${i + batch.length} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
    process.stdout.write(`\r[reembed] ${done}/${missing.length} (failed ${failed})`);
  }
  console.log(`\n[reembed] done: ${done} embedded, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error('[reembed] fatal:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
