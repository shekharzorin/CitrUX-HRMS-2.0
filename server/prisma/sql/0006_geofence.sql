-- Attendance Management Framework — geofencing.
-- Geofence = an admin-defined allowed location (circle) for GPS attendance. Additive.

CREATE TABLE "Geofence" (
  "id"           TEXT NOT NULL,
  "companyId"    TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "centerLat"    DOUBLE PRECISION NOT NULL,
  "centerLng"    DOUBLE PRECISION NOT NULL,
  "radiusMeters" INTEGER NOT NULL DEFAULT 100,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Geofence_companyId_isActive_idx" ON "Geofence" ("companyId", "isActive");
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
