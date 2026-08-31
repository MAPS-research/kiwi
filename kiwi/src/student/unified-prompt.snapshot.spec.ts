/**
 * Golden-file tests for the assembled chat prompt.
 *
 * Two things this repo depends on had no automated guard at all:
 *
 *  1. **Block order.** Moving volatile content after the replayed history took
 *     the prompt-cache hit rate from 0% to 88%. That invariant lived in code
 *     comments — a refactor that reordered two pushes would have cost the whole
 *     win silently, and the bill is the only place it would ever have shown up.
 *  2. **Stable-head text.** The head is byte-compared by the provider's cache.
 *     A stray newline in a prompt constant is invisible in review and expensive
 *     in production.
 *
 * The snapshots therefore capture the *skeleton* (label, role, tier, in order)
 * plus the full text of the stable tier. Volatile block content is deliberately
 * excluded: page context is course material and app context is a student's
 * activity, and neither belongs in a file we commit. The stable head is our own
 * prompt text, so it is safe — and it is the half that has to hold still.
 *
 * When one of these fails, read the diff before running `-u`. "The snapshot
 * changed" and "the cache prefix changed" are the same sentence.
 */
import {
  createStudentServiceHarness,
  StudentServiceHarness,
} from './student-service.harness';
import { checkBlockOrder } from 'src/common/context/context-blocks';

