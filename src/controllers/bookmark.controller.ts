import { Request, Response } from 'express';
import { bookmarkService } from '../services/bookmark.service';
import { IUser } from '../models/user.model';


export const toggleBookmark = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { postId } = req.params;

        const result = await bookmarkService.toggleBookmark(userId as string, postId as string);
        res.json({ success: true, data: result });
    } catch (error: any) {
        if (error.message === 'Post not found') {
            return res.status(404).json({ success: false, error: { message: 'Post not found' } });
        }
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getBookmarks = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { cursor, limit } = req.query;

        const data = await bookmarkService.getBookmarks(
            userId as string,
            cursor as string,
            limit ? parseInt(limit as string) : 10
        );
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};
