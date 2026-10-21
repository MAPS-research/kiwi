/**
 * The status line's words (the companion v2 decision of 2026-10-18, "Playful"):
 * a fixed rotation of Kiwi verbs while Kiwi waits for the first step or token,
 * reading steps in a playful form that keeps their object, acting and tool steps
 * plain, and one line while the answer text streams. Never random, never a count,
 * and nothing that claims speed or quality.
 */

/** The wait verbs, in their fixed order. */
export const WAIT_VERBS = [
  "Foraging…",
  "Poking around…",
  "Rummaging around…",
  "Pecking away…",
  "Sniffing it out…",
] as const;

/** While the answer text streams. */
export const STREAM_LABEL = "Jotting it down…";

/** Reading steps (they change nothing on the page) keep their object in the playful form. */
const PLAYFUL_READING: Record<string, string> = {
  "Checking the page list": "Peeking at the page list…",
  "Looking up your classes": "Sniffing out your classes…",
  "Reading this page": "Peering at this page…",
  "Reading class analytics": "Peering at class analytics…",
  "Searching your class materials": "Pecking through class materials…",
  // The chain keeps its old label while SR-6.48 is gated; the line's words (CP.29) do not wait for it.
  "Searching materials": "Pecking through class materials…",
};

/**
 * The verb of a chat's n-th answer (1-based): the ((n − 1) mod 5)-th of the list,
 * so the first answer of every chat says "Foraging…". A retry is a new answer.
 */
export function waitVerbFor(answerNumber: number): string {
  const count = WAIT_VERBS.length;
  return WAIT_VERBS[(((answerNumber - 1) % count) + count) % count];
}

/**
 * A step's line: a reading step in its playful form; an acting or tool step as
 * its own label with an ellipsis ("Opening a page for you…", "Running code…").
 */
export function stepLabelFor(label: string): string {
  return PLAYFUL_READING[label] ?? `${label.replace(/…$/, "")}…`;
}
