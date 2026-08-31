-- AlterTable
ALTER TABLE "OAuthClient" ADD COLUMN     "mcpServerId" TEXT;

-- CreateIndex
CREATE INDEX "OAuthClient_mcpServerId_idx" ON "OAuthClient"("mcpServerId");

-- AddForeignKey
ALTER TABLE "OAuthClient" ADD CONSTRAINT "OAuthClient_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
