import { prisma } from '../../db';
import { AiEngine } from '../ai-engine';
import { featureFlags } from '../../shared/feature-flags';
import { TicketActivityService } from './activity.service';
import { SupportDepartmentService } from './support-department.service';
import logger from '../../utils/logger';

const THRESHOLD = Number(process.env.AI_CONFIDENCE_THRESHOLD || '0.6');

interface ClassifyInput {
    subject: string;
    description: string;
    queues: { id: string; name: string; description: string | null }[];
    categories: { id: string; name: string; supportDepartmentId: string }[];
}
interface ClassifyResult {
    supportDepartmentId?: string;
    categoryId?: string | null;
    priority?: string;
    confidence?: number;
}

/** Ask the LLM to route a ticket. Returns parsed JSON; throws on no-JSON/timeout. */
export async function classifyTicket(input: ClassifyInput): Promise<ClassifyResult> {
    const system =
        'You are a support-desk ticket router. Pick the best queue, an optional category '
        + '(only one that belongs to the chosen queue), and a priority. Respond with ONLY a '
        + 'JSON object: {"supportDepartmentId":string,"categoryId":string|null,'
        + '"priority":"LOW"|"MEDIUM"|"HIGH"|"URGENT","confidence":number-from-0-to-1}.';
    const user = [
        `Subject: ${input.subject}`,
        `Description: ${input.description}`,
        'Queues:',
        ...input.queues.map((q) => `- ${q.id}: ${q.name}${q.description ? ` (${q.description})` : ''}`),
        'Categories:',
        ...input.categories.map((c) => `- ${c.id}: ${c.name} [queue ${c.supportDepartmentId}]`),
    ].join('\n');

    const raw = await AiEngine.complete(system, user);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('AI response contained no JSON');
    return JSON.parse(match[0]);
}

/**
 * Worker entry: classify a ticket and apply results, respecting human choices.
 * Idempotent (skips already COMPLETED/SKIPPED). Throws on classify failure so
 * BullMQ can retry (status left FAILED meanwhile). Exported for unit testing.
 */
export async function runAiRoute(
    ticketId: string,
    opts: { trigger?: 'AUTO' | 'MANUAL'; actorId?: string | null } = {},
): Promise<void> {
    const triggerType: 'AUTO' | 'MANUAL' = opts.trigger === 'MANUAL' ? 'MANUAL' : 'AUTO';
    const actorId = triggerType === 'MANUAL' ? (opts.actorId ?? null) : null;

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.deletedAt) return;
    if (ticket.aiStatus === 'COMPLETED' || ticket.aiStatus === 'SKIPPED') return; // idempotent

    const skip = async () => {
        await prisma.ticket.update({ where: { id: ticketId }, data: { aiStatus: 'SKIPPED' } });
        await prisma.aiJob.create({ data: { ticketId, type: 'CATEGORIZATION', status: 'SKIPPED', triggerType } });
    };

    if (!(await featureFlags.isEnabled('SUPPORT_AI_CATEGORIZATION', ticket.companyId))) return skip();

    const queues = await prisma.supportDepartment.findMany({
        where: { companyId: ticket.companyId, isActive: true, deletedAt: null },
        select: { id: true, name: true, description: true },
    });
    if (queues.length === 0) return skip();
    const categories = await prisma.ticketCategory.findMany({
        where: { companyId: ticket.companyId, isActive: true, deletedAt: null },
        select: { id: true, name: true, supportDepartmentId: true },
    });

    const previousCategory = ticket.categoryId ?? null;
    const previousPriority = ticket.priority;

    await prisma.ticket.update({ where: { id: ticketId }, data: { aiStatus: 'PROCESSING' } });
    const job = await prisma.aiJob.create({ data: { ticketId, type: 'CATEGORIZATION', triggerType, provider: AiEngine.provider(), status: 'PROCESSING' } });

    let result: ClassifyResult;
    try {
        result = await classifyTicket({ subject: ticket.subject, description: ticket.description, queues, categories });
    } catch (err: any) {
        await prisma.aiJob.update({ where: { id: job.id }, data: { status: 'FAILED', error: String(err?.message || err).slice(0, 500), completedAt: new Date() } });
        const data: any = { aiStatus: 'FAILED' };
        if (!ticket.supportDepartmentId) {
            const def = await SupportDepartmentService.ensureDefault(ticket.companyId);
            if (def) data.supportDepartmentId = def.id;
        }
        await prisma.ticket.update({ where: { id: ticketId }, data });
        throw err; // let BullMQ retry
    }

    const data: any = { aiConfidence: result.confidence ?? null };
    let applied = false;
    if ((result.confidence ?? 0) >= THRESHOLD) {
        // Human-selected queue always wins; AI only fills a missing queue (validated).
        if (!ticket.supportDepartmentId && result.supportDepartmentId && queues.some((q) => q.id === result.supportDepartmentId)) {
            data.supportDepartmentId = result.supportDepartmentId;
            applied = true;
        }
        const chosenQueue = ticket.supportDepartmentId ?? data.supportDepartmentId;
        if (!ticket.categoryId && result.categoryId
            && categories.some((c) => c.id === result.categoryId && c.supportDepartmentId === chosenQueue)) {
            data.categoryId = result.categoryId;
            applied = true;
        }
        // Treat MEDIUM (the default) as "unset" so AI can refine priority.
        if (ticket.priority === 'MEDIUM' && result.priority && result.priority !== 'MEDIUM'
            && ['LOW', 'HIGH', 'URGENT'].includes(result.priority)) {
            data.priority = result.priority;
            applied = true;
        }
        data.aiCategorized = applied;
    }
    // Low-confidence / nothing applied: ensure the ticket still has a queue.
    if (!ticket.supportDepartmentId && !data.supportDepartmentId) {
        const def = await SupportDepartmentService.ensureDefault(ticket.companyId);
        if (def) data.supportDepartmentId = def.id;
    }
    data.aiStatus = 'COMPLETED';

    await prisma.ticket.update({ where: { id: ticketId }, data });
    await prisma.aiJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', confidence: result.confidence ?? null, output: JSON.stringify(result).slice(0, 2000), completedAt: new Date() } });

    // One AI_CATEGORIZED activity, only when something was actually applied.
    if (applied) {
        await TicketActivityService.record(prisma, {
            ticketId,
            type: 'AI_CATEGORIZED',
            actorId,
            data: {
                provider: AiEngine.provider(),
                confidence: result.confidence,
                triggerType,
                actorId,
                previousCategory,
                newCategory: data.categoryId ?? previousCategory,
                previousPriority,
                newPriority: data.priority ?? previousPriority,
                applied: { supportDepartmentId: data.supportDepartmentId, categoryId: data.categoryId, priority: data.priority },
            },
        });
    }
    logger.info(`[AiRoute] ticket ${ticketId} aiStatus=COMPLETED trigger=${triggerType} applied=${applied} confidence=${result.confidence}`);
}
