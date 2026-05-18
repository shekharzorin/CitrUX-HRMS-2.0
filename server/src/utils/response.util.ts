import { Request, Response, NextFunction } from 'express';

// Standardized Response Format
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: any;
    meta?: any;
}

export const sendSuccess = (res: Response, message: string, data: any = {}, meta?: any) => {
    const response: ApiResponse = {
        success: true,
        message,
        data,
        meta
    };
    return res.status(200).json(response);
};

export const sendCreated = (res: Response, message: string, data: any = {}) => {
    return res.status(201).json({
        success: true,
        message,
        data
    });
};

export const sendError = (res: Response, statusCode: number, message: string, errorDetails?: any) => {
    const response: ApiResponse = {
        success: false,
        message,
        error: errorDetails
    };
    // Don't leak stack traces in production
    if (process.env.NODE_ENV === 'production' && response.error?.stack) {
        delete response.error.stack;
    }
    return res.status(statusCode).json(response);
};
