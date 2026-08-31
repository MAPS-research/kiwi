import { MaterialPersonalization } from '@prisma/client';

/**
 * Merging of stored `MaterialPersonalization` rows into one short profile block.
 *
 * Two problems this solves, both about what lands in the system prompt:
 *
 * 1. **Size / cache.** The rows are one per past session and were rendered one
 *    line each, so the block grew without bound and its bytes changed after
 *    every session — which invalidates the provider's cached prompt prefix.
 *    Merged, it is a handful of lines that change only when the student's
 *    dominant style changes.
 * 2. **Trust.** Every field here is free text an LLM wrote after reading a
 *    student's conversation. Putting that verbatim into a *system* message
 *    hands whatever the student typed the most privileged position in the
 *    prompt. It is sanitised on the way out, not on the way in, so legacy rows
 *    written before this existed are covered too.
 */

/** Rows merged into the profile. Deliberately smaller than the DB default. */
export const MAX_ROLLING_PROFILE_ROWS = 5;

/** Per-field cap; these are meant to be phrases, not paragraphs. */
export const MAX_PROFILE_FIELD_CHARS = 160;

/** Recurring strengths / gaps listed. */
export const MAX_PROFILE_ITEMS = 3;

const FILTERED = '[filtered]';
const REDACTED = '[redacted]';

/** Anything the extractor emits when it had nothing to go on. */
const NO_SIGNAL_PATTERNS = [
  /^can'?t\s+infer/i,
  /^(?:unknown|none|n\/?a|null|undefined|no\s+data)$/i,
];

/**
 * Identifiers we can actually detect. Names cannot be reliably recognised in
 * free text, but an address or a link is the part that is directly actionable
 * about *someone else*, and the same no-identity-leakage discipline CLAUDE.md
 * mandates for Kiwi Apps applies to text we re-inject into a prompt.
 */
const IDENTIFIER_PATTERNS: RegExp[] = [
  /[\w.+-]+@[\w-]+\.[\w.-]+/g, // email
  /\b(?:https?:\/\/|www\.)\S+/gi, // url
];

/**
 * Structural tokens that let stored text pose as prompt scaffolding: chat
 * markup, markdown headings/fences, and the `{{...}}` markers the environment
 * prompt template is rendered with.
 */
