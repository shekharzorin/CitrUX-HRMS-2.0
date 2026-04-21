import { PrismaClient } from '@prisma/client';

const isDev = process.env.NODE_ENV !== 'production';

export const prisma = new PrismaClient({
    log: isDev ? ['warn', 'error'] : ['error'],  // Removed noisy 'query'/'info' logs
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
