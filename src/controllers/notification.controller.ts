// backend/src/controllers/notification.controller.ts
import { Request, Response } from 'express';
import Notification, { NotificationType } from '../models/notification.model';
import Tweet from '../models/tweet.model';

export const getNotifications = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;
        const { type = 'all', cursor, limit = '10' } = req.query;
        const limitNum = parseInt(limit as string);

        // Build query
        let query: any = {
            recipientId: userId,
            type: { $ne: NotificationType.MESSAGE }
        };

        // Filter by type
        if (type !== 'all') {
            const typeMap: Record<string, NotificationType> = {
                likes: NotificationType.LIKE,
                follows: NotificationType.FOLLOW,
                mentions: NotificationType.MENTION,
                comments: NotificationType.COMMENT,
                bookmarks: NotificationType.BOOKMARK,
            };
            if (typeMap[type as string]) {
                query.type = typeMap[type as string];
            }
        }

        // Cursor pagination
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor as string) };
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum + 1)
            .populate('actorId', 'name username image')
            .populate({
                path: 'postId',
                select: 'content media',
            })
            .lean();

        // Check if there are more items
        const hasMore = notifications.length > limitNum;
        const items = hasMore ? notifications.slice(0, limitNum) : notifications;

        // Get next cursor
        const nextCursor = hasMore && items.length > 0
            ? items[items.length - 1].createdAt.toISOString()
            : null;

        // Transform notifications to include actor and post preview
        const transformedItems = items.map((notif: any) => {
            const actor = notif.actorId && typeof notif.actorId === 'object' ? {
                _id: notif.actorId._id,
                name: notif.actorId.name || 'User',
                username: notif.actorId.username || 'user',
                image: notif.actorId.image,
            } : {
                _id: notif.actorId?.toString() || 'unknown',
                name: 'Unknown User',
                username: 'unknown',
                image: null
            };

            const postPreview = notif.postId && typeof notif.postId === 'object' ? {
                _id: notif.postId._id,
                content: notif.postId.content || '',
                image: notif.postId.media?.[0],
            } : null;

            return {
                _id: notif._id,
                type: notif.type,
                isRead: notif.isRead,
                createdAt: notif.createdAt,
                actor,
                postPreview,
                commentText: notif.commentText,
            };
        });

        return res.status(200).json({
            success: true,
            data: {
                items: transformedItems,
                nextCursor,
            },
        });
    } catch (error) {
        console.error('Get notifications error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to fetch notifications',
                code: 'FETCH_ERROR',
            },
        });
    }
};

export const getUnreadCount = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;

        const count = await Notification.countDocuments({
            recipientId: userId,
            isRead: false,
            type: { $ne: NotificationType.MESSAGE }
        });

        return res.status(200).json({
            success: true,
            data: { count },
        });
    } catch (error) {
        console.error('Get unread count error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to get unread count',
                code: 'COUNT_ERROR',
            },
        });
    }
};

export const markAllAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;

        await Notification.updateMany(
            { recipientId: userId, isRead: false },
            { $set: { isRead: true } }
        );

        return res.status(200).json({
            success: true,
            data: { message: 'All notifications marked as read' },
        });
    } catch (error) {
        console.error('Mark all as read error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to mark notifications as read',
                code: 'UPDATE_ERROR',
            },
        });
    }
};

export const markAsRead = async (req: Request, res: Response) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const notification = await Notification.findOne({
            _id: id,
            recipientId: userId,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: {
                    message: 'Notification not found',
                    code: 'NOT_FOUND',
                },
            });
        }

        notification.isRead = true;
        await notification.save();

        return res.status(200).json({
            success: true,
            data: { message: 'Notification marked as read' },
        });
    } catch (error) {
        console.error('Mark as read error:', error);
        return res.status(500).json({
            success: false,
            error: {
                message: 'Failed to mark notification as read',
                code: 'UPDATE_ERROR',
            },
        });
    }
};
