/*
  Warnings:

  - You are about to drop the `SiteChecklistItem` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SiteChecklistItem" DROP CONSTRAINT "SiteChecklistItem_siteId_fkey";

-- DropTable
DROP TABLE "SiteChecklistItem";
