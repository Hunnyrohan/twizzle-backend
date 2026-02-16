import { Schema, model, Document, Types } from 'mongoose';

export enum InteractionType {
    LIKE = 'like',
    RETWEET = 'retweet',
    BOOKMARK = 'bookmark',
}

export interface IInteraction extends Document {
    user: Types.ObjectId;
    tweet: Types.ObjectId;
    type: InteractionType;
}

const interactionSchema = new Schema<IInteraction>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        tweet: { type: Schema.Types.ObjectId, ref: 'Tweet', required: true },
        type: { type: String, enum: Object.values(InteractionType), required: true },
    },
    { timestamps: true }
);

// Ensure a user can only perform one type of interaction per tweet once
interactionSchema.index({ user: 1, tweet: 1, type: 1 }, { unique: true });

export default model<IInteraction>('Interaction', interactionSchema);
