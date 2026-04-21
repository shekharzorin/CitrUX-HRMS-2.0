import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Error] ${req.method} ${req.path}`, err);

    let statusCode = err.status || 500;
    let message = err.message || 'An unexpected error occurred. Please try again later.';
    let code = 'INTERNAL_SERVER_ERROR';

    // Handle Prisma Specific Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            statusCode = 409;
            message = 'A record with this value already exists (Unique constraint violation).';
            code = 'CONFLICT';
        } else if (err.code === 'P2025') {
            statusCode = 404;
            message = 'Record not found.';
            code = 'NOT_FOUND';
        } else {
            statusCode = 400;
            message = 'Database operation failed due to invalid data format.';
            code = 'DB_REQUEST_ERROR';
        }
    } else if (err instanceof Prisma.PrismaClientValidationError) {
        statusCode = 400;
        message = 'Validation failed for the requested database action.';
        code = 'VALIDATION_ERROR';
    } 
    // Handle JWT Errors
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid or malformed authentication token.';
        code = 'UNAUTHORIZED';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Authentication session has expired. Please log in again.';
        code = 'UNAUTHORIZED';
    }

    res.status(statusCode).json({
        error: true,
        message,
        code,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
