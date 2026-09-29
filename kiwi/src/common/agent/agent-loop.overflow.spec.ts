/**
 * Overflow recovery: what the loop does when the provider says the prompt is
 * too long.
 *
 * Before this existed, every LLM error landed in one catch and rendered as a
 * generic error bubble — so a prompt that was merely too long cost the student
 * their turn, and because nothing shrank in response, the next turn failed the
 * same way. The recovery has to shrink the prompt without breaking it, which is
 * the part worth testing: a shorter prompt that has lost its guardrail, or that
 * opens on an orphaned tool result, is not a recovery.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AgentLoopService } from './agent-loop.service';
import { LlmService } from '../llm/llm.service';
import { ChatService } from '../chat/chat.service';
import { ToolRegistryService } from '../tools/tool-registry.service';
import { InteractionService } from '../../interaction/interaction.service';
import { UserSessionService } from '../database/user-session.service';

describe('AgentLoopService overflow recovery', () => {
  let service: AgentLoopService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentLoopService,
        { provide: LlmService, useValue: { createChatStream: jest.fn() } },
        { provide: ChatService, useValue: {} },
        { provide: ToolRegistryService, useValue: { executeTool: jest.fn() } },
        {
          provide: InteractionService,
          useValue: { createServerAction: jest.fn() },
        },
        {
          provide: UserSessionService,
          useValue: { incrementUserSessionTokensUsed: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(AgentLoopService);
  });

  const shed = (messages: ChatCompletionMessageParam[]) =>
    (service as any).shedHistoryForOverflow(
      messages,
    ) as ChatCompletionMessageParam[];

  const sys = (content: string) =>
    ({ role: 'system', content }) as ChatCompletionMessageParam;
  const user = (content: string) =>
    ({ role: 'user', content }) as ChatCompletionMessageParam;
  const assistant = (content: string) =>
    ({ role: 'assistant', content }) as ChatCompletionMessageParam;

  it('never sheds the leading system messages', () => {
    // Persona, tool guidance and the guardrail live here. A shorter prompt that
    // has dropped its guardrail is a worse outcome than the failed request.
    const messages = [
      sys('persona and guardrails'),
      sys('profile'),
      ...Array.from({ length: 20 }, (_, i) => user(`turn ${i}`)),
    ];

    const result = shed(messages);

    expect(result[0]).toEqual(sys('persona and guardrails'));
    expect(result[1]).toEqual(sys('profile'));
    expect(result.length).toBeLessThan(messages.length);
  });

  it('drops the oldest replayed turns, keeping the newest', () => {
    // The newest turns are what the student is actually talking about.
    const messages = [
      sys('spine'),
      ...Array.from({ length: 10 }, (_, i) => user(`turn ${i}`)),
    ];

    const result = shed(messages);
    const kept = result.slice(1).map((m) => m.content);

    expect(kept).toContain('turn 9');
    expect(kept).not.toContain('turn 0');
  });

  it('does not leave the history opening on an assistant turn', () => {
    // An assistant message with no question in front of it reads as the
    // assistant having volunteered something unprompted.
    const messages = [
      sys('spine'),
      user('q1'),
      assistant('a1'),
      user('q2'),
      assistant('a2'),
      user('q3'),
      assistant('a3'),
    ];

    const result = shed(messages);

    expect(result[1].role).not.toBe('assistant');
  });

  it('does not leave an orphaned tool result at the front', () => {
    // A `tool` message refers to a tool call that would no longer be present.
    const messages = [
      sys('spine'),
      user('q1'),
      assistant('calling a tool'),
      {
        role: 'tool',
        tool_call_id: 'c1',
        content: 'result',
      } as ChatCompletionMessageParam,
      user('q2'),
      assistant('a2'),
    ];

    const result = shed(messages);

    expect(result[1].role).not.toBe('tool');
  });

  it('returns the array unchanged when there is nothing safe to shed', () => {
    // A prompt that overflows on its spine plus the current question alone
    // cannot be repaired this way, and the loop relies on the length not
    // changing to decide not to retry.
    const messages = [sys('spine'), user('the only question')];

    expect(shed(messages)).toBe(messages);
  });

  it('keeps at least the most recent message', () => {
    const messages = [sys('spine'), user('q1'), user('q2')];

    const result = shed(messages);

    expect(result[result.length - 1]).toEqual(user('q2'));
  });
});
