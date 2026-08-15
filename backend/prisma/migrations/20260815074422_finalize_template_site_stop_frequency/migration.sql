-- DropForeignKey
ALTER TABLE "InterventionTemplate" DROP CONSTRAINT "InterventionTemplate_siteId_fkey";

-- DropForeignKey
ALTER TABLE "TemplateStop" DROP CONSTRAINT "TemplateStop_siteId_fkey";

-- AlterTable
ALTER TABLE "InterventionTemplate" DROP COLUMN "intervalWeeks",
ALTER COLUMN "siteId" SET NOT NULL;

-- AlterTable
ALTER TABLE "TemplateStop" DROP COLUMN "siteId";

-- AddForeignKey
ALTER TABLE "InterventionTemplate" ADD CONSTRAINT "InterventionTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

