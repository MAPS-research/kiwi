-- AlterTable
ALTER TABLE "KiwiApp" ADD COLUMN     "appType" TEXT NOT NULL DEFAULT 'frontend_only',
ADD COLUMN     "mcpServerUrl" TEXT;

-- CreateTable
CREATE TABLE "KiwiAppUI" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "uiSlug" TEXT NOT NULL,
    "uiName" TEXT NOT NULL,
    "uiUrl" TEXT NOT NULL,
    "placement" TEXT NOT NULL DEFAULT 'class-tab',
    "allowedRoles" TEXT[] DEFAULT ARRAY['student', 'ta', 'instructor', 'admin']::TEXT[],
    "tabOrder" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KiwiAppUI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KiwiAppUI_appId_idx" ON "KiwiAppUI"("appId");

-- CreateIndex
CREATE INDEX "KiwiAppUI_placement_idx" ON "KiwiAppUI"("placement");

-- CreateIndex
CREATE INDEX "KiwiAppUI_appId_placement_idx" ON "KiwiAppUI"("appId", "placement");

-- CreateIndex
CREATE UNIQUE INDEX "KiwiAppUI_appId_uiSlug_key" ON "KiwiAppUI"("appId", "uiSlug");

-- AddForeignKey
ALTER TABLE "KiwiAppUI" ADD CONSTRAINT "KiwiAppUI_appId_fkey" FOREIGN KEY ("appId") REFERENCES "KiwiApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;
