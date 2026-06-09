-- Attendance Management Framework — selfie attendance (Phase A).
-- Additive: selfie evidence URL + status on AttendanceEvent. No verification logic.
-- selfieStatus: CAPTURED now (future-ready: VERIFIED | REJECTED | EXPIRED).

ALTER TABLE "AttendanceEvent" ADD COLUMN "selfieUrl" TEXT;
ALTER TABLE "AttendanceEvent" ADD COLUMN "selfieStatus" TEXT;
