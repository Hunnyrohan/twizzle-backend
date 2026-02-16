import { Response } from 'express';

export const successResponse = (res: Response, data: any, message = 'Success', code = 200) => {
    return res.status(code).json({
        success: true,
        message,
        data,
    });
};

export const errorResponse = (res: Response, message: string, code = 500, errorCode?: string) => {
    return res.status(code).json({
        success: false,
        error: {
            message,
            code: errorCode || 'INTERNAL_SERVER_ERROR',
        },
    });
};
