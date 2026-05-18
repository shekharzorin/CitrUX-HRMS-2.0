import { Request, Response, NextFunction } from 'express';
import { sendError } from '../utils/response.util';

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
    let error = { ...err };
    error.message = err.message;
    
    // Log error to console or logger
    console.error(`[Error] ${req.method} ${req.url} >>`, err);

    // Mongoose/Prisma duplicate key or validation error mappings can go here
    if (err.code === 'P2002') {
        error = new AppError('Duplicate field value entered', 400);
    }
    
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map((val: any) => val.message).join(', ');
        error = new AppError(`Invalid input data. ${message}`, 400);
    }

    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token. Please log in again!', 401);
    }

    if (err.name === 'TokenExpiredError') {
        error = new AppError('Your token has expired! Please log in again.', 401);
    }

    const statusCode = error.statusCode || 500;
    const message = error.message || 'Something went wrong on the server';

    sendError(res, statusCode, message, process.env.NODE_ENV === 'development' ? err : undefined);
};
