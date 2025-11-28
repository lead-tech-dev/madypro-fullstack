-- Supprimer les clés site/client d'Attendance (elles sont dans Intervention)
ALTER TABLE "Attendance" DROP COLUMN "siteId";
ALTER TABLE "Attendance" DROP COLUMN "clientId";
