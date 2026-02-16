import { Schema, model, Document, Types } from 'mongoose';

export interface IFollow extends Document {
    follower: Types.ObjectId;
    following: Types.ObjectId;
}

const followSchema = new Schema<IFollow>(
    {
        follower: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        following: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    },
    { timestamps: true }
);

// Ensure a user can't follow the same person twice
followSchema.index({ follower: 1, following: 1 }, { unique: true });

export default model<IFollow>('Follow', followSchema);
