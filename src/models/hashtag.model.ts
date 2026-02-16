import { Schema, model, Document } from 'mongoose';

export interface IHashtag extends Document {
    tag: string;
    count: number;
    lastUsed: Date;
}

const hashtagSchema = new Schema<IHashtag>(
    {
        tag: { type: String, required: true, unique: true },
        count: { type: Number, default: 0 },
        lastUsed: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

hashtagSchema.index({ tag: 1 });
hashtagSchema.index({ count: -1 });

export default model<IHashtag>('Hashtag', hashtagSchema);
