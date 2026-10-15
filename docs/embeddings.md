# Embeddings and retrieval

How Kiwi stores document embeddings for retrieval (RAG), how the embedding
provider is chosen, and how to backfill or add embedding models. For operators
and backend developers.

## Providers

Kiwi has two LLM engines, defined in `engineConfigs` in
`kiwi/src/common/llm/llm.service.ts`. Both talk to OpenAI-compatible APIs.

| Engine (`provider`) | Embedding model env var | Other env vars |
|---|---|---|
| `openai` | `LLM_EMBEDDING_MODEL` (default in `.env.example`: `text-embedding-3-small`) | `LLM_API_KEY`, `LLM_BASE_URL` |
| `qwen` | `QWEN_EMBEDDING_MODEL` | `QWEN_API_KEY`, `QWEN_BASE_URL` |

`EMBEDDING_PROVIDER` (`openai` or `qwen`) sets the default provider. If unset,
the default is `openai`.

## Data model

- **`EmbeddingModel`** is the registry of models, with `provider`, `model`,
  `dimensions` and `isActive`. The migration
  `kiwi/prisma/migrations/20260624055046_add_multi_embedding/migration.sql`
  seeds two rows:

  | `id` | `provider` | `model` | `dimensions` |
  |---|---|---|---|
  | `emb-openai-3-small` | `openai` | `text-embedding-3-small` | 1536 |
  | `emb-qwen-bge-m3` | `qwen` | `bge-m3` | 1024 |

- **`Embedding`** holds one row per chunk: text, page number and chunk
  metadata. Its legacy `embedding vector(1536)` column is nullable and is
  written only for `emb-openai-3-small`.
- **`EmbeddingVector`** holds one row per chunk and model. Its `embedding`
  column is a plain `vector` with no fixed dimension, so vectors of different
  sizes share the table.
- **Per-model partial HNSW indexes.** Each model has a cosine HNSW index on
  `embedding::vector(<dimensions>)` with `WHERE "modelId" = '<id>'`. The
  migration creates them for the two seeded models.

A row's `model` name is a label. Kiwi calls whatever model the engine's env var
names, so `QWEN_EMBEDDING_MODEL` must produce vectors of the registered size
(1024 for the seeded `qwen` row). A model with a different output size needs its
own registry row; see [Registering a brand-new provider/model](#registering-a-brand-new-providermodel).

## How a model is chosen

`kiwi/src/document/document.service.ts` resolves a provider to the **oldest
active** `EmbeddingModel` row for that provider (`isActive = true`, ordered by
`createdAt`). `kiwi/scripts/reembed-missing.ts` uses the same rule. A newer
row for the same provider is ignored until the older one is deactivated.

If a row's `dimensions` is `NULL`, Kiwi embeds a short probe string, stores the
resulting length, and uses it from then on.

**Ingestion.** When a document is embedded, each chunk gets a vector for the
default provider and for every other provider that has an active row and an
API key. A provider without a key is skipped, so the seeded Qwen row costs
nothing until `QWEN_API_KEY` is set; documents uploaded before then have no
Qwen vectors, so run the backfill script once you enable it. If a secondary
provider fails, the error is logged and ingestion continues; run the backfill
script for that provider afterwards.

**Retrieval.** A similarity search always uses exactly one model. The query is
embedded with that model and compared only with `EmbeddingVector` rows of the
same `modelId`, cast to its dimension so the partial index applies. In chat, the
model follows the request's `engineChoice`; otherwise it follows
`EMBEDDING_PROVIDER`, then `openai`. A document with no vectors for the chosen
model returns no results for that chat.

## Backfilling vectors

Documents embedded before a provider was active have no vectors for it. The
backfill script fills the gaps. Run it from `kiwi/`; it reads `kiwi/.env`.

```bash
# Every chunk that lacks a vector for the active qwen model
npx ts-node scripts/reembed-missing.ts --provider qwen

# OpenAI, limited to one document
npx ts-node scripts/reembed-missing.ts --provider openai --documentId <uuid>
```

The script:

1. Resolves the provider's active model. If there is none, it registers one
   named after the env var. It probes the dimension if unknown.
2. Creates the model's partial HNSW index if missing.
3. Embeds, in batches of 32, every chunk without a vector for that model, and
   inserts the vectors.

It only fills gaps, so re-running it is safe. `--provider` accepts only
`openai` and `qwen`.

To check coverage, run in `psql` or Adminer (http://localhost:8081):

```sql
SELECT m.provider, m.model, count(v.id) AS vectors
FROM "EmbeddingModel" m
LEFT JOIN "EmbeddingVector" v ON v."modelId" = m.id
GROUP BY m.id
ORDER BY m.provider;

SELECT count(*) FROM "Embedding";
```

Each active model should have as many vectors as there are `Embedding` rows.

## Registering a brand-new provider/model

**Same provider, different model** (for example, a Qwen endpoint serving a
768-dimensional model):

1. Set `QWEN_EMBEDDING_MODEL` to the new model.
2. Insert an `EmbeddingModel` row with `provider = 'qwen'`, the model name,
   `isActive = true` and `dimensions = NULL`.
3. Set `isActive = false` on the old `qwen` row. Otherwise it remains the
   oldest active row and is still used.
4. Run `npx ts-node scripts/reembed-missing.ts --provider qwen` from `kiwi/`.
   It probes the dimension, creates the index and fills the vectors.
5. Restart the backend.

**New provider.** This needs code changes:

1. Add the engine to `engineConfigs` in `kiwi/src/common/llm/llm.service.ts`.
2. Add its name to `EngineChoice` in
   `kiwi/src/common/llm/interfaces/engine-config.ts`.
3. Extend `parseArgs` and `buildClient` in `kiwi/scripts/reembed-missing.ts` to
   accept the name and read its env vars.
4. Register a model row as above and run the backfill script.

## Troubleshooting

- **No RAG results for a document.** Chunking and embedding are separate steps;
  a document can have chunks but no `Embedding` rows. Check
  `SELECT count(*) FROM "Embedding" WHERE "documentId" = '<id>';`, then check
  `EmbeddingVector` for the model the chat uses.
- **Inserts fail with a dimension error.** The configured model returns a
  different size than the row's `dimensions`, and the partial index cast
  rejects the vector. Register the model as a new row as described above.
- **Wrong `dimensions` on a row.** Set it to `NULL` so Kiwi re-probes it, then
  drop and recreate that model's index at the new size (the backfill script
  creates a missing index).
