/*
  Warnings:

  - You are about to drop the column `actionName` on the `UserInteraction` table. All the data in the column will be lost.
  - You are about to drop the column `actions` on the `UserInteraction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ClassMaterial" ADD COLUMN     "imageLargeUrl" TEXT,
ADD COLUMN     "imageSnippetUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "intTag" INTEGER DEFAULT 0,
ADD COLUMN     "researchNotesForUser" JSONB,
ADD COLUMN     "stringTag" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "UserInteraction" DROP COLUMN "actionName",
DROP COLUMN "actions",
ADD COLUMN     "classId" TEXT,
ADD COLUMN     "context" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "intTag" INTEGER DEFAULT 0,
ADD COLUMN     "pdfId" TEXT,
ADD COLUMN     "pdfMaterialType" TEXT,
ADD COLUMN     "pdfPage" INTEGER,
ADD COLUMN     "stringTag" TEXT DEFAULT '',
ADD COLUMN     "type" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "intTag" INTEGER DEFAULT 0,
ADD COLUMN     "sessionLastActivateTime" TIMESTAMP(3),
ADD COLUMN     "stringTag" TEXT DEFAULT '';

-- CreateTable
CREATE TABLE "ServerAction" (
    "id" TEXT NOT NULL,
    "interactionId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "botResponse" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "engineChoice" TEXT,

    CONSTRAINT "ServerAction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerAction" ADD CONSTRAINT "ServerAction_interactionId_fkey" FOREIGN KEY ("interactionId") REFERENCES "UserInteraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
