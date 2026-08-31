# Embeddings & Multi-Provider RAG

The backend supports **multiple embedding providers/models with different vector
dimensions** on pgvector. OpenAI (`text-embedding-3-small`, 1536-dim) and the
Qwen engine (which in this deployment serves **bge-m3**, 1024-dim) coexist.

## How it works

- **`EmbeddingModel`** (Prisma) — registry of providers/models:
  `provider`, `model`, `dimensions` (auto-detected on first use via a one-token
  probe and cached). Seeded rows: `openai / text-embedding-3-small / 1536` and
  `qwen / bge-m3 / 1024`.
- **`EmbeddingVector`** — one row per `(chunk, model)`. Uses a **plain `vector`
  column** (no fixed dimension) so 1536 and 1024 vectors live side by side.
  Unique on `(embeddingId, modelId)`.
- **Per-model partial HNSW indexes** — each model has a cosine HNSW index scoped
  by `WHERE "modelId" = '<id>'` and built at that model's dimension. Retrieval
  casts to the model's dim so the right index is used.
- **Legacy** `Embedding.embedding vector(1536)` is kept (nullable) for
  back-compat; existing OpenAI vectors were backfilled into `EmbeddingVector`.

### Cross-model rule
A similarity search is **always filtered to a single model**. Vectors from
different models are never compared — different dimensions *and* different vector
spaces. The query is embedded with the **same** model the chunks were embedded
with. In the chat path this follows the request's `engineChoice`; otherwise it
falls back to `EMBEDDING_PROVIDER` (env), then `openai`.

## Configuration

| Env var | Purpose |
|---|---|
| `LLM_EMBEDDING_MODEL` / `LLM_BASE_URL` / `LLM_API_KEY` | OpenAI engine embedding |
| `QWEN_EMBEDDING_MODEL` / `QWEN_BASE_URL` / `QWEN_API_KEY` | Qwen engine embedding (set `QWEN_EMBEDDING_MODEL=bge-m3` here) |
| `EMBEDDING_PROVIDER` | Default embedding provider when not driven by chat `engineChoice` (`openai` \| `qwen`). Unset → `openai`. |

The chat `engineChoice` (`openai` \| `qwen`) selects both the chat model **and**
the embedding model for that request, so asking with Qwen retrieves against the
bge-m3 vectors.

## Seeding / migrating embeddings for a provider

When you add or switch an embedding provider, existing documents only have
vectors for whatever model first embedded them. **Re-embed existing chunks for
the target model** with the script — it also creates the per-model partial HNSW
index if missing and is idempotent (only fills gaps):

```bash
# Populate Qwen/bge-m3 (1024-dim) vectors for every already-chunked document
nvm use && npx ts-node scripts/reembed-missing.ts --provider qwen

# Or OpenAI, optionally scoped to one document
npx ts-node scripts/reembed-missing.ts --provider openai --documentId <uuid>
```

The script reads the same env vars the runtime uses for each engine
(`LLM_*` for openai, `QWEN_*` for qwen).

### Registering a brand-new provider/model
1. Add an engine to `engineConfigs` in `src/common/llm/llm.service.ts` (and its
   value to `EngineChoice` in `interfaces/engine-config.ts`) **or** point an
   existing engine's `*_EMBEDDING_MODEL`/`*_BASE_URL` at the new endpoint.
2. Insert an `EmbeddingModel` row (`provider`, `model`, leave `dimensions` NULL
   to auto-probe). The migration only seeds `openai` and `qwen` — new models are
   added here, and the reembed script creates their partial index on first run.
3. Run `scripts/reembed-missing.ts --provider <name>` to backfill vectors.

## Gotchas

- **A document with 0 `Embedding` rows returns no RAG results** even if it has a
  populated `chunks` JSONB — chunking and embedding are separate steps. Check
  `SELECT count(*) FROM "Embedding" WHERE "documentId"='<id>'` before assuming
  retrieval is broken.
- **Partial HNSW indexes are per-model DDL** — adding a new model requires its
  index (handled by the reembed script). It is *not* created automatically on
  `EmbeddingVector` insert.
- `dimensions` in the registry is a seed guess; if a deployment serves a
  different model than the seeded name implies, set the row's `dimensions` to
  NULL and the app re-probes on next use (then rebuild that model's index).
