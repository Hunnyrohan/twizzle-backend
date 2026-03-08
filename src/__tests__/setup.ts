import connectDB from '../config/database';
import mongoose from 'mongoose';

beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany({});
        }
    }
});

afterAll(async () => {
    await mongoose.connection.close();
});
