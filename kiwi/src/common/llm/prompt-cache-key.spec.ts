import { buildPromptCacheKey, hashToolset } from './prompt-cache-key';

describe('buildPromptCacheKey', () => {
  const base = {
    classId: 'class-1',
    chatType: 'pdf',
    mode: 'guidance',
    toolNames: ['rag', 'code-interpreter', 'navigate'],
  };

  it('builds kiwi:v1:<class>:<chatType>:<mode>:<variant>:<toolsetHash>', () => {
    const key = buildPromptCacheKey(base);
    const parts = key.split(':');

    expect(parts.slice(0, 6)).toEqual([
      'kiwi',
      'v1',
      'class-1',
      'pdf',
      'guidance',
      'novariant',
    ]);
    expect(parts[6]).toMatch(/^[0-9a-f]{8}$/);
    expect(parts).toHaveLength(7);
  });

  it('separates experiment variants, which have different stable heads', () => {
    // A variant's authoritative instructions are appended to the stable head, so
    // two variants in one class genuinely do not share a prefix.
    const a = buildPromptCacheKey({ ...base, variantKey: 'control' });
    const b = buildPromptCacheKey({ ...base, variantKey: 'treatment' });

    expect(a).not.toBe(b);
    expect(a).toContain(':control:');
  });

  it('is stable for identical input', () => {
    expect(buildPromptCacheKey(base)).toBe(buildPromptCacheKey({ ...base }));
  });

  it('excludes user and conversation, so a class/mode shares one key', () => {
    // The helper takes no user or conversation input at all — two different
    // students in the same class and mode must land on the same key.
    const studentA = buildPromptCacheKey(base);
    const studentB = buildPromptCacheKey({ ...base });
    expect(studentA).toBe(studentB);
  });

  it('falls back to "noclass" when classId is missing', () => {
    expect(buildPromptCacheKey({ ...base, classId: undefined })).toContain(
      'kiwi:v1:noclass:',
    );
    expect(buildPromptCacheKey({ ...base, classId: null })).toContain(
      'kiwi:v1:noclass:',
    );
  });

  it('changes when the class, chat type or mode changes', () => {
    const key = buildPromptCacheKey(base);
    expect(buildPromptCacheKey({ ...base, classId: 'class-2' })).not.toBe(key);
    expect(buildPromptCacheKey({ ...base, chatType: 'codegen' })).not.toBe(key);
    expect(buildPromptCacheKey({ ...base, mode: 'recitation' })).not.toBe(key);
  });

  it('changes when the toolset changes', () => {
    const key = buildPromptCacheKey(base);
    expect(
      buildPromptCacheKey({ ...base, toolNames: [...base.toolNames, 'extra'] }),
    ).not.toBe(key);
  });

  it('treats tool ORDER as part of the toolset', () => {
    // Order is part of the engine's cached prefix, so it must be part of the
    // key too — a reordered list is a different prefix, not the same one.
    const reordered = [...base.toolNames].reverse();
    expect(buildPromptCacheKey({ ...base, toolNames: reordered })).not.toBe(
      buildPromptCacheKey(base),
    );
  });
});

describe('hashToolset', () => {
  it('returns 8 hex chars', () => {
    expect(hashToolset(['a', 'b'])).toMatch(/^[0-9a-f]{8}$/);
  });

  it('does not collide through concatenation', () => {
    expect(hashToolset(['ab', 'c'])).not.toBe(hashToolset(['a', 'bc']));
  });

  it('handles an empty toolset', () => {
    expect(hashToolset([])).toMatch(/^[0-9a-f]{8}$/);
  });
});
