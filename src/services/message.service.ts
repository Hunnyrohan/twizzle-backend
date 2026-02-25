import Conversation from '../models/conversation.model';
import Message from '../models/message.model';
import User from '../models/user.model';
import Follow from '../models/follow.model';
import Notification, { NotificationType } from '../models/notification.model';
import { Types } from 'mongoose';

export class MessageService {

    // Get all conversations for a user
    async getConversations(userId: string) {
        const conversations = await Conversation.find({
            participantIds: new Types.ObjectId(userId)
        })
            .sort({ updatedAt: -1 })
            .populate({
                path: 'participantIds',
                select: 'name username image isVerified'
            })
            .populate({
                path: 'lastMessageId'
            });

        const enriched = conversations.map(conv => {
            const otherUser = conv.participantIds.find(p => p._id.toString() !== userId);

            return {
                id: conv._id,
                otherUser: otherUser || { id: 'unknown', name: 'Unknown User', username: 'unknown' },
                lastMessage: conv.lastMessageId,
                unreadCount: conv.unreadCounts.get(userId) || 0,
                updatedAt: conv.updatedAt
            };
        });

        return enriched;
    }

    async getConversationById(conversationId: string, userId: string) {
        const conv = await Conversation.findById(conversationId)
            .populate({
                path: 'participantIds',
                select: 'name username image isVerified'
            });

        if (!conv) return null;
        if (!conv.participantIds.some(p => p._id.toString() === userId)) throw new Error('Forbidden');

        return {
            ...conv.toObject(),
            id: conv._id,
            participants: conv.participantIds
        };
    }

    // Get messages with cursor pagination
    async getMessages(conversationId: string, userId: string, cursor?: string, limit: number = 20) {
        const conv = await Conversation.findById(conversationId);
        if (!conv) throw new Error('Conversation not found');
        if (!conv.participantIds.includes(new Types.ObjectId(userId))) throw new Error('Forbidden');

        const query: any = { conversationId: new Types.ObjectId(conversationId) };
        if (cursor) {
            query._id = { $lt: new Types.ObjectId(cursor) };
        }

        const messages = await Message.find(query)
            .sort({ _id: -1 })
            .limit(limit + 1);

        const hasNextPage = messages.length > limit;
        const items = hasNextPage ? messages.slice(0, limit) : messages;
        const nextCursor = hasNextPage ? items[items.length - 1]._id : null;

        return {
            items, // [Newest, ..., Oldest]
            nextCursor
        };
    }

    async sendMessage(conversationId: string, senderId: string, text?: string, attachments?: string[], type: 'text' | 'call' = 'text', callData?: any) {
        const conv = await Conversation.findById(conversationId);
        if (!conv) throw new Error('Conversation not found');
        if (!conv.participantIds.includes(new Types.ObjectId(senderId))) throw new Error('Forbidden');

        const newMessage = await Message.create({
            conversationId: new Types.ObjectId(conversationId),
            senderId: new Types.ObjectId(senderId),
            text,
            attachments,
            type,
            callData,
            status: 'sent'
        });

        // Update conversation
        conv.lastMessageId = newMessage._id;
        conv.updatedAt = new Date();

        // Increment unread for others
        conv.participantIds.forEach(async (pid) => {
            const pidStr = pid.toString();
            if (pidStr !== senderId) {
                const currentCount = conv.unreadCounts.get(pidStr) || 0;
                conv.unreadCounts.set(pidStr, currentCount + 1);

                // Create message notification
                await Notification.create({
                    recipientId: pid,
                    actorId: new Types.ObjectId(senderId),
                    type: NotificationType.MESSAGE,
                    commentText: text ? text.substring(0, 100) : 'Sent an image'
                });
            }
        });

        await conv.save();

        return newMessage;
    }

    async markRead(conversationId: string, userId: string) {
        const conv = await Conversation.findById(conversationId);
        if (!conv) throw new Error('Conversation not found');

        if (conv.participantIds.some(p => p.toString() === userId)) {
            conv.unreadCounts.set(userId, 0);
            await conv.save();

            // Also could update status of messages to 'seen' where sender != userId
            await Message.updateMany(
                { conversationId: new Types.ObjectId(conversationId), senderId: { $ne: new Types.ObjectId(userId) }, status: 'sent' },
                { $set: { status: 'seen' } }
            );
        }
        return true;
    }

    async startConversation(userId: string, targetUserId: string) {
        // Restriction: Only allow chatting if they follow each other (mutual follow) or some criteria
        // Allow self-messaging
        if (userId !== targetUserId) {
            const followCheck = await Follow.findOne({
                follower: new Types.ObjectId(targetUserId),
                following: new Types.ObjectId(userId)
            });

            if (!followCheck) {
                throw new Error('You can only message users who follow you');
            }
        }

        // Check existing
        const participants = userId === targetUserId
            ? [new Types.ObjectId(userId)]
            : [new Types.ObjectId(userId), new Types.ObjectId(targetUserId)];

        let conv = await Conversation.findOne({
            participantIds: { $all: participants, $size: participants.length }
        });

        if (conv) return { ...conv.toObject(), id: conv._id };

        // Create new
        const newConv = await Conversation.create({
            participantIds: participants,
            unreadCounts: new Map()
        });

        return { ...newConv.toObject(), id: newConv._id };
    }

    async getUnreadCount(userId: string) {
        const conversations = await Conversation.find({
            participantIds: new Types.ObjectId(userId)
        });

        const totalUnread = conversations.reduce((acc, conv) => {
            return acc + (conv.unreadCounts.get(userId) || 0);
        }, 0);

        return totalUnread;
    }
}

export const messageService = new MessageService();
