import apiClient from "../utils/api.js";

export type PipelinePhase =
  | "uploading"
  | "chunking"
  | "describing"
  | "embedding"
  | "completed";

export interface PipelineProgress {
  phase: PipelinePhase;
  message?: string;
  documentId?: string;
  jobId?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------- Granular API wrappers (reusable everywhere) ----------

// 1) Upload a file into an EXISTING material
export async function uploadToMaterial(opts: {
  materialId: string;
  file: File;
}): Promise<{ documentId: string }> {
  const { materialId, file } = opts;
  const res = await apiClient.documentControllerUpload({
    file,
    classMaterialId: materialId,
  });
  const documentId = res?.document?.id;
  if (!documentId) throw new Error("Upload failed: no document id returned.");
  return { documentId };
}

// 2) Start chunk job
export async function startChunk(opts: {
  documentId: string;
}): Promise<{ jobId: string; message?: string }> {
  const { documentId } = opts;
  const res = await apiClient.documentControllerChunk({
    chunkRequest: { id: documentId },
  });
  const jobId = res?.jobId;
  if (!jobId) throw new Error("Chunk start failed: no job id returned.");
  return { jobId, message: res?.message };
}

// 3) Poll chunk status until completed or failed
export async function pollChunk(opts: {
  jobId: string;
  onTick?: (message: string) => void;
  intervalMs?: number;   // default 5000
  timeoutMs?: number;    // default 5 * 60 * 1000
}): Promise<void> {
  const { jobId, onTick, intervalMs = 5000, timeoutMs = 300000 } = opts;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await apiClient.documentControllerChunkStatus({
      chunkQueueRequest: { jobId },
    });
    const msg = status?.message ?? "";
    onTick?.(msg);

    if (/completed|finished/i.test(msg)) return;
    if (/failed|error/i.test(msg)) throw new Error(`Chunking failed: ${msg}`);

    await sleep(intervalMs);
  }
  throw new Error("Chunking timed out.");
}

// 4) Describe
export async function describeDocument(opts: { documentId: string }) {
  await apiClient.documentControllerDescribe({
    chunkRequest: { id: opts.documentId },
  });
}

// 5) Embed
export async function embedDocument(opts: { documentId: string }) {
  await apiClient.documentControllerEmbed({
    chunkRequest: { id: opts.documentId },
  });
}

// 6) Remove Embedding
export async function removeEmbedding(opts: { documentId: string }) {
  await apiClient.documentControllerRemoveEmbed({
    chunkRequest: { id: opts.documentId },
  });
}

// ---------- One-call “full pipeline” for an EXISTING material ----------

export async function runPipelineForExistingMaterial(opts: {
  materialId: string;
  file: File;
  onProgress?: (p: PipelineProgress) => void;
}) {
  const { materialId, file, onProgress } = opts;

  // (optional) enforce PDFs like Batch page does
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are accepted.");
  }

  onProgress?.({ phase: "uploading", message: "Uploading document..." });
  const { documentId } = await uploadToMaterial({ materialId, file });

  onProgress?.({ phase: "chunking", message: "Starting chunk job...", documentId });
  const { jobId } = await startChunk({ documentId });

  await pollChunk({
    jobId,
    onTick: (m) => onProgress?.({ phase: "chunking", message: m, documentId, jobId }),
  });

  onProgress?.({ phase: "describing", message: "Describing...", documentId });
  await describeDocument({ documentId });

  onProgress?.({ phase: "embedding", message: "Embedding...", documentId });
  await embedDocument({ documentId });

  onProgress?.({ phase: "completed", message: "All steps finished.", documentId, jobId });

  return { documentId, jobId };
}

// ---------- One-call “full pipeline” re-run for an EXISTING document ----------
// Re-runs chunk -> poll -> describe -> embed against a document that already
// exists (e.g. to recover from a chunking bug that produced zero chunks).
// Does NOT upload a new file or create a new Document row.

export async function reprocessExistingDocument(opts: {
  documentId: string;
  onProgress?: (p: PipelineProgress) => void;
}) {
  const { documentId, onProgress } = opts;

  onProgress?.({ phase: "chunking", message: "Starting chunk job...", documentId });
  const { jobId } = await startChunk({ documentId });

  await pollChunk({
    jobId,
    onTick: (m) => onProgress?.({ phase: "chunking", message: m, documentId, jobId }),
  });

  onProgress?.({ phase: "describing", message: "Describing...", documentId });
  await describeDocument({ documentId });

  onProgress?.({ phase: "embedding", message: "Embedding...", documentId });
  await embedDocument({ documentId });

  onProgress?.({ phase: "completed", message: "All steps finished.", documentId, jobId });

  return { documentId, jobId };
}
