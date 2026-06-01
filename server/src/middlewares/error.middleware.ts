import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';
import logger from '../utils/logger';

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Map known error types to a clean AppError without spreading `err`
    // (spreading drops the Error prototype, stack, and non-enumerable props).
    let error: AppError;

    if (err instanceof AppError) {
        error = err;
    } else if (err.code === 'P2002') {
        // Prisma unique constraint violation
        error = new AppError('Duplicate field value entered', 400);
    } else if (err.code === 'P2025') {
        // Prisma record not found
        error = new AppError('Requested record not found', 404);
    } else if (err.name === 'ValidationError') {
        const message = Object.values(err.errors || {}).map((val: any) => val.message).join(', ');
        error = new AppError(`Invalid input data. ${message}`, 400);
    } else if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token. Please log in again!', 401);
    } else if (err.name === 'TokenExpiredError') {
        error = new AppError('Your token has expired! Please log in again.', 401);
    } else {
        error = new AppError(err.message || 'Something went wrong on the server', err.statusCode || 500);
    }

    // Log through Winston (trace-aware) instead of console.error.
    // 5xx are real failures; 4xx are client errors logged at warn level.
    const logLine = `[Error] ${req.method} ${req.url.split('?')[0]} >> ${err.message}`;
    if (error.statusCode >= 500) {
        logger.error(logLine, { stack: err.stack });
    } else {
        logger.warn(logLine);
    }

    sendError(res, error.statusCode, error.message, process.env.NODE_ENV === 'development' ? err : undefined);
};
