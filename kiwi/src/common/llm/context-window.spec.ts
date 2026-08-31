import {
  DEFAULT_MODEL_CONTEXT_WINDOWS,
  isContextOverflowError,
  loadContextWindowTable,
  lookupContextWindow,
} from './context-window';

describe('lookupContextWindow', () => {
  it('matches an exact model id', () => {
    expect(lookupContextWindow('gpt-4o')).toBe(128_000);
  });

  it('falls back to the longest base model a dated snapshot extends', () => {
    // Deployments pin snapshots (`gpt-4o-2024-08-06`), and a snapshot dropping
    // off the table would report "unknown window" for a model we know well.
    expect(lookupContextWindow('gpt-4o-mini-2024-07-18')).toBe(
      DEFAULT_MODEL_CONTEXT_WINDOWS['gpt-4o-mini'],
    );
  });

  it('prefers the longest matching key, not the first', () => {
    // `gpt-4o` and `gpt-4o-mini` share a window in the shipped table, so a
    // custom one is needed to tell "longest wins" apart from "any prefix wins".
    const table = { 'gpt-4o': 128_000, 'gpt-4o-mini': 64_000 };

    expect(lookupContextWindow('gpt-4o-mini-2024-07-18', table)).toBe(64_000);
  });

  describe("this deployment's configured models", () => {
    // The boot check reported both of these as unknown, which is what prompted
    // filling them in. Pinned so a table edit cannot silently un-know them.
    it('knows the OpenAI chat model', () => {
      // Per OpenAI's model docs: 400,000 context / 128,000 max output.
      expect(lookupContextWindow('gpt-5.4-mini')).toBe(400_000);
    });

    it('does not confuse gpt-5.4-mini with gpt-5-mini', () => {
      // Different family, and the dotted name does not prefix-match the
      // undotted one — which is exactly why it read as unknown before.
      expect('gpt-5.4-mini'.startsWith('gpt-5-mini-')).toBe(false);
    });

    it('knows the self-hosted Qwen, including the -fast variant', () => {
      expect(lookupContextWindow('Qwen3.6-35B-A3B-fast')).toBe(262_144);
      expect(lookupContextWindow('Qwen3.6-35B-A3B')).toBe(262_144);
    });

    it('still reports gpt-5.4 as unknown', () => {
      // Not verified, so not guessed from its mini sibling. It warns at boot,
      // which is the correct outcome for a number nobody has checked.
      expect(lookupContextWindow('gpt-5.4')).toBeNull();
    });
  });

  it('reports null for an unknown model rather than guessing', () => {
    // Unknown means "do not assume", not "unlimited". A caller that reads a
    // missing entry as permission to send anything is the bug this prevents.
    expect(lookupContextWindow('some-model-we-have-never-seen')).toBeNull();
    expect(lookupContextWindow(undefined)).toBeNull();
  });
});

describe('loadContextWindowTable', () => {
  const get = (value?: string) => () => value;

  it('returns the defaults when nothing is configured', () => {
    expect(loadContextWindowTable(get())).toEqual(
      DEFAULT_MODEL_CONTEXT_WINDOWS,
    );
  });

  it('merges an override over the defaults', () => {
    const table = loadContextWindowTable(
      get(JSON.stringify({ 'gpt-4o': 200_000, 'house-model': 8_000 })),
    );

    expect(table['gpt-4o']).toBe(200_000);
    expect(table['house-model']).toBe(8_000);
    expect(table['qwen-plus']).toBe(DEFAULT_MODEL_CONTEXT_WINDOWS['qwen-plus']);
  });

  it('ignores malformed entries instead of adopting a wrong ceiling', () => {
    const table = loadContextWindowTable(
      get(JSON.stringify({ 'gpt-4o': 'lots', 'gpt-4.1': -1, 'gpt-5': 0 })),
    );

    expect(table['gpt-4o']).toBe(DEFAULT_MODEL_CONTEXT_WINDOWS['gpt-4o']);
    expect(table['gpt-4.1']).toBe(DEFAULT_MODEL_CONTEXT_WINDOWS['gpt-4.1']);
    expect(table['gpt-5']).toBe(DEFAULT_MODEL_CONTEXT_WINDOWS['gpt-5']);
  });

  it('survives unparseable JSON', () => {
    expect(loadContextWindowTable(get('{not json'))).toEqual(
      DEFAULT_MODEL_CONTEXT_WINDOWS,
    );
  });
});

describe('isContextOverflowError', () => {
  it('recognises the OpenAI code and wording', () => {
    expect(isContextOverflowError({ code: 'context_length_exceeded' })).toBe(
      true,
    );
    expect(
      isContextOverflowError({
        message:
          "This model's maximum context length is 128000 tokens. However, your messages resulted in 130000 tokens.",
      }),
    ).toBe(true);
  });

  it('recognises the DashScope wording', () => {
    // Qwen reaches us through the same SDK but words this differently, and
    // neither provider's phrasing is stable across versions.
    expect(
      isContextOverflowError({
        message: 'Range of input length should be [1, 129024]',
      }),
    ).toBe(true);
  });

  it('reads a nested SDK error envelope', () => {
    expect(
      isContextOverflowError({ error: { code: 'context_length_exceeded' } }),
    ).toBe(true);
  });

  it('does not claim unrelated failures', () => {
    // A false positive costs a wasted retry AND silently drops half the
    // conversation, so this must stay narrow.
    expect(isContextOverflowError({ code: 'rate_limit_exceeded' })).toBe(false);
    expect(isContextOverflowError({ message: 'Connection reset' })).toBe(false);
    expect(isContextOverflowError(new Error('invalid api key'))).toBe(false);
    expect(isContextOverflowError(null)).toBe(false);
    expect(isContextOverflowError(undefined)).toBe(false);
  });
});
