-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'UPDATE_TEMPLATE_STOP_AGENTS';

-- AlterTable
ALTER TABLE "InterventionTemplate" ADD COLUMN     "siteId" TEXT;

-- AlterTable
ALTER TABLE "TemplateStop" ADD COLUMN     "intervalWeeks" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "InterventionTemplate_siteId_key" ON "InterventionTemplate"("siteId");

-- AddForeignKey
ALTER TABLE "InterventionTemplate" ADD CONSTRAINT "InterventionTemplate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

