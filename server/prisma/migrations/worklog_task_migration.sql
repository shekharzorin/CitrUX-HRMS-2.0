-- ============================================================
-- Citrux HRMS: Work Tracking Module Migration
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard → SQL Editor
-- ============================================================

-- 1. Add WorkLog table
CREATE TABLE IF NOT EXISTS "WorkLog" (
    "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
    "userId"      TEXT        NOT NULL,
    "date"        TIMESTAMP(3) NOT NULL,
    "hoursWorked" DOUBLE PRECISION NOT NULL,
    "breakTime"   DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT        NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WorkLog_userId_date_key" UNIQUE ("userId", "date"),
    CONSTRAINT "WorkLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- 2. Alter Task table: add userId, priority, dueDate, updatedAt, change status default
ALTER TABLE "Task"
    ADD COLUMN IF NOT EXISTS "userId"    TEXT,
    ADD COLUMN IF NOT EXISTS "priority"  TEXT NOT NULL DEFAULT 'MEDIUM',
    ADD COLUMN IF NOT EXISTS "dueDate"   TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Change status default from ACTIVE to TODO
ALTER TABLE "Task" ALTER COLUMN "status" SET DEFAULT 'TODO';

-- Add FK constraint for Task.userId → User.id
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Task_userId_fkey'
    ) THEN
        ALTER TABLE "Task"
            ADD CONSTRAINT "Task_userId_fkey"
            FOREIGN KEY ("userId") REFERENCES "User"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;

-- 3. Auto-update updatedAt on WorkLog
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_worklog_updated_at ON "WorkLog";
CREATE TRIGGER set_worklog_updated_at
    BEFORE UPDATE ON "WorkLog"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS set_task_updated_at ON "Task";
CREATE TRIGGER set_task_updated_at
    BEFORE UPDATE ON "Task"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
