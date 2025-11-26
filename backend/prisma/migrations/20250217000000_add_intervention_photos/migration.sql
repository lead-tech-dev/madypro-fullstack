-- Add photos array on intervention
ALTER TABLE "Intervention"
ADD COLUMN IF NOT EXISTS "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];
