-- Attendance Management Framework — config layer (first slice).
-- AttendanceSource = an admin-configured attendance method per company.
-- Additive only (3 new enum types + 1 table). No changes to existing attendance tables.

CREATE TYPE "AttendanceSourceType" AS ENUM (
  'BIOMETRIC_ZKTECO', 'BIOMETRIC_ESSL', 'BIOMETRIC_MATRIX', 'BIOMETRIC_GENERIC',
  'MOBILE_GPS', 'QR', 'RFID_NFC', 'WEBCAM', 'MANUAL', 'CSV_IMPORT', 'EXTERNAL_API', 'WEB_PORTAL'
);
CREATE TYPE "AttendanceIngestionMode" AS ENUM ('WEBHOOK', 'PULL_SYNC', 'IMPORT', 'DIRECT');
CREATE TYPE "AttendanceSourceHealth" AS ENUM ('UNKNOWN', 'HEALTHY', 'DEGRADED', 'ERROR');

CREATE TABLE "AttendanceSource" (
  "id"            TEXT NOT NULL,
  "companyId"     TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "type"          "AttendanceSourceType" NOT NULL,
  "ingestionMode" "AttendanceIngestionMode" NOT NULL,
  "configuration" JSONB NOT NULL DEFAULT '{}',
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "priority"      INTEGER NOT NULL DEFAULT 0,
  "healthStatus"  "AttendanceSourceHealth" NOT NULL DEFAULT 'UNKNOWN',
  "lastSyncAt"    TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttendanceSource_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AttendanceSource_companyId_isActive_idx" ON "AttendanceSource" ("companyId", "isActive");
ALTER TABLE "AttendanceSource" ADD CONSTRAINT "AttendanceSource_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
