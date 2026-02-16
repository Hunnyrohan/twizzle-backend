import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { successResponse, errorResponse } from '../utils/response';

export const toggleFollow = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params as { userId: string };
        // @ts-ignore
        const followerId = (req.user as any)._id || (req.user as any).id;

        if (!followerId) {
            return errorResponse(res, 'Unauthorized', 401);
        }

        if (followerId === userId) {
            return errorResponse(res, 'Cannot follow yourself', 400);
        }

        const targetUser = await userService.findById(userId);
        if (!targetUser) {
            return errorResponse(res, 'User not found', 404);
        }

        const result = await userService.toggleFollow(followerId, userId);

        return successResponse(res, {
            followed: result.isFollowing,
            message: result.isFollowing ? 'Followed successfully' : 'Unfollowed successfully'
        });

    } catch (error) {
        next(error);
    }
};

export const getUserByUsername = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = req.params.username as string;
        // @ts-ignore
        const currentUserId = (req.user?.id || req.user?._id) as string | undefined;
        const user = await userService.findByUsername(username, currentUserId);

        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        return successResponse(res, user);
    } catch (error) {
        next(error);
    }
};

export const uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const userId = (req.user as any)._id || (req.user as any).id;
        const file = req.file;

        if (!userId) {
            return errorResponse(res, 'Unauthorized', 401);
        }

        if (!file) {
            return errorResponse(res, 'No file uploaded', 400);
        }

        // Generate URL (in production this would be Cloudinary/S3)
        // For local, we serve from /uploads
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

        const updatedUser = await userService.updateAvatar(userId, imageUrl);

        return successResponse(res, updatedUser);
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const userId = (req.user as any)._id || (req.user as any).id;
        const { name, bio, location, website } = req.body;

        if (!userId) {
            return errorResponse(res, 'Unauthorized', 401);
        }

        const updatedUser = await userService.updateUser(userId, {
            name,
            bio,
            location,
            website
        });

        return successResponse(res, updatedUser);
    } catch (error) {
        next(error);
    }
};

export const uploadCover = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // @ts-ignore
        const userId = (req.user as any)._id || (req.user as any).id;
        const file = req.file;

        if (!userId) {
            return errorResponse(res, 'Unauthorized', 401);
        }

        if (!file) {
            return errorResponse(res, 'No file uploaded', 400);
        }

        // Generate URL (in production this would be Cloudinary/S3)
        // For local, we serve from /uploads
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

        const updatedUser = await userService.updateCoverImage(userId, imageUrl);

        return successResponse(res, updatedUser);
    } catch (error) {
        next(error);
    }
};

export const getFollowers = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = req.params.username as string;
        const user = await userService.findByUsername(username);
        if (!user) return errorResponse(res, 'User not found', 404);

        const followers = await userService.getFollowers(user.id as string);
        return successResponse(res, followers);
    } catch (error) {
        next(error);
    }
};

export const getFollowing = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const username = req.params.username as string;
        const user = await userService.findByUsername(username);
        if (!user) return errorResponse(res, 'User not found', 404);

        const following = await userService.getFollowing(user.id as string);
        return successResponse(res, following);
    } catch (error) {
        next(error);
    }
};
