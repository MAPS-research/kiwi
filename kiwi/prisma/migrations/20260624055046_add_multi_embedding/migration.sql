-- Multi-provider embeddings on pgvector.
-- Adds an EmbeddingModel registry and a per-(chunk,model) EmbeddingVector table
-- using a PLAIN `vector` column so different dimensions coexist (1536 OpenAI,
-- 1024 bge-m3, ...). Searches are always filtered by modelId and use per-model
-- partial HNSW indexes. The legacy Embedding.embedding column is made nullable
-- and its existing OpenAI vectors are backfilled into EmbeddingVector.

-- AlterTable: legacy single-model column becomes nullable (new vectors live in EmbeddingVector).
ALTER TABLE "Embedding" ALTER COLUMN "embedding" DROP NOT NULL;

-- CreateTable: provider/model registry.
CREATE TABLE "EmbeddingModel" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmbeddingModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable: one vector per (chunk, model). Plain `vector` = any dimension.
CREATE TABLE "EmbeddingVector" (
    "id" TEXT NOT NULL,
    "embeddingId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmbeddingVector_pkey" PRIMARY KEY ("id")
);

-- Guard against empty/zero-dim vectors.
ALTER TABLE "EmbeddingVector"
    ADD CONSTRAINT "EmbeddingVector_dims_check" CHECK (vector_dims("embedding") > 0);

-- CreateIndex
CREATE UNIQUE INDEX "EmbeddingModel_provider_model_key" ON "EmbeddingModel"("provider", "model");
CREATE INDEX "EmbeddingVector_modelId_idx" ON "EmbeddingVector"("modelId");
CREATE UNIQUE INDEX "EmbeddingVector_embeddingId_modelId_key" ON "EmbeddingVector"("embeddingId", "modelId");

-- AddForeignKey
ALTER TABLE "EmbeddingVector" ADD CONSTRAINT "EmbeddingVector_embeddingId_fkey" FOREIGN KEY ("embeddingId") REFERENCES "Embedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EmbeddingVector" ADD CONSTRAINT "EmbeddingVector_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "EmbeddingModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the known embedding models with deterministic ids so the backfill and the
-- partial indexes can reference them. The 'qwen' engine in this deployment serves
-- bge-m3 (1024-dim) via QWEN_EMBEDDING_MODEL. dimensions can be re-probed by the
-- app (set NULL) if a deployment differs.
INSERT INTO "EmbeddingModel" ("id", "provider", "model", "dimensions", "isActive", "createdAt", "updatedAt")
VALUES
    ('emb-openai-3-small', 'openai', 'text-embedding-3-small', 1536, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('emb-qwen-bge-m3',    'qwen',   'bge-m3',                 1024, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("provider", "model") DO NOTHING;

-- Backfill: copy existing OpenAI (1536-dim) vectors from the legacy column into
-- EmbeddingVector under the openai model. Deterministic id from the source row.
INSERT INTO "EmbeddingVector" ("id", "embeddingId", "modelId", "embedding", "createdAt")
SELECT
    "id" || ':openai',
    "id",
    'emb-openai-3-small',
    "embedding",
    CURRENT_TIMESTAMP
FROM "Embedding"
WHERE "embedding" IS NOT NULL
ON CONFLICT ("embeddingId", "modelId") DO NOTHING;

-- Per-model partial HNSW indexes (cosine). One per dimension/model: the order-by
-- in retrieval casts to the model's dim so these indexes are used, and the WHERE
-- clause keeps each index scoped to its model. NOTE: registering a NEW model later
-- requires creating its partial index too (handled by scripts/reembed-missing.ts).
CREATE INDEX "EmbeddingVector_openai_hnsw" ON "EmbeddingVector"
    USING hnsw (("embedding"::vector(1536)) vector_cosine_ops)
    WHERE "modelId" = 'emb-openai-3-small';

CREATE INDEX "EmbeddingVector_qwen_bge_m3_hnsw" ON "EmbeddingVector"
    USING hnsw (("embedding"::vector(1024)) vector_cosine_ops)
    WHERE "modelId" = 'emb-qwen-bge-m3';
