/**
 * Rollout switch for the tiered prompt layout.
 *
 * Two layouts exist for one release:
 *
 *   legacy   stable head (with the live environment interpolated INTO it)
 *            → profile → summary → retrieved context → history → prompt
 *
 *   tiered   stable head → profile → summary → history
 *            → environment → retrieved context → mode reminder → prompt
 *
 * The model sees the same information either way; only the order changes. The
 * point is the prefix. Measured on this deployment: a byte-identical prompt
 * caches at 88% (2176/2466 tokens), but under the legacy layout a single PDF
 * page turn rewrote block 0 and took the whole prefix with it, so real
 * conversations cached at 0%.
 *
 * An env var rather than a `Feature` flag because `Feature` is a fixed Prisma
 * enum — adding a value there means a migration, which is far too heavy for a
 * switch we expect to delete after one release.
 *
 * Default ON. Set `CONTEXT_ASSEMBLER_V2=false` to fall back to the legacy order.
 *
 * **Scope, precisely: this toggles the ORDER only.** It is not a rollback of the
 * surrounding work, and reading it as one will mislead you during an incident.
 * These ship in both layouts, on purpose:
 *
 *   - the rolling personalization profile replacing the per-session list
 *   - the tutoring-mode reminder before the user's prompt
 *   - server-owned history replay (only when the client sends no `conversation`)
 *   - the client-history bounds and the role coercion
 *   - the retrieved-chunk cap, the chatSummary cap, and the `{{/if}}` fix
 *
 * The first two change the prompt; the rest are bounds and correctness fixes we
 * would not want a layout switch to undo. To reach the pre-change prompt you
 * need the previous release, not this flag.
 */
export function isTieredAssemblyEnabled(): boolean {
  return process.env.CONTEXT_ASSEMBLER_V2 !== 'false';
}
