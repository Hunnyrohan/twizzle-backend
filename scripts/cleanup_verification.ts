import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/models/user.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const cleanup = async () => {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI not found in .env');

        console.log('Connecting to MongoDB...');
        await mongoose.connect(uri);
        console.log('Connected successfully.');

        // Find users who are verified but NOT by ESEWA
        const affectedUsers = await User.find({
            isVerified: true,
            $or: [
                { verificationProvider: { $ne: 'ESEWA' } },
                { verificationProvider: { $exists: false } }
            ]
        });

        console.log(`Found ${affectedUsers.length} users with unearned verified status.`);

        if (affectedUsers.length > 0) {
            console.log('Removing verified status...');
            const result = await User.updateMany(
                {
                    isVerified: true,
                    $or: [
                        { verificationProvider: { $ne: 'ESEWA' } },
                        { verificationProvider: { $exists: false } }
                    ]
                },
                {
                    $set: {
                        isVerified: false,
                        verifiedAt: undefined,
                        verificationProvider: undefined,
                        verificationTxnId: undefined,
                        verificationRefId: undefined
                    }
                }
            );
            console.log(`Successfully updated ${result.modifiedCount} users.`);
        } else {
            console.log('No users need cleanup.');
        }

    } catch (error) {
        console.error('Cleanup failed:', error);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
};

cleanup();
