-- CreateTable
CREATE TABLE "ConversationSummary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "coversUpToTimestamp" TIMESTAMP(3) NOT NULL,
    "turnsCovered" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversationSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversationSummary_userId_idx" ON "ConversationSummary"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationSummary_userId_conversationId_key" ON "ConversationSummary"("userId", "conversationId");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_stringTag_timestamp_idx" ON "UserInteraction"("userId", "stringTag", "timestamp");

-- AddForeignKey
ALTER TABLE "ConversationSummary" ADD CONSTRAINT "ConversationSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

