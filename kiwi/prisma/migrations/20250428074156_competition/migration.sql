/*
  Warnings:

  - Made the column `intTag` on table `UserInteraction` required. This step will fail if there are existing NULL values in that column.
  - Made the column `stringTag` on table `UserInteraction` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "UserInteraction" ADD COLUMN     "discussionId" TEXT,
ADD COLUMN     "numUpvotes" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "intTag" SET NOT NULL,
ALTER COLUMN "stringTag" SET NOT NULL;

-- CreateTable
CREATE TABLE "UpvoteInteraction" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,

    CONSTRAINT "UpvoteInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscussionRoot" (
    "id" TEXT NOT NULL,
    "descendantIds" TEXT[],
    "classId" TEXT NOT NULL,

    CONSTRAINT "DiscussionRoot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discussion" (
    "id" TEXT NOT NULL,
    "rootId" TEXT NOT NULL,
    "parentId" TEXT,
    "userId" TEXT NOT NULL,
    "classId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL DEFAULT 'post',
    "interactionIds" TEXT[],
    "intTag" INTEGER NOT NULL DEFAULT 0,
    "stringTag" TEXT NOT NULL DEFAULT '',
    "numUpvotes" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Discussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpvoteDiscussion" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "discussionId" TEXT NOT NULL,

    CONSTRAINT "UpvoteDiscussion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "competitorIds" TEXT[],
    "dailyLimit" INTEGER NOT NULL DEFAULT 5,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "public" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "metaData" JSONB NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bestScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestScoreTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metaData" JSONB NOT NULL,
    "intTag" INTEGER NOT NULL DEFAULT 0,
    "stringTag" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitorEntry" (
    "id" TEXT NOT NULL,
    "competitorId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metrics" JSONB NOT NULL,
    "metaData" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',

    CONSTRAINT "CompetitorEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpvoteInteraction_userId_interactionId_idx" ON "UpvoteInteraction"("userId", "interactionId");

-- CreateIndex
CREATE UNIQUE INDEX "UpvoteInteraction_userId_interactionId_key" ON "UpvoteInteraction"("userId", "interactionId");

-- CreateIndex
CREATE INDEX "DiscussionRoot_classId_idx" ON "DiscussionRoot"("classId");

-- CreateIndex
CREATE INDEX "Discussion_rootId_idx" ON "Discussion"("rootId");

-- CreateIndex
CREATE INDEX "Discussion_userId_idx" ON "Discussion"("userId");

-- CreateIndex
CREATE INDEX "Discussion_classId_idx" ON "Discussion"("classId");

-- CreateIndex
CREATE INDEX "Discussion_type_idx" ON "Discussion"("type");

-- CreateIndex
CREATE INDEX "UpvoteDiscussion_userId_discussionId_idx" ON "UpvoteDiscussion"("userId", "discussionId");

-- CreateIndex
CREATE UNIQUE INDEX "UpvoteDiscussion_userId_discussionId_key" ON "UpvoteDiscussion"("userId", "discussionId");

-- CreateIndex
CREATE INDEX "Competitor_userId_competitionId_idx" ON "Competitor"("userId", "competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "Competitor_userId_competitionId_key" ON "Competitor"("userId", "competitionId");

-- CreateIndex
CREATE INDEX "UserInteraction_userId_idx" ON "UserInteraction"("userId");

-- CreateIndex
CREATE INDEX "UserInteraction_sessionId_idx" ON "UserInteraction"("sessionId");

-- CreateIndex
CREATE INDEX "UserInteraction_classId_idx" ON "UserInteraction"("classId");

-- CreateIndex
CREATE INDEX "UserInteraction_discussionId_idx" ON "UserInteraction"("discussionId");

-- CreateIndex
CREATE INDEX "UserInteraction_type_idx" ON "UserInteraction"("type");

-- CreateIndex
CREATE INDEX "UserInteraction_pdfId_pdfPage_idx" ON "UserInteraction"("pdfId", "pdfPage");

-- CreateIndex
CREATE INDEX "UserInteraction_pdfId_pdfPage_type_idx" ON "UserInteraction"("pdfId", "pdfPage", "type");

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpvoteInteraction" ADD CONSTRAINT "UpvoteInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpvoteInteraction" ADD CONSTRAINT "UpvoteInteraction_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "UserInteraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscussionRoot" ADD CONSTRAINT "DiscussionRoot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_rootId_fkey" FOREIGN KEY ("rootId") REFERENCES "DiscussionRoot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Discussion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Discussion" ADD CONSTRAINT "Discussion_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpvoteDiscussion" ADD CONSTRAINT "UpvoteDiscussion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpvoteDiscussion" ADD CONSTRAINT "UpvoteDiscussion_discussionId_fkey" FOREIGN KEY ("discussionId") REFERENCES "Discussion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitorEntry" ADD CONSTRAINT "CompetitorEntry_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
