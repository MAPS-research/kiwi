/*
  Warnings:

  - You are about to drop the column `classId` on the `McpServer` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "ClassToolConfig" DROP CONSTRAINT "ClassToolConfig_toolIdentifier_fkey";

-- DropForeignKey
ALTER TABLE "McpServer" DROP CONSTRAINT "McpServer_classId_fkey";

-- DropIndex
DROP INDEX "McpServer_classId_idx";

-- DropIndex
DROP INDEX "McpServer_classId_isActive_idx";

-- AlterTable
ALTER TABLE "McpServer" DROP COLUMN "classId";

-- CreateTable
CREATE TABLE "ClassMcpServer" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "displayName" TEXT,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "assignedBy" TEXT,

    CONSTRAINT "ClassMcpServer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClassMcpServer_classId_idx" ON "ClassMcpServer"("classId");

-- CreateIndex
CREATE INDEX "ClassMcpServer_mcpServerId_idx" ON "ClassMcpServer"("mcpServerId");

-- CreateIndex
CREATE INDEX "ClassMcpServer_classId_isEnabled_idx" ON "ClassMcpServer"("classId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMcpServer_classId_mcpServerId_key" ON "ClassMcpServer"("classId", "mcpServerId");

-- CreateIndex
CREATE INDEX "McpServer_isActive_idx" ON "McpServer"("isActive");

-- AddForeignKey
ALTER TABLE "ClassMcpServer" ADD CONSTRAINT "ClassMcpServer_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMcpServer" ADD CONSTRAINT "ClassMcpServer_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassToolConfig" ADD CONSTRAINT "ClassToolConfig_toolIdentifier_fkey" FOREIGN KEY ("toolIdentifier") REFERENCES "ClassMcpServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
