-- Create intervention rules table
CREATE TABLE "InterventionRule" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "daysOfWeek" INTEGER[] NOT NULL,
    "agentIds" TEXT[] NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterventionRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "InterventionRule"
ADD CONSTRAINT "InterventionRule_siteId_fkey"
FOREIGN KEY ("siteId") REFERENCES "Site"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Add relation from interventions to rules
ALTER TABLE "Intervention"
ADD COLUMN "generatedFromRuleId" TEXT;

ALTER TABLE "Intervention"
ADD CONSTRAINT "Intervention_generatedFromRuleId_fkey"
FOREIGN KEY ("generatedFromRuleId") REFERENCES "InterventionRule"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
