import { Request, Response, NextFunction } from 'express';
import { exploreService } from '../services/explore.service';
import { successResponse, errorResponse } from '../utils/response';

export const getTrending = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const trends = await exploreService.getTrendingHashtags();
        return successResponse(res, trends);
    } catch (error) {
        next(error);
    }
};

export const getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore - Assuming req.user is populated by auth middleware
        const currentUserId = req.user?.id;
        const suggestions = await exploreService.getSuggestedCreators(currentUserId);
        return successResponse(res, suggestions);
    } catch (error) {
        next(error);
    }
};

export const getHotPosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const posts = await exploreService.getHotPosts();
        return successResponse(res, posts);
    } catch (error) {
        next(error);
    }
};
