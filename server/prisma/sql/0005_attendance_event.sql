-- Attendance Management Framework — event (truth) layer + projection markers.
-- AttendanceEvent = append-only raw punches; the daily Attendance row is computed
-- from these by the calculation engine. Additive only.

CREATE TYPE "AttendanceEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- Projection markers on the existing daily record (additive columns).
ALTER TABLE "Attendance" ADD COLUMN "generatedFromEvents" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Attendance" ADD COLUMN "primarySourceId" TEXT;

CREATE TABLE "AttendanceEvent" (
  "id"                 TEXT NOT NULL,
  "companyId"          TEXT NOT NULL,
  "userId"             TEXT NOT NULL,
  "sourceId"           TEXT,
  "eventType"          "AttendanceEventType" NOT NULL,
  "timestamp"          TIMESTAMP(3) NOT NULL,
  "businessDate"       TIMESTAMP(3) NOT NULL,
  "verificationMethod" TEXT,
  "dedupKey"           TEXT NOT NULL,
  "status"             TEXT NOT NULL DEFAULT 'ACCEPTED',
  "note"               TEXT,
  "locationData"       JSONB,
  "rawPayload"         JSONB,
  "ingestedVia"        TEXT,
  "createdById"        TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AttendanceEvent_companyId_dedupKey_key" ON "AttendanceEvent" ("companyId", "dedupKey");
CREATE INDEX "AttendanceEvent_companyId_userId_businessDate_idx" ON "AttendanceEvent" ("companyId", "userId", "businessDate");
CREATE INDEX "AttendanceEvent_sourceId_idx" ON "AttendanceEvent" ("sourceId");
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttendanceEvent" ADD CONSTRAINT "AttendanceEvent_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "AttendanceSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
