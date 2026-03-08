import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    text?: string;
    attachments?: string[];
    type: 'text' | 'call' | 'image';
    status: 'sent' | 'seen';
    callData?: {
        type: 'audio' | 'video';
        status: 'missed' | 'ended' | 'started';
        duration?: number;
    };
    deletedFor: Types.ObjectId[];
    isDeletedEveryone: boolean;
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String },
        attachments: [{ type: String }],
        type: { type: String, enum: ['text', 'call', 'image'], default: 'text' },
        status: { type: String, enum: ['sent', 'seen'], default: 'sent' },
        callData: {
            type: { type: String, enum: ['audio', 'video'] },
            status: { type: String, enum: ['missed', 'ended', 'started'] },
            duration: { type: Number }
        },
        deletedFor: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        isDeletedEveryone: { type: Boolean, default: false }
    },
    { timestamps: true }
);

// Index for fast message retrieval in a conversation
messageSchema.index({ conversationId: 1, createdAt: -1 });

export default model<IMessage>('Message', messageSchema);
