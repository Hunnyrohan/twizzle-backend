import { Schema, model, Document, Types } from 'mongoose';

export interface ITweet extends Document {
    content: string;
    author: Types.ObjectId;
    media: string[];
    likesCount: number;
    retweetsCount: number;
    repliesCount: number;
    parentTweet?: Types.ObjectId; // For replies
    retweetOf?: Types.ObjectId; // For retweets
    location?: string; // Sensor 2: GPS Location
    createdAt: Date;
    updatedAt: Date;
}

const tweetSchema = new Schema<ITweet>(
    {
        content: { type: String, maxlength: 280 },
        author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        media: [{ type: String }],
        likesCount: { type: Number, default: 0 },
        retweetsCount: { type: Number, default: 0 },
        repliesCount: { type: Number, default: 0 },
        parentTweet: { type: Schema.Types.ObjectId, ref: 'Tweet' },
        retweetOf: { type: Schema.Types.ObjectId, ref: 'Tweet' },
        location: { type: String },
    },
    { timestamps: true }
);

export default model<ITweet>('Tweet', tweetSchema);