describe('unified prompt golden files', () => {
  let h: StudentServiceHarness;

  const CLASS = 'class-1';

  beforeEach(async () => {
    h = await createStudentServiceHarness();

    h.classService.getClassById.mockResolvedValue({
      id: CLASS,
      classMetadata: { className: 'Intro to Computer Programming' },
    } as any);
    h.toolRegistryService.getToolsForClass.mockResolvedValue([
      { type: 'function', function: { name: 'rag' } },
    ] as any);
    h.classService.queryClassDocuments.mockResolvedValue([
      { text: 'retrieved course chunk' },
    ] as any);
  });

  /** Assemble with fixed inputs — nothing here may vary between runs. */
  const assemble = (overrides: any = {}) =>
    (h.service as any).assembleUnifiedContext({
      classId: CLASS,
      userId: 'user-1',
      environment: { activeTab: 'materials' },
      prompt: 'a fixed question',
      pnStudyRatio: 1,
      n: 4,
      userGroup: 'control',
      chatType: 'pdf',
      systemRole: 'user',
      ...overrides,
    });

  const describeContext = async (overrides: any = {}) => {
    const { messages, tools, trace } = await assemble(overrides);
    return trace.describe(
      messages,
      tools.map((t: any) => t.function?.name),
      true, // include content; we choose per-block what to keep below
    );
  };

  /**
   * Skeleton plus stable-tier text. `chars` is deliberately included for
   * volatile blocks: it catches a budget regression without committing the
   * content itself.
   */
  const goldenOf = async (overrides: any = {}) => {
    const described = await describeContext(overrides);
    return {
      blocks: described.blocks.map((b: any) => ({
        label: b.label,
        role: b.role,
        tier: b.tier,
        ...(b.tier === 'stable' ? { text: b.content } : { chars: b.chars }),
      })),
      toolNames: described.toolNames,
    };
  };

  const MODES: Array<[string, any]> = [
    [
      'class materials',
      {
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
      },
    ],
    [
      'recitation',
      {
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'recitation',
        },
      },
    ],
    [
      'codegen',
      {
        codegen: { problemId: 'p1', codeContext: 'print("hi")' },
        chatType: 'codegen',
        environment: { activeTab: 'code' },
      },
    ],
    [
      'app',
      {
        app: { appSlug: 'codegen', classId: CLASS, appContext: 'app state' },
        environment: { activeTab: 'app', activeAppSlug: 'codegen' },
      },
    ],
  ];

  describe.each(MODES)('%s mode', (_name, overrides) => {
    it('assembles the expected prompt', async () => {
      expect(await goldenOf(overrides)).toMatchSnapshot();
    });
  });

  it('assembles the expected prompt for a student with a rolling profile', async () => {
    // The profile sits in the stable tier, so its rendering is part of the
    // cached prefix. It is also the block most likely to be reshaped later
    // (it replaced a per-session list), which is why it gets its own golden.
    h.materialPersonalizationService.getRollingProfileBlock.mockResolvedValue(
      'Learning style: visual. Prefers worked examples before definitions.',
    );

    expect(
      await goldenOf({
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
      }),
    ).toMatchSnapshot();
  });

  it('assembles the expected prompt for an app that requests guidance', async () => {
    // The registered case — an app the class installed, asking for the strict
    // tutoring mode. This is the one that carries the #215/#46 guardrail.
    h.kiwiAppService.resolveChatApp.mockResolvedValue({
      appSlug: 'codegen',
      tutoringMode: 'guidance',
    } as any);

    expect(
      await goldenOf({
        app: { appSlug: 'codegen', classId: CLASS, appContext: 'app state' },
        environment: { activeTab: 'app', activeAppSlug: 'codegen' },
      }),
    ).toMatchSnapshot();
  });

  // ==========================================================================
  // The invariants, asserted directly rather than only via the snapshots.
  // A snapshot tells you something moved; these tell you what it costs.
  // ==========================================================================

  describe('cache prefix', () => {
    const pdfAt = (pageNumber: number) => ({
      pdf: {
        classId: CLASS,
        pdfId: 'doc-1',
        pageNumber,
        materialType: 'classMaterials',
      },
    });

    it('survives a page turn', async () => {
      // This is the regression that cost 0%: the page number was interpolated
      // into message 0, so turning a page rewrote the whole cached prefix.
      const a = await describeContext(pdfAt(3));
      const b = await describeContext(pdfAt(4));

      expect(b.prefixHash).toBe(a.prefixHash);
    });

    it('survives a tab switch', async () => {
      const a = await describeContext({
        ...pdfAt(3),
        environment: { activeTab: 'materials' },
      });
      const b = await describeContext({
        ...pdfAt(3),
        environment: { activeTab: 'chat' },
      });

      expect(b.prefixHash).toBe(a.prefixHash);
    });

    it('is shared by two students in the same class and mode', async () => {
      // The cache key deliberately excludes user and conversation so a whole
      // class warms one prefix. A change that makes the head per-user would
      // still pass every other test in this file.
      const a = await describeContext({ ...pdfAt(3), userId: 'student-a' });
      const b = await describeContext({ ...pdfAt(3), userId: 'student-b' });

      expect(b.prefixHash).toBe(a.prefixHash);
    });

    it('changes when the tool list changes', async () => {
      // The tools array is part of what the provider hashes, so this SHOULD
      // differ — an unchanged hash here would mean the fingerprint is blind to
      // half of what it is supposed to fingerprint.
      const a = await describeContext(pdfAt(3));

      h.toolRegistryService.getToolsForClass.mockResolvedValue([
        { type: 'function', function: { name: 'rag' } },
        { type: 'function', function: { name: 'code_interpreter' } },
      ] as any);
      const b = await describeContext(pdfAt(3));

      expect(b.prefixHash).not.toBe(a.prefixHash);
    });

    it("clears the engines' minimum cacheable prefix", async () => {
      // OpenAI caches prefixes of >=1024 tokens; Qwen's floor is lower. A head
      // that drifts under the floor caches at zero without erroring.
      const { totals } = await describeContext(pdfAt(3));

      expect(totals.stableEstTokens).toBeGreaterThan(1024);
    });
  });

  describe('assembled prompt hygiene', () => {
    it('leaves no unrendered template token in any block', async () => {
      // `{{/if}}` reached every system prompt once. `stripUnrenderedTokens` is
      // a silent backstop, so without this assertion the next such bug is
      // invisible rather than merely embarrassing.
      const { blocks } = await describeContext({
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
      });

      for (const block of blocks) {
        expect(block.content ?? '').not.toMatch(/\{\{|\}\}/);
      }
    });

    it('keeps a client-supplied summary out of the cached prefix', async () => {
      // `chatSummary` is client free text about the conversation so far. Marked
      // `stable` it counted toward prefixHash, so a client that regenerates its
      // summary each turn moved the cached prefix on every request — the
      // 0%-cache failure this layout exists to prevent, through another door.
      const base = await describeContext({
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
        conversation: [{ role: 'user', content: 'earlier' }],
      });

      const withSummary = await describeContext({
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
        conversation: [{ role: 'user', content: 'earlier' }],
        chatSummary: 'a summary the client regenerates every single turn',
      });

      const block = withSummary.blocks.find(
        (b: any) => b.label === 'chat-summary',
      );
      expect(block).toBeDefined();
      expect(block!.tier).toBe('history');
      expect(withSummary.prefixHash).toBe(base.prefixHash);
    });

    it('never shows two "Previous conversation context" blocks at once', async () => {
      // A client mid-migration — no `conversation`, so server history applies,
      // but still sending `chatSummary`. Both blocks used to render under the
      // same heading with different contents.
      h.conversationHistoryService.getWindow.mockResolvedValue({
        messages: [{ role: 'user', content: 'a replayed turn' }],
        summary: 'the server-owned summary',
        turnsAvailable: 12,
      } as any);

      const { blocks, conflicts } = await describeContext({
        conversationId: 'thread-1',
        chatSummary: 'the client-owned summary',
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
      });

      const headings = blocks
        .map((b: any) => (b.content ?? '').split('\n', 1)[0])
        .filter((h: string) => h.startsWith('Previous conversation context'));

      expect(headings).toHaveLength(1);
      expect(conflicts).toEqual([]);
    });

    it('honours a budget override on every block that declares one', async () => {
      // `CONTEXT_BUDGET` declared eight caps and the producers hardcoded the
      // same literals, so four of these env vars did nothing at all: you could
      // set CONTEXT_MAX_APP_CONTEXT_CHARS to anything and the prompt would not
      // move. A budget nobody reads is not a budget.
      const saved = { ...process.env };
      process.env.CONTEXT_MAX_APP_CONTEXT_CHARS = '120';
      process.env.CONTEXT_MAX_CODE_CONTEXT_CHARS = '90';
      process.env.CONTEXT_MAX_ERROR_CONTEXT_CHARS = '60';

      try {
        const oversized = 'x'.repeat(50_000);

        const app = await describeContext({
          app: { appSlug: 'codegen', classId: CLASS, appContext: oversized },
          environment: { activeTab: 'app', activeAppSlug: 'codegen' },
        });
        const appBlock = app.blocks.find((b: any) => b.label === 'app-context');
        expect(appBlock).toBeDefined();
        // The heading is part of the block, so assert an upper bound rather
        // than an exact length.
        expect(appBlock!.chars).toBeLessThan(500);

        const codegen = await describeContext({
          codegen: {
            problemId: 'p1',
            codeContext: oversized,
            errorContext: oversized,
          },
          chatType: 'codegen',
          environment: { activeTab: 'code' },
        });
        const codeBlock = codegen.blocks.find(
          (b: any) => b.label === 'codegen-context',
        );
        expect(codeBlock).toBeDefined();
        expect(codeBlock!.chars).toBeLessThan(500);
      } finally {
        process.env = saved;
      }
    });

    it('emits blocks in the order CONTEXT_BLOCKS declares, in every mode', async () => {
      // The declaration is only worth having if it describes what the assembler
      // actually does. Checked across every mode rather than one, because the
      // volatile group differs per mode and it is the group that moves.
      //
      // History is supplied deliberately: without a history block there is
      // nothing for the volatile group to be misordered *against*, and this
      // assertion passes under the legacy layout too — vacuously. It caught me
      // once already.
      for (const [name, overrides] of MODES) {
        const { blocks } = await describeContext({
          ...(overrides as any),
          conversation: [
            { role: 'user', content: 'an earlier question' },
            { role: 'assistant', content: 'an earlier answer' },
          ],
        });
        const labels = blocks.map((b: any) => b.label);

        expect(labels).toContain('history');
        expect({ mode: name, problems: checkBlockOrder(labels) }).toEqual({
          mode: name,
          problems: [],
        });
      }
    });

    it('never places a stable block after a history or volatile one', async () => {
      // The ordering invariant the 88% rests on, stated once.
      const { blocks } = await describeContext({
        pdf: {
          classId: CLASS,
          pdfId: 'doc-1',
          pageNumber: 3,
          materialType: 'classMaterials',
        },
        conversation: [
          { role: 'user', content: 'earlier' },
          { role: 'assistant', content: 'earlier answer' },
        ],
      });

      const lastStable = blocks.map((b: any) => b.tier).lastIndexOf('stable');
      const firstNonStable = blocks.findIndex((b: any) => b.tier !== 'stable');

      expect(lastStable).toBeLessThan(firstNonStable);
    });
  });
});
