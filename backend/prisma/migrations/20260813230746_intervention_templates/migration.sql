-- AlterEnum
ALTER TYPE "ApprovalActionType" ADD VALUE 'CREATE_TEMPLATE_BATCH';

-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "generatedFromTemplateId" TEXT;

-- CreateTable
CREATE TABLE "InterventionTemplate" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "intervalWeeks" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "autoGenerate" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateStop" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "siteId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "agentIds" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TemplateStop_templateId_idx" ON "TemplateStop"("templateId");

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_generatedFromTemplateId_fkey" FOREIGN KEY ("generatedFromTemplateId") REFERENCES "InterventionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateStop" ADD CONSTRAINT "TemplateStop_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "InterventionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateStop" ADD CONSTRAINT "TemplateStop_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
