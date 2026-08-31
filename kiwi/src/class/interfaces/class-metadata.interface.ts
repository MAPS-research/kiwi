import { Prisma } from '@prisma/client';

export interface SystemPrompts extends Prisma.JsonObject {
  defaultSystemMessage?: string;
  classMaterialsPrompt?: string;
  recitationPrompt?: string;
}

export interface ClassMetadata extends Prisma.JsonObject {
  className: string;
  description: string;
  systemPrompts?: SystemPrompts;
  professorName?: string;
  professorEmail?: string;
  imageSnippetUrl?: string;
}
