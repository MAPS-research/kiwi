/*
  Warnings:

  - Added the required column `registrationSecret` to the `KiwiAppWhitelist` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "KiwiAppWhitelist" ADD COLUMN     "registrationSecret" TEXT NOT NULL;
