import connectDB from '../config/database';
import mongoose from 'mongoose';
beforeAll(async () => {
    await connectDB();
});

afterAll(async () => {
    // Add any teardown logic if necessary
    await mongoose.connection.close();
});
