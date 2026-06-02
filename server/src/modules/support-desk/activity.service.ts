import { prisma, Prisma } from '../../db';

type Client = typeof prisma | Prisma.TransactionClient;

/**
 * Appends to the unified ticket activity timeline / audit (TicketActivity).
 * Accepts a transaction client so the activity write joins the same atomic unit
 * as the mutation that produced it. `data` is type-specific JSON.
 */
export class TicketActivityService {
    static async record(
        client: Client,
        params: { ticketId: string; type: any; actorId?: string | null; data?: any },
    ): Promise<void> {
        await client.ticketActivity.create({
            data: {
                ticketId: params.ticketId,
                type: params.type,
                actorId: params.actorId ?? null,
                data: params.data !== undefined ? JSON.stringify(params.data) : null,
            },
        });
    }
}
