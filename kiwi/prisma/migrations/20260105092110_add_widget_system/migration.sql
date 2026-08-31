-- CreateTable
CREATE TABLE "WidgetState" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "widgetId" TEXT NOT NULL,
    "conversationId" TEXT,
    "messageId" TEXT,
    "userId" TEXT NOT NULL,
    "classId" TEXT,
    "exerciseId" TEXT,
    "exerciseSetId" TEXT,
    "widgetState" JSONB NOT NULL DEFAULT '{}',
    "displayMode" TEXT NOT NULL DEFAULT 'expanded',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WidgetUserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "codeEditorTheme" TEXT NOT NULL DEFAULT 'vs-dark',
    "codeEditorFontSize" INTEGER NOT NULL DEFAULT 14,
    "appPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetUserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WidgetState_userId_idx" ON "WidgetState"("userId");

-- CreateIndex
CREATE INDEX "WidgetState_appId_idx" ON "WidgetState"("appId");

-- CreateIndex
CREATE INDEX "WidgetState_conversationId_idx" ON "WidgetState"("conversationId");

-- CreateIndex
CREATE INDEX "WidgetState_classId_idx" ON "WidgetState"("classId");

-- CreateIndex
CREATE INDEX "WidgetState_exerciseId_idx" ON "WidgetState"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetState_widgetId_userId_key" ON "WidgetState"("widgetId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WidgetUserPreference_userId_key" ON "WidgetUserPreference"("userId");

-- CreateIndex
CREATE INDEX "WidgetUserPreference_userId_idx" ON "WidgetUserPreference"("userId");
