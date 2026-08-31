import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { ContextTrace, formatContextBlocks } from './context-trace';

describe('ContextTrace', () => {
  const sys = (content: string): ChatCompletionMessageParam => ({
    role: 'system',
    content,
  });
  const user = (content: string): ChatCompletionMessageParam => ({
    role: 'user',
    content,
  });

  it('attributes each message to the label marked after it was pushed', () => {
    const messages: ChatCompletionMessageParam[] = [];
    const trace = new ContextTrace();

    messages.push(sys('persona'));
    trace.mark(messages, 'stable-head', 'stable');
    messages.push(sys('profile'));
    trace.mark(messages, 'personalization', 'stable');
    messages.push(user('turn 1'), sys('turn 2'));
    trace.mark(messages, 'history', 'history');
    messages.push(user('what now?'));
    trace.mark(messages, 'prompt', 'current');

    const described = trace.describe(messages, ['rag']);

    expect(described.blocks.map((b) => b.label)).toEqual([
      'stable-head',
      'personalization',
      'history',
      'history',
      'prompt',
    ]);
    expect(described.blocks.map((b) => b.tier)).toEqual([
      'stable',
      'stable',
      'history',
      'history',
      'current',
    ]);
  });

  it('skips a mark that added nothing, so absent optional blocks do not shift labels', () => {
    const messages: ChatCompletionMessageParam[] = [];
    const trace = new ContextTrace();

    messages.push(sys('persona'));
    trace.mark(messages, 'stable-head', 'stable');
    // No personalization rows for this student.
    trace.mark(messages, 'personalization', 'stable');
    messages.push(user('hello'));
    trace.mark(messages, 'prompt', 'current');

    const described = trace.describe(messages, []);

    expect(described.blocks.map((b) => b.label)).toEqual([
      'stable-head',
      'prompt',
    ]);
  });

  it('treats unmarked messages as volatile rather than silently stable', () => {
    const messages: ChatCompletionMessageParam[] = [sys('persona'), user('hi')];
    const trace = new ContextTrace();
    trace.mark(messages.slice(0, 1), 'stable-head', 'stable');

    const described = trace.describe(messages, []);

    // The pessimistic reading: an unlabelled block shows up as a problem
    // instead of inflating the apparent cacheable prefix.
    expect(described.blocks[1].tier).toBe('volatile');
  });

  describe('prefixHash', () => {
    const build = (stableText: string, volatileText: string, tools: string[]) => {
      const messages: ChatCompletionMessageParam[] = [];
      const trace = new ContextTrace();
      messages.push(sys(stableText));
      trace.mark(messages, 'stable-head', 'stable');
      messages.push(sys(volatileText));
      trace.mark(messages, 'page-context', 'volatile');
      return trace.describe(messages, tools);
    };

    it('is unchanged when only volatile blocks change', () => {
      const turn1 = build('persona', 'page 3', ['rag', 'navigate']);
      const turn2 = build('persona', 'page 4', ['rag', 'navigate']);

      expect(turn2.prefixHash).toBe(turn1.prefixHash);
    });

    it('changes when the stable head changes', () => {
      const turn1 = build('persona', 'page 3', ['rag']);
      const turn2 = build('persona + class instructions', 'page 3', ['rag']);

      expect(turn2.prefixHash).not.toBe(turn1.prefixHash);
    });

    it('changes when the tool list is merely reordered', () => {
      // OpenAI hashes the `tools` array as part of the cached prefix, so a
      // reordered tool list is a real cache miss even with identical messages.
      const turn1 = build('persona', 'page 3', ['rag', 'navigate']);
      const turn2 = build('persona', 'page 3', ['navigate', 'rag']);

      expect(turn2.prefixHash).not.toBe(turn1.prefixHash);
    });
  });

  it('totals tokens per tier and only exposes content on request', () => {
    const messages: ChatCompletionMessageParam[] = [];
    const trace = new ContextTrace();
    messages.push(sys('a'.repeat(360)));
    trace.mark(messages, 'stable-head', 'stable');
    messages.push(user('b'.repeat(36)));
    trace.mark(messages, 'prompt', 'current');

    const withoutContent = trace.describe(messages, []);
    expect(withoutContent.blocks[0].content).toBeUndefined();
    expect(withoutContent.totals.stableEstTokens).toBeGreaterThan(90);
    expect(withoutContent.totals.volatileEstTokens).toBe(0);
    expect(withoutContent.totals.chars).toBe(396);

    const withContent = trace.describe(messages, [], true);
    expect(withContent.blocks[0].content).toHaveLength(360);
  });

  describe('conflicts', () => {
    it('reports nothing for an ordinary prompt', () => {
      const messages: ChatCompletionMessageParam[] = [];
      const trace = new ContextTrace();
      messages.push(sys('## Base prompt'));
      trace.mark(messages, 'stable-head', 'stable');
      messages.push(sys('## App-Provided Context\nsome state'));
      trace.mark(messages, 'app-context', 'volatile');

      expect(trace.describe(messages, []).conflicts).toEqual([]);
    });

    it('catches two blocks sharing a heading with different bodies', () => {
      // The real case: a client that stopped sending `conversation` but kept
      // sending `chatSummary` got the client summary AND the server's own, both
      // headed "Previous conversation context:", with no way for the model to
      // tell which was current.
      const messages: ChatCompletionMessageParam[] = [];
      const trace = new ContextTrace();
      messages.push(sys('Previous conversation context:\nthe client version'));
      trace.mark(messages, 'chat-summary', 'history');
      messages.push(sys('Previous conversation context:\nthe server version'));
      trace.mark(messages, 'history', 'history');

      const { conflicts } = trace.describe(messages, []);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('Previous conversation context:');
    });

    it('catches the same labelled block emitted twice', () => {
      const messages: ChatCompletionMessageParam[] = [];
      const trace = new ContextTrace();
      messages.push(sys('one'));
      trace.mark(messages, 'app-context', 'volatile');
      messages.push(sys('two'));
      trace.mark(messages, 'app-context', 'volatile');

      expect(trace.describe(messages, []).conflicts).toContainEqual(
        expect.stringContaining('duplicate block "app-context"'),
      );
    });

    it('does not flag history, which is legitimately many messages', () => {
      const messages: ChatCompletionMessageParam[] = [];
      const trace = new ContextTrace();
      messages.push({ role: 'user', content: 'q1' });
      messages.push({ role: 'assistant', content: 'a1' });
      messages.push({ role: 'user', content: 'q2' });
      trace.mark(messages, 'history', 'history');

      expect(trace.describe(messages, []).conflicts).toEqual([]);
    });
  });

  it('formats a log line with no block content in it', () => {
    const messages: ChatCompletionMessageParam[] = [];
    const trace = new ContextTrace();
    messages.push(sys('super secret class instructions'));
    trace.mark(messages, 'stable-head', 'stable');

    const line = formatContextBlocks(trace.describe(messages, ['rag']));

    expect(line).toContain('stable-head');
    expect(line).not.toContain('super secret');
  });
});
