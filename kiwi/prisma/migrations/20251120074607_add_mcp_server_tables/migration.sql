-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('RAG', 'CodeInterpreter', 'MCP');

-- CreateTable
CREATE TABLE "McpServer" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "transport" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "requiresOAuth" BOOLEAN NOT NULL DEFAULT false,
    "oauthMetadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "McpServer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "McpUserConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcpServerId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "connectionMetadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "McpUserConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassToolConfig" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "toolType" "ToolType" NOT NULL,
    "toolIdentifier" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "chatTypes" JSONB NOT NULL DEFAULT '[]',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassToolConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "McpServer_classId_idx" ON "McpServer"("classId");

-- CreateIndex
CREATE INDEX "McpServer_classId_isActive_idx" ON "McpServer"("classId", "isActive");

-- CreateIndex
CREATE INDEX "McpServer_transport_idx" ON "McpServer"("transport");

-- CreateIndex
CREATE INDEX "McpUserConnection_userId_idx" ON "McpUserConnection"("userId");

-- CreateIndex
CREATE INDEX "McpUserConnection_mcpServerId_idx" ON "McpUserConnection"("mcpServerId");

-- CreateIndex
CREATE INDEX "McpUserConnection_userId_isActive_idx" ON "McpUserConnection"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "McpUserConnection_userId_mcpServerId_key" ON "McpUserConnection"("userId", "mcpServerId");

-- CreateIndex
CREATE INDEX "ClassToolConfig_classId_idx" ON "ClassToolConfig"("classId");

-- CreateIndex
CREATE INDEX "ClassToolConfig_classId_isEnabled_idx" ON "ClassToolConfig"("classId", "isEnabled");

-- CreateIndex
CREATE INDEX "ClassToolConfig_toolType_idx" ON "ClassToolConfig"("toolType");

-- CreateIndex
CREATE UNIQUE INDEX "ClassToolConfig_classId_toolType_toolIdentifier_key" ON "ClassToolConfig"("classId", "toolType", "toolIdentifier");

-- AddForeignKey
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpUserConnection" ADD CONSTRAINT "McpUserConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "McpUserConnection" ADD CONSTRAINT "McpUserConnection_mcpServerId_fkey" FOREIGN KEY ("mcpServerId") REFERENCES "McpServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassToolConfig" ADD CONSTRAINT "ClassToolConfig_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassToolConfig" ADD CONSTRAINT "ClassToolConfig_toolIdentifier_fkey" FOREIGN KEY ("toolIdentifier") REFERENCES "McpServer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
