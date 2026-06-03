import { Queue } from 'bullmq';
import { connection } from './index';

// Async work for the Support Desk (Phase 1: AI routing/categorization).
export const supportQueue = new Queue('supportQueue', { connection });

export type AiRouteTrigger = 'AUTO' | 'MANUAL';

/**
 * Enqueue AI routing for a ticket. Idempotent per ticket (jobId dedupes
 * re-enqueues), bounded retries with backoff. Fire-and-forget from the caller —
 * must never block ticket creation.
 *
 * `trigger` distinguishes the initial auto-routing (AUTO) from a manual agent
 * reprocess (MANUAL); it travels in the job payload so the worker can persist it
 * and the reprocess cooldown can key off MANUAL runs only. `actorId` is the user
 * who triggered a manual reprocess (null for AUTO).
 */
export function enqueueAiRoute(
    ticketId: string,
    opts: { force?: boolean; trigger?: AiRouteTrigger; actorId?: string | null } = {},
) {
    const trigger: AiRouteTrigger = opts.trigger === 'MANUAL' ? 'MANUAL' : 'AUTO';
    return supportQueue.add(
        'ai-route',
        { ticketId, trigger, actorId: opts.actorId ?? null },
        {
            // Auto-categorize on create dedupes by jobId; manual reprocess forces a
            // fresh run (auto id) so a retained failed/old job can't block it.
            ...(opts.force ? {} : { jobId: `ai-route-${ticketId}` }), // BullMQ forbids ':' in custom ids
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: 50,
        },
    );
}
