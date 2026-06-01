import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Dedicated connection for BullMQ. It issues long-lived blocking commands
// (BRPOPLPUSH etc.), so it must not be shared with request-path consumers,
// and requires maxRetriesPerRequest: null per BullMQ's requirements.
export const connection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
});

connection.on('error', (err) => {
    console.error('[Redis:bullmq] connection error:', err);
});

// Separate connection for the request path (cache + rate limiter) so BullMQ's
// blocking commands can never stall a cache lookup or a rate-limit check.
// enableOfflineQueue stays on (default) so commands issued before the initial
// connection completes — e.g. rate-limit-redis loading its Lua script at
// startup — are queued rather than throwing "Stream isn't writeable".
export const cacheConnection = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
});

cacheConnection.on('error', (err) => {
    console.error('[Redis:cache] connection error:', err);
});
