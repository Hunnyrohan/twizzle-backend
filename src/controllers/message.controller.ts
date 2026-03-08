import { Request, Response } from 'express';
import { messageService } from '../services/message.service';
import { IUser } from '../models/user.model';

export const getConversations = async (req: Request, res: Response) => {
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

export const getConversationById = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const id = req.params.id as string;

        const data = await messageService.getConversationById(id, userId);
        if (!data) return res.status(404).json({ success: false, error: { message: 'Conversation not found' } });

        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getMessages = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const id = req.params.id as string;
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

export const sendMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const id = req.params.id as string;
        const { text, type, callData } = req.body;

        // Handle attachments if any
        let attachments: string[] = [];
        if (req.files && Array.isArray(req.files)) {
            attachments = (req.files as any[]).map(file => file.filename);
        }

        const data = await messageService.sendMessage(id, userId, text, attachments, type, callData);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const id = req.params.id as string;

        await messageService.markRead(id, userId);
        res.json({ success: true, data: { unreadCount: 0 } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();

        const count = await messageService.getUnreadCount(userId);
        res.json({ success: true, data: { unreadCount: count } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};

export const startConversation = async (req: Request, res: Response) => {
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

export const deleteMessage = async (req: Request, res: Response) => {
    try {
        if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
        const userId = (req.user as any).id || (req.user as any)._id?.toString();
        const { messageId } = req.params;
        const { type } = req.body; // 'me' or 'everyone'

        if (!['me', 'everyone'].includes(type)) {
            return res.status(400).json({ success: false, error: { message: 'Invalid deletion type' } });
        }

        const data = await messageService.deleteMessage(messageId as string, userId, type);
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: { message: error.message } });
    }
};
