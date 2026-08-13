-- AlterEnum
ALTER TYPE "ApprovalActionType" ADD VALUE 'CREATE_TOUR_BATCH';

-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "generatedFromTourId" TEXT;

-- CreateTable
CREATE TABLE "TourRule" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "intervalWeeks" INTEGER NOT NULL DEFAULT 1,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourStop" (
    "id" TEXT NOT NULL,
    "tourRuleId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "siteId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "agentIds" TEXT[],
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourStop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TourStop_tourRuleId_idx" ON "TourStop"("tourRuleId");

-- CreateIndex
CREATE INDEX "Intervention_batchId_idx" ON "Intervention"("batchId");

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_generatedFromTourId_fkey" FOREIGN KEY ("generatedFromTourId") REFERENCES "TourRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_tourRuleId_fkey" FOREIGN KEY ("tourRuleId") REFERENCES "TourRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
