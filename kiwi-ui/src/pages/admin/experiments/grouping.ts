// Client-side reproduction of the backend's group assignment, so instructors
// can see a stable, authoritative student→group split BEFORE anyone chats.
//
// This intentionally mirrors the backend exactly for the seeded ("deterministic
// _hash") strategy — see kiwi/src/experiment/experiment.service.ts
// `assignRosterByQuota`: order the whole roster by sha256(`${userId}:${seed}`)
// (a seeded shuffle), then hand out variants by exact per-variant quotas
// (largest-remainder rounding). Because it's the same math over the same
// roster, the split shown here equals what `activate()` writes to the DB — no
// backend round-trip needed — and the head-count matches `allocation` exactly.
import type { ExperimentConfig, RosterEntry } from "../../../utils/experimentApi.ts";

/** Cumulative-weight pick — the backend's fallback for late-enrolled students. */
export const pickByWeight = <T extends { allocation: number }>(
  r: number,
  variants: T[],
): T => {
  let acc = 0;
  for (const v of variants) {
    acc += Number(v.allocation) || 0;
    if (r < acc) return v;
  }
  return variants[variants.length - 1];
};

/**
 * Integer per-variant head-counts for a roster of `total`, via largest-remainder
 * (Hamilton) so they sum to exactly `total`. Mirrors the backend `quotaCounts`.
 */
export const quotaCounts = (allocations: number[], total: number): number[] => {
  const raw = allocations.map((a) => (Number(a) || 0) * total);
  const counts = raw.map((x) => Math.floor(x));
  let remaining = total - counts.reduce((s, x) => s + x, 0);
  const byRemainder = raw
    .map((x, idx) => ({ idx, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.idx - b.idx);
  for (let j = 0; j < byRemainder.length && remaining > 0; j++, remaining--) {
    counts[byRemainder[j].idx]++;
  }
  return counts;
};

/** SHA-256 hex of a string — must match the backend's deterministic assignment. */
export async function sha256hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(str),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** True when the grouping can be reproduced/stably shown on the client. */
export const isReproducibleStrategy = (config: ExperimentConfig): boolean =>
  config.assignment.strategy === "deterministic_hash" ||
  config.assignment.strategy === "manual";

/**
 * Compute variantKey → student emails the same way the backend assigns.
 *  - manual: the explicit per-variant member lists.
 *  - deterministic_hash: seeded shuffle + exact quota slice (matches backend
 *    `assignRosterByQuota`), so counts match `allocation` precisely.
 *  - random: not reproducible client-side (decided server-side at activation);
 *    returns empty groups so callers can show an explanatory note instead.
 */
export async function computeGroups(
  config: ExperimentConfig,
  roster: RosterEntry[],
): Promise<Record<string, string[]>> {
  const groups: Record<string, string[]> = {};
  config.variants.forEach((v) => (groups[v.key] = []));

  if (config.assignment.strategy === "manual") {
    config.variants.forEach((v) => (groups[v.key] = [...(v.members ?? [])]));
    return groups;
  }
  if (config.assignment.strategy === "random") {
    return groups; // non-reproducible; caller shows a note
  }

  // Seeded shuffle: order the roster by its per-student hash (tie-break by
  // userId for total determinism), exactly like the backend.
  const ordered = (
    await Promise.all(
      roster.map(async (r) => ({
        r,
        h: await sha256hex(`${r.userId}:${config.assignment.seed}`),
      })),
    )
  ).sort((a, b) =>
    a.h < b.h
      ? -1
      : a.h > b.h
        ? 1
        : a.r.userId < b.r.userId
          ? -1
          : a.r.userId > b.r.userId
            ? 1
            : 0,
  );

  // Exact quota slice: first count[0] students → variant 0, and so on.
  const counts = quotaCounts(
    config.variants.map((v) => Number(v.allocation) || 0),
    ordered.length,
  );
  let i = 0;
  config.variants.forEach((v, idx) => {
    for (let k = 0; k < counts[idx]; k++) {
      groups[v.key].push(ordered[i++].r.email);
    }
  });
  return groups;
}