const STRUCTURE_PATTERNS: RegExp[] = [
  /<\|[^|]*\|>/g,
  /<\/?(?:system|assistant|user|human|im_start|im_end)[^>]*>/gi,
  /\{\{[^}]*\}?\}?/g,
  /```+/g,
  /^#+\s*/g,
];

/** Free-form instructions aimed at the model rather than facts about a student. */
const INSTRUCTION_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget)\b[^.!?]*\b(?:previous|prior|above|earlier|everything|all)\b[^.!?]*/gi,
  /\b(?:new|updated|revised)\s+(?:system\s+)?instructions?\b[^.!?]*/gi,
  /\bsystem\s+prompt\b[^.!?]*/gi,
  /\byou\s+(?:are|must|should|will|shall)\s+now\b[^.!?]*/gi,
  /\b(?:pretend|roleplay|role-play)\s+(?:to\s+be|as|that)\b[^.!?]*/gi,
  /\breveal\s+(?:your|the)\b[^.!?]*/gi,
  /\b(?:always|never)\s+(?:respond|answer|reply|say)\b[^.!?]*/gi,
  /^\s*(?:system|assistant|user)\s*:/gi,
];

export interface RollingUserProfile {
  learningStyle: string | null;
  questionStyle: string | null;
  strengths: string[];
  gaps: string[];
  /** Minutes across the merged sessions, rounded. */
  totalTimeMinutes: number;
  sessionsCovered: number;
}

/** Only the columns the merge reads, so callers and tests need nothing more. */
export type PersonalizationRow = Pick<
  MaterialPersonalization,
  | 'timeSpent'
  | 'learningStyle'
  | 'questionStyle'
  | 'studentGoodAt'
  | 'studentsImproveAt'
>;

/**
 * Reduce one stored field to something safe to paste into a system message, or
 * to `''` when nothing usable survives.
 */
export function sanitizeProfileText(raw: string | null | undefined): string {
  if (!raw) {
    return '';
  }

  // Flatten first: a newline is what would let injected text read as a new
  // block rather than as part of this sentence.
  let text = raw.replace(/\s+/g, ' ').trim();

  for (const pattern of IDENTIFIER_PATTERNS) {
    text = text.replace(pattern, REDACTED);
  }
  for (const pattern of STRUCTURE_PATTERNS) {
    text = text.replace(pattern, ' ');
  }
  for (const pattern of INSTRUCTION_PATTERNS) {
    text = text.replace(pattern, FILTERED);
  }

  text = text
    .replace(/\[filtered\](?:[\s,;.]*\[filtered\])+/g, FILTERED)
    .replace(/\s+/g, ' ')
    .replace(/^[\s,;:.\-*>]+/, '')
    .trim();

  if (NO_SIGNAL_PATTERNS.some((pattern) => pattern.test(text))) {
    return '';
  }
  // Nothing but the placeholder means the whole value was an injection attempt.
  if (text.replace(/\[filtered\]/g, '').replace(/[\s.,;:!?-]/g, '') === '') {
    return '';
  }

  return text.length > MAX_PROFILE_FIELD_CHARS
    ? `${text.slice(0, MAX_PROFILE_FIELD_CHARS).trimEnd()}…`
    : text;
}

/**
 * Merge rows (most recent first, as the DB query returns them) into one profile.
 * Returns `null` when there is nothing worth injecting.
 */
export function mergeRollingProfile(
  rows: PersonalizationRow[],
): RollingUserProfile | null {
  if (!rows || rows.length === 0) {
    return null;
  }

  const learningStyle = dominant(rows.map((row) => row.learningStyle));
  const questionStyle = dominant(rows.map((row) => row.questionStyle));
  const strengths = recurring(rows.map((row) => row.studentGoodAt));
  const gaps = recurring(rows.map((row) => row.studentsImproveAt));
  const totalTimeMinutes = Math.round(
    rows.reduce((total, row) => total + parseMinutes(row.timeSpent), 0),
  );

  if (
    !learningStyle &&
    !questionStyle &&
    strengths.length === 0 &&
    gaps.length === 0
  ) {
    return null;
  }

  return {
    learningStyle,
    questionStyle,
    strengths,
    gaps,
    totalTimeMinutes: totalTimeMinutes > 0 ? totalTimeMinutes : 0,
    sessionsCovered: rows.length,
  };
}

/** Render the profile as the system-message block injected into a chat turn. */
export function renderRollingProfileBlock(profile: RollingUserProfile): string {
  const lines = ['Student personalization information:'];

  if (profile.learningStyle) {
    lines.push(`- Learning style: ${profile.learningStyle}`);
  }
  if (profile.questionStyle) {
    lines.push(`- Question style: ${profile.questionStyle}`);
  }
  if (profile.strengths.length > 0) {
    lines.push(`- Good at: ${profile.strengths.join('; ')}`);
  }
  if (profile.gaps.length > 0) {
    lines.push(`- Needs improvement: ${profile.gaps.join('; ')}`);
  }
  if (profile.totalTimeMinutes > 0) {
    lines.push(
      `- Studied about ${profile.totalTimeMinutes} minutes across ${profile.sessionsCovered} recent session(s).`,
    );
  }

  return lines.join('\n');
}

function parseMinutes(value: string | null | undefined): number {
  const minutes = Number.parseFloat(value ?? '');
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 0;
}

/**
 * Most frequent value; ties go to the most recent, since rows arrive newest
 * first. That keeps the block stable while a habit holds and lets it move when
 * the student's behaviour actually changes.
 */
function dominant(values: string[]): string | null {
  const ranked = rank(values);
  return ranked.length > 0 ? ranked[0] : null;
}

function recurring(values: string[]): string[] {
  return rank(values).slice(0, MAX_PROFILE_ITEMS);
}

function rank(values: string[]): string[] {
  const seen = new Map<string, { text: string; count: number; index: number }>();

  values.forEach((value, index) => {
    const text = sanitizeProfileText(value);
    if (!text) {
      return;
    }
    const key = text.toLowerCase();
    const existing = seen.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(key, { text, count: 1, index });
    }
  });

  return [...seen.values()]
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map((entry) => entry.text);
}
