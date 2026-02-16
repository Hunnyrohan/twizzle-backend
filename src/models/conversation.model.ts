import { Schema, model, Document, Types } from 'mongoose';

export interface IConversation extends Document {
    participantIds: Types.ObjectId[];
    lastMessageId?: Types.ObjectId;
    updatedAt: Date;
    unreadCounts: Map<string, number>; // userId string -> count
}

const conversationSchema = new Schema<IConversation>(
    {
        participantIds: [{ type: Schema.Types.ObjectId, ref: 'User', required: true }],
        lastMessageId: { type: Schema.Types.ObjectId, ref: 'Message' },
        unreadCounts: {
            type: Map,
            of: Number,
            default: new Map(),
        },
    },
    { timestamps: true }
);

// Index for finding conversations between specific users
conversationSchema.index({ participantIds: 1 });

export default model<IConversation>('Conversation', conversationSchema);
