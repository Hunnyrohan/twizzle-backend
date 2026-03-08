import { Schema, model, Document, Types } from 'mongoose';

export interface IPayment extends Document {
    user: Types.ObjectId;
    purpose: 'VERIFICATION';
    provider: 'ESEWA';
    amount: number;
    currency: string;
    status: 'PENDING' | 'SUCCESS' | 'FAILED';
    pid: string;
    refId?: string;
    raw?: any;
    createdAt: Date;
    updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
    {
        user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        purpose: { type: String, enum: ['VERIFICATION'], required: true },
        provider: { type: String, enum: ['ESEWA'], required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: 'NPR' },
        status: {
            type: String,
            enum: ['PENDING', 'SUCCESS', 'FAILED'],
            default: 'PENDING'
        },
        pid: { type: String, required: true, unique: true },
        refId: { type: String },
        raw: { type: Schema.Types.Mixed }
    },
    {
        timestamps: true
    }
);

export default model<IPayment>('Payment', paymentSchema);
