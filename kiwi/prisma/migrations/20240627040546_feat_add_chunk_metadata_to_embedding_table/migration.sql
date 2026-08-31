/*
  Warnings:

  - You are about to drop the column `chunkId` on the `Embedding` table. All the data in the column will be lost.
  - Added the required column `chunk` to the `Embedding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `documentPageNumber` to the `Embedding` table without a default value. This is not possible if the table is not empty.
  - Added the required column `text` to the `Embedding` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Embedding" DROP COLUMN "chunkId",
ADD COLUMN     "chunk" JSONB NOT NULL,
ADD COLUMN     "documentPageNumber" TEXT NOT NULL,
ADD COLUMN     "text" TEXT NOT NULL;
