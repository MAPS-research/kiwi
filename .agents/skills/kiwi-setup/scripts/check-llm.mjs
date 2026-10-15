#!/usr/bin/env node
// Check the LLM settings in kiwi/.env before Kiwi depends on them: the key is
// accepted, the embedding model returns vectors of the size Kiwi registered
// (1536 for the "openai" engine), and the chat model answers when called the
// way Kiwi calls it (max_completion_tokens, no temperature).
//
// Usage: node check-llm.mjs [path/to/kiwi/.env]
// Never prints the key. Costs a few tokens. Exit code 0 when all checks pass.

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_DIMENSIONS = 1536;

function findEnv() {
  if (process.argv[2]) return resolve(process.argv[2]);
  let dir = process.cwd();
  for (;;) {
    for (const candidate of [`${dir}/kiwi/.env`, `${dir}/.env`]) {
      if (existsSync(candidate) && existsSync(`${dirname(candidate)}/compose.yml`)) return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return resolve(dirname(fileURLToPath(import.meta.url)), '../../../../kiwi/.env');
}

function parseEnv(text) {
  const env = {};
  for (const raw of text.split('\n')) {
    const m = raw.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    } else {
      v = v.replace(/\s+#.*$/, '');
    }
    env[m[1]] = v;
  }
  return env;
}

const envPath = findEnv();
if (!existsSync(envPath)) {
  console.log(`FAIL  ${envPath} not found — create kiwi/.env first (step 3).`);
  process.exit(1);
}
const env = parseEnv(readFileSync(envPath, 'utf8'));
const key = env.LLM_API_KEY;
const base = (env.LLM_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const chatModel = env.LLM_CHAT_MODEL;
const embeddingModel = env.LLM_EMBEDDING_MODEL;

console.log(`Checking LLM settings from ${envPath}`);
console.log(`  endpoint:        ${base}`);
console.log(`  chat model:      ${chatModel || '(not set)'}`);
console.log(`  embedding model: ${embeddingModel || '(not set)'}`);
if (!key) {
  console.log('FAIL  LLM_API_KEY is empty.');
  process.exit(1);
}

async function call(path, body) {
  try {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text };
  } catch (err) {
    return { status: 0, json: null, text: String(err?.cause?.message || err?.message || err) };
  }
}

const reason = (r) =>
  (r.json?.error?.message || r.text || '').replace(key, '<key>').slice(0, 300);

let failed = false;

const emb = await call('/embeddings', { model: embeddingModel, input: 'dimension probe', encoding_format: 'float' });
if (emb.status === 200 && Array.isArray(emb.json?.data?.[0]?.embedding)) {
  const dims = emb.json.data[0].embedding.length;
  if (dims === EXPECTED_DIMENSIONS) {
    console.log(`ok    Embeddings work (${dims} dimensions, as Kiwi expects).`);
  } else {
    failed = true;
    console.log(`FAIL  Embeddings return ${dims} dimensions; Kiwi's "openai" engine is registered for ${EXPECTED_DIMENSIONS}.`);
    console.log('      Uploads would never become searchable. See references/configuration.md → LLM providers.');
  }
} else {
  failed = true;
  const hint = emb.status === 401 ? ' (the key was rejected)'
    : emb.status === 404 ? ' (no embeddings endpoint or unknown model)'
    : emb.status === 0 ? ' (could not connect — check LLM_BASE_URL and the network)' : '';
  console.log(`FAIL  Embeddings request failed: HTTP ${emb.status}${hint}`);
  console.log(`      ${reason(emb)}`);
}

const chat = await call('/chat/completions', {
  model: chatModel,
  messages: [{ role: 'user', content: 'Reply with the single word OK.' }],
  max_completion_tokens: 200,
});
if (chat.status === 200) {
  console.log('ok    Chat model answers.');
} else {
  failed = true;
  const hint = chat.status === 401 ? ' (the key was rejected)'
    : chat.status === 429 ? ' (rate limit or no credit on the account)'
    : chat.status === 0 ? ' (could not connect)' : '';
  console.log(`FAIL  Chat request failed: HTTP ${chat.status}${hint}`);
  console.log(`      ${reason(chat)}`);
}

console.log(failed ? 'RESULT  Fix the LLM settings before going on.' : 'RESULT  LLM settings are good.');
process.exit(failed ? 1 : 0);
