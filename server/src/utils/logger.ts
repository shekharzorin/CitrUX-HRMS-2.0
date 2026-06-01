import winston from 'winston';
import 'winston-daily-rotate-file';
import { getTraceId, getTraceCompanyId } from '../middlewares/tracing.middleware';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Format that injects cls-hooked trace context
const traceFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const traceId = getTraceId();
    const companyId = getTraceCompanyId();
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} [${companyId}] [${traceId}] ${level}: ${stack || message} ${metaStr}`;
});

// File transports write to local disk, which is EPHEMERAL on platforms like
// Render (wiped on every deploy/restart) and not shared across instances.
// Render/most PaaS capture stdout, so Console is the source of truth there.
// Enable rotating files only when LOG_TO_FILE=true (e.g. a VM with a volume).
const transports: winston.transport[] = [
    new winston.transports.Console({
        format: combine(
            colorize(),
            traceFormat
        )
    })
];

if (process.env.LOG_TO_FILE === 'true') {
    transports.push(
        new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        }),
        new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    );
}

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        traceFormat
    ),
    transports
});

export default logger;
