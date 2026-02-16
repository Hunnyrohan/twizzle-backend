// backend/src/models/notification.model.ts
import { Schema, model, Document } from 'mongoose';

export enum NotificationType {
    LIKE = 'like',
    FOLLOW = 'follow',
    MENTION = 'mention',
    COMMENT = 'comment',
    REPOST = 'repost',
    MESSAGE = 'message',
    BOOKMARK = 'bookmark',
}

export interface INotification extends Document {
    recipientId: Schema.Types.ObjectId;
    actorId: Schema.Types.ObjectId;
    type: NotificationType;
    postId?: Schema.Types.ObjectId;
    commentText?: string;
    isRead: boolean;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        recipientId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        actorId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(NotificationType),
            required: true,
        },
        postId: {
            type: Schema.Types.ObjectId,
            ref: 'Tweet',
        },
        commentText: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient cursor pagination
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, type: 1, createdAt: -1 });

export default model<INotification>('Notification', notificationSchema);
