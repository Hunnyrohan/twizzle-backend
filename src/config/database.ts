import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.NODE_ENV === 'test'
      ? process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/twizzle_test'
      : process.env.MONGODB_URI as string;

    const conn = await mongoose.connect(uri);

    if (process.env.NODE_ENV !== 'test') {
      console.log(`MongoDB Connected: ${conn.connection.host}`);
    }
  } catch (error) {
    console.error('Database connection error:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  }
};

export default connectDB;

// export const connectDBTest = async () => {
//     const testUri = MONGO_URI + "_test"; // Use a separate test database
//     try{
//         await mongoose.connect(testUri);
//         console.log("MongoDB Test Database connected!");
//     }catch(error){
//         console.error("Database error:", error);
//         process.exit(1); // Exit process with failure
//     }
// }