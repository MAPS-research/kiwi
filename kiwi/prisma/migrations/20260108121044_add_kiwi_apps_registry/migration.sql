-- CreateTable
CREATE TABLE "KiwiAppWhitelist" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "approvedBy" TEXT,

    CONSTRAINT "KiwiAppWhitelist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KiwiApp" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "baseUrl" TEXT NOT NULL,
    "iconUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT 'plugin',
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "capabilities" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "KiwiApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassKiwiApp" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "tabOrder" INTEGER NOT NULL DEFAULT 0,
    "tabLabel" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "enabledBy" TEXT,

    CONSTRAINT "ClassKiwiApp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KiwiAppWhitelist_slug_key" ON "KiwiAppWhitelist"("slug");

-- CreateIndex
CREATE INDEX "KiwiAppWhitelist_slug_idx" ON "KiwiAppWhitelist"("slug");

-- CreateIndex
CREATE INDEX "KiwiAppWhitelist_status_idx" ON "KiwiAppWhitelist"("status");

-- CreateIndex
CREATE UNIQUE INDEX "KiwiApp_slug_key" ON "KiwiApp"("slug");

-- CreateIndex
CREATE INDEX "KiwiApp_slug_idx" ON "KiwiApp"("slug");

-- CreateIndex
CREATE INDEX "KiwiApp_isActive_idx" ON "KiwiApp"("isActive");

-- CreateIndex
CREATE INDEX "KiwiApp_category_idx" ON "KiwiApp"("category");

-- CreateIndex
CREATE INDEX "ClassKiwiApp_classId_idx" ON "ClassKiwiApp"("classId");

-- CreateIndex
CREATE INDEX "ClassKiwiApp_appId_idx" ON "ClassKiwiApp"("appId");

-- CreateIndex
CREATE INDEX "ClassKiwiApp_classId_isEnabled_idx" ON "ClassKiwiApp"("classId", "isEnabled");

-- CreateIndex
CREATE UNIQUE INDEX "ClassKiwiApp_classId_appId_key" ON "ClassKiwiApp"("classId", "appId");

-- AddForeignKey
ALTER TABLE "ClassKiwiApp" ADD CONSTRAINT "ClassKiwiApp_appId_fkey" FOREIGN KEY ("appId") REFERENCES "KiwiApp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassKiwiApp" ADD CONSTRAINT "ClassKiwiApp_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
