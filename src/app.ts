import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import errorHandler from './middlewares/error.middleware';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app: Application = express();

// Connect Database
connectDB();

// Middlewares
app.use(
  cors({
    origin: 'http://localhost:3000',
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ✅ Serve uploaded images publicly
app.use(
  '/uploads',
  express.static(path.join(process.cwd(), 'uploads'))
);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // ✅ ADD THIS
app.use('/api', uploadRoutes);


// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Twizzle API is running' });
});

// Error handler (must be last)
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
