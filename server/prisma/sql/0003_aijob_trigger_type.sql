-- AlterTable: distinguish initial auto-routing (AUTO) from manual agent reprocess (MANUAL).
-- Additive, non-breaking: existing rows default to AUTO. The reprocess cooldown keys off
-- MANUAL rows only, so prior auto-routing jobs never start the cooldown timer.
ALTER TABLE "AiJob" ADD COLUMN     "triggerType" TEXT NOT NULL DEFAULT 'AUTO';
