import { PrismaClient, Prisma } from '../generated/prisma';
export { Prisma };

const isDev = process.env.NODE_ENV !== 'production';

const getDbUrl = (): string | undefined => {
    const dbUrl = process.env.DATABASE_URL;
    const directUrl = process.env.DIRECT_URL;
    
    // If DATABASE_URL is pointing to db.prisma.io (which is currently unreachable),
    // and DIRECT_URL is provided (pointing to a different provider like Supabase), prioritize DIRECT_URL.
    if (dbUrl?.includes('db.prisma.io') && directUrl && !directUrl.includes('db.prisma.io')) {
        console.log('[DB] DATABASE_URL points to db.prisma.io which is unreachable. Falling back to DIRECT_URL.');
        return directUrl;
    }
    
    return dbUrl;
};

export const prisma = new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error'],
    datasources: {
        db: {
            url: getDbUrl()
        }
    }
});

/**
 * Attempt a DB connection at startup.
 * Logs success/failure without crashing — server stays up for debugging.
 */
export const connectDB = async (): Promise<void> => {
    try {
        await prisma.$connect();
        console.log('✅  Database connected');
    } catch (err: any) {
        console.error(`❌  Database connection failed: ${err.message}`);
        console.error('    → Check your DATABASE_URL in .env');
        console.error('    → If using Supabase, ensure your project is not paused');
    }
};

// Prisma error codes that indicate a transient connection problem (safe to retry)
const RETRIABLE_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);

function isTransientError(err: any): boolean {
    if (RETRIABLE_CODES.has(err?.code)) return true;
    const msg: string = err?.message ?? '';
    return (
        msg.includes("Can't reach database") ||
        msg.includes('Connection refused') ||
        msg.includes('connection timeout') ||
        msg.includes('ECONNRESET') ||
        msg.includes('ETIMEDOUT')
    );
}

/**
 * withRetry — wraps a Prisma operation with automatic retry logic for
 * transient connection failures (e.g. Supabase free-tier cold start).
 *
 * Attempts up to `retries` times with exponential back-off before re-throwing.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    retries = 3,
    baseDelayMs = 800
): Promise<T> {
    let lastErr: any;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            lastErr = err;

            if (isTransientError(err) && attempt < retries) {
                const delay = baseDelayMs * attempt;
                console.warn(`[DB] Transient error (attempt ${attempt}/${retries}), retrying in ${delay}ms…`);
                await new Promise(r => setTimeout(r, delay));
                // Re-establish the connection before retrying
                try { await prisma.$connect(); } catch { /* ignore */ }
                continue;
            }

            break;
        }
    }

    throw lastErr;
}
