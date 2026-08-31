/*
  Warnings:

  - You are about to drop the column `embedding` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "embedding";

-- CreateTable
CREATE TABLE "Embedding" (
    "id" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "chunkId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "Embedding_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Embedding" ADD CONSTRAINT "Embedding_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
