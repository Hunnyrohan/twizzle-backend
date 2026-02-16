import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage extends Document {
    conversationId: Types.ObjectId;
    senderId: Types.ObjectId;
    text: string;
    status: 'sent' | 'seen';
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, required: true },
        status: { type: String, enum: ['sent', 'seen'], default: 'sent' },
    },
    { timestamps: true }
);

// Index for fast message retrieval in a conversation
messageSchema.index({ conversationId: 1, createdAt: -1 });

export default model<IMessage>('Message', messageSchema);
