-- CreateTable
CREATE TABLE "KiwiAppPrompt" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "systemPrompt" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "maxTokens" INTEGER,
    "temperature" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "KiwiAppPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KiwiAppPrompt_appId_idx" ON "KiwiAppPrompt"("appId");

-- CreateIndex
CREATE INDEX "KiwiAppPrompt_appId_isActive_idx" ON "KiwiAppPrompt"("appId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "KiwiAppPrompt_appId_promptId_key" ON "KiwiAppPrompt"("appId", "promptId");

-- AddForeignKey
ALTER TABLE "KiwiAppPrompt" ADD CONSTRAINT "KiwiAppPrompt_appId_fkey" FOREIGN KEY ("appId") REFERENCES "KiwiApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
