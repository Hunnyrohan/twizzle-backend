import { Request, Response, NextFunction } from 'express';
import { exploreService } from '../services/explore.service';
import { successResponse, errorResponse } from '../utils/response';

export const getTrending = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let trends = await exploreService.getTrendingHashtags();

        // Auto-initialize hashtags if empty (one-time logic)
        if (trends.length === 0) {
            await exploreService.initializeHashtags();
            trends = await exploreService.getTrendingHashtags();
        }

        return successResponse(res, trends);
    } catch (error) {
        next(error);
    }
};

export const getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore - req.user populated by optionalAuth middleware
        const currentUserId = req.user?._id?.toString();
        const suggestions = await exploreService.getSuggestedCreators(currentUserId);
        return successResponse(res, suggestions);
    } catch (error) {
        next(error);
    }
};

export const getHotPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const currentUserId = req.user?._id?.toString();
        const posts = await exploreService.getHotPosts(currentUserId);
        return successResponse(res, posts);
    } catch (error) {
        next(error);
    }
};
