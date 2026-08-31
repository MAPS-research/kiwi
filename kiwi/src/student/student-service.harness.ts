/**
 * Shared test harness for `StudentService`.
 *
 * The service has seventeen constructor dependencies, so every spec that wants
 * to exercise prompt assembly otherwise re-declares the same wall of provider
 * mocks. Two copies of that wall drift, and a drifted mock is how a prompt spec
 * ends up asserting against a shape production never produces.
 *
 * Only the defaults every caller needs live here. A spec that cares about a
 * particular collaborator overrides it on the returned mock.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { StudentService } from './student.service';
import { LlmService } from 'src/common/llm/llm.service';
import { UserSessionService } from 'src/common/database/user-session.service';
import { ClassService } from 'src/class/class.service';
import { ChatService } from 'src/common/chat/chat.service';
import { UserService } from 'src/common/database/user.service';
import { InteractionService } from 'src/interaction/interaction.service';
import { DocumentService } from 'src/document/document.service';
import { MaterialPersonalizationService } from './material-personalization/material-personalization.service';
import { KeywordService } from 'src/common/database/keyword.service';
import { ToolRegistryService } from 'src/common/tools/tool-registry.service';
import { AgentLoopService } from 'src/common/agent/agent-loop.service';
import { UserInteractionService } from 'src/common/database/user-interaction.service';
import { ExperimentService } from 'src/experiment/experiment.service';
import { KiwiAppService } from 'src/kiwi-app/kiwi-app.service';
import { ConversationHistoryService } from 'src/common/context/conversation-history.service';
import { ConversationService } from 'src/common/context/conversation.service';
import { ContextJobsService } from 'src/context-jobs/context-jobs.service';

export interface StudentServiceHarness {
  module: TestingModule;
  service: StudentService;
  llmService: jest.Mocked<LlmService>;
  userSessionService: jest.Mocked<UserSessionService>;
  classService: jest.Mocked<ClassService>;
  kiwiAppService: jest.Mocked<KiwiAppService>;
  chatService: jest.Mocked<ChatService>;
  userService: jest.Mocked<UserService>;
  interactionService: jest.Mocked<InteractionService>;
  documentService: jest.Mocked<DocumentService>;
  materialPersonalizationService: jest.Mocked<MaterialPersonalizationService>;
  keywordService: jest.Mocked<KeywordService>;
  toolRegistryService: jest.Mocked<ToolRegistryService>;
  agentLoopService: jest.Mocked<AgentLoopService>;
  userInteractionService: jest.Mocked<UserInteractionService>;
  experimentService: jest.Mocked<ExperimentService>;
  conversationHistoryService: jest.Mocked<ConversationHistoryService>;
  conversationService: jest.Mocked<ConversationService>;
  contextJobsService: jest.Mocked<ContextJobsService>;
}

export async function createStudentServiceHarness(): Promise<StudentServiceHarness> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      StudentService,
      {
        provide: LlmService,
        useValue: { createChat: jest.fn(), createChatStream: jest.fn() },
      },
      {
        provide: UserSessionService,
        useValue: {
          userSession: jest.fn(),
          incrementUserSessionTokensUsed: jest.fn(),
          updateUserSession: jest.fn(),
        },
      },
      {
        provide: ClassService,
        useValue: {
          getClassById: jest.fn(),
          getEnrollmentsPerUser: jest.fn(),
          queryClassDocuments: jest.fn(),
        },
      },
      {
        provide: ChatService,
        useValue: { createChat: jest.fn(), createChatStream: jest.fn() },
      },
      { provide: UserService, useValue: { user: jest.fn() } },
      {
        provide: InteractionService,
        useValue: { createInteraction: jest.fn() },
      },
      { provide: DocumentService, useValue: { getDocumentById: jest.fn() } },
      {
        provide: MaterialPersonalizationService,
        useValue: {
          getUserPersonalizations: jest.fn().mockResolvedValue([]),
          getRollingProfileBlock: jest.fn().mockResolvedValue(null),
        },
      },
      { provide: KeywordService, useValue: { getKeywords: jest.fn() } },
      {
        provide: ToolRegistryService,
        useValue: { getToolsForClass: jest.fn().mockResolvedValue([]) },
      },
      { provide: AgentLoopService, useValue: { executeAgentLoop: jest.fn() } },
      {
        provide: UserInteractionService,
        useValue: { userInteractionsWithServerActions: jest.fn() },
      },
      {
        provide: ExperimentService,
        useValue: {
          resolveActiveConfig: jest.fn(),
          resolveVariantConfig: jest.fn(),
        },
      },
      {
        provide: KiwiAppService,
        useValue: {
          // Default: the slug names no app installed for this class, which is
          // what a forged `app` block looks like from the server's side.
          resolveChatApp: jest.fn().mockResolvedValue(null),
        },
      },
      {
        provide: ConversationHistoryService,
        useValue: {
          getWindow: jest
            .fn()
            .mockResolvedValue({ messages: [], turnsAvailable: 0 }),
          getSummary: jest.fn().mockResolvedValue(null),
          needsCompaction: jest.fn().mockResolvedValue(false),
          compact: jest.fn(),
        },
      },
      {
        provide: ConversationService,
        useValue: {
          resolve: jest.fn().mockResolvedValue({ id: 'conv-row-1' }),
          noteTurn: jest.fn(),
          list: jest.fn().mockResolvedValue({ conversations: [], total: 0 }),
        },
      },
      {
        provide: ContextJobsService,
        useValue: {
          enqueueProfileExtraction: jest.fn().mockResolvedValue('job-1'),
          enqueueConversationCompaction: jest.fn().mockResolvedValue('job-2'),
        },
      },
    ],
  }).compile();

  return {
    module,
    service: module.get<StudentService>(StudentService),
    llmService: module.get(LlmService),
    userSessionService: module.get(UserSessionService),
    classService: module.get(ClassService),
    kiwiAppService: module.get(KiwiAppService),
    chatService: module.get(ChatService),
    userService: module.get(UserService),
    interactionService: module.get(InteractionService),
    documentService: module.get(DocumentService),
    materialPersonalizationService: module.get(MaterialPersonalizationService),
    keywordService: module.get(KeywordService),
    toolRegistryService: module.get(ToolRegistryService),
    agentLoopService: module.get(AgentLoopService),
    userInteractionService: module.get(UserInteractionService),
    experimentService: module.get(ExperimentService),
    conversationHistoryService: module.get(ConversationHistoryService),
    conversationService: module.get(ConversationService),
    contextJobsService: module.get(ContextJobsService),
  };
}
