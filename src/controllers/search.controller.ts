import { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service';
import { successResponse } from '../utils/response';
import { searchSchema } from '../validators/search.validator';

export const search = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const uniqueQuery = Object.keys(req.query).length > 0 ? req.query : { q: '' }; // Handle empty query case if needed

        // Zod validation
        const validation = searchSchema.safeParse(req.query);

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid query parameters', details: validation.error.format() }
            });
        }

        const { q, filter, cursor, limit } = validation.data;
        const currentUserId = (req as any).user?._id;

        const result = await searchService.search({
            query: q || '',
            filter: filter as any,
            cursor,
            limit,
            currentUserId
        });

        return successResponse(res, result);
    } catch (error) {
        next(error);
    }
};
