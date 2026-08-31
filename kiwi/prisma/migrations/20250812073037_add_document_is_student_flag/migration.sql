/*
  Warnings:

  - You are about to drop the column `role` on the `Document` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Document" DROP COLUMN "role",
ADD COLUMN     "isLlm" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isStudent" BOOLEAN NOT NULL DEFAULT false;
