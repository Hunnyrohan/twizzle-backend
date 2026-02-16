import { Request, Response } from 'express';
import { messageService } from '../services/message.service';
import { IUser } from '../models/user.model';

// Helper for type safety
interface AuthRequest extends Request {
    user?: IUser;
}

export const getConversations = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });

        // Check if user has an ID (if it's a mock user or real user)
        const userId = (req.user as any).id || (req.user as any)._id?.toString();

        const data = await messageService.getConversations(userId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getConversationById = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { id } = req.params;

        const data = await messageService.getConversationById(id, userId);
        if (!data) return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });

        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { id } = req.params;
        const { cursor, limit } = req.query;

        const data = await messageService.getMessages(
            id,
            userId,
            cursor as string,
            limit ? parseInt(limit as string) : 20
        );
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { id } = req.params;
        const { text } = req.body;

        const data = await messageService.sendMessage(id, userId, text);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const markAsRead = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { id } = req.params;

        await messageService.markRead(id, userId);
        res.json({ success: true, data: { unreadCount: 0 } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();

        const count = await messageService.getUnreadCount(userId);
        res.json({ success: true, data: { unreadCount: count } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const startConversation = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { userId: targetUserId } = req.body;

        if (!targetUserId) return res.status(400).json({ success: false, error: { message: 'Target userId required' } });

        const data = await messageService.startConversation(userId, targetUserId);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};
