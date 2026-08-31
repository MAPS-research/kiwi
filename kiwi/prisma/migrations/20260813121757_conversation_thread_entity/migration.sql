-- AlterTable
ALTER TABLE "UserInteraction" ADD COLUMN     "conversationId" TEXT;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "threadKey" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "classId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'chat',
    "title" TEXT,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "lastTurnAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_userId_lastTurnAt_idx" ON "Conversation"("userId", "lastTurnAt");

-- CreateIndex
CREATE INDEX "Conversation_classId_idx" ON "Conversation"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_userId_threadKey_key" ON "Conversation"("userId", "threadKey");

-- CreateIndex
CREATE INDEX "UserInteraction_conversationId_timestamp_idx" ON "UserInteraction"("conversationId", "timestamp");

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

