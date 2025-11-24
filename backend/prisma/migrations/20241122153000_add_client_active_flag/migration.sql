-- Add active flag on clients to preserve legacy API shape
ALTER TABLE "Client"
ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
