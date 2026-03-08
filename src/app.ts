import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';

import connectDB from './config/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import tweetRoutes from './routes/tweet.routes';
import uploadRoutes from './routes/upload.routes';
import errorHandler from './middlewares/error.middleware';
import adminRoutes from './routes/admin.routes';
import trendRoutes from './routes/trend.routes';
import settingsRoutes from './routes/settings.routes';
import privacyRoutes from './routes/privacy.routes';
import blockRoutes from './routes/block.routes';
import notificationRoutes from './routes/notification.routes';
import messageRoutes from './routes/message.routes';
import exploreRoutes from './routes/explore.routes';
import searchRoutes from './routes/search.routes';
import bookmarkRoutes from './routes/bookmark.routes';
import paymentRoutes from './routes/payment.routes';
import notInterestedRoutes from './routes/not-interested.routes';

dotenv.config();

const app: Application = express();
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    // Flutter (socket_io_client) doesn't send a browser Origin header.
    // Restricting origin here blocks Flutter connections, so we allow all.
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Socket.io logic
const userIdToSocketIds = new Map<string, Set<string>>();
const socketIdToUserId = new Map<string, string>();

io.on('connection', (socket) => {
  console.log('Socket Connected:', socket.id);

  socket.on('join', (userId: string) => {
    if (!userIdToSocketIds.has(userId)) {
      userIdToSocketIds.set(userId, new Set());
    }
    userIdToSocketIds.get(userId)?.add(socket.id);
    socketIdToUserId.set(socket.id, userId);
    console.log(`User ${userId} (socket ${socket.id}) joined. Total sockets: ${userIdToSocketIds.get(userId)?.size}`);
  });

  // Helper to emit to all sockets of a user
  const emitToUser = (userId: string, event: string, data: any) => {
    const socketIds = userIdToSocketIds.get(userId);
    if (socketIds) {
      socketIds.forEach(id => io.to(id).emit(event, data));
    }
  };

  // Calling Signaling
  socket.on('call:user', ({ to, offer, callType, callerName, callerImage, conversationId, isVerified }: any) => {
    const from = socketIdToUserId.get(socket.id);
    if (!from) {
      console.warn('Call attempt from unknown socket (not joined):', socket.id);
      console.warn('Known sockets:', [...socketIdToUserId.keys()]);
      return;
    }
    console.log(`Call from ${from} to ${to}, type: ${callType}`);
    emitToUser(to, 'incomming:call', {
      from,
      offer,
      callType,
      callerName,
      callerImage,
      conversationId,
      isVerified: !!isVerified,
    });
  });

  socket.on('call:accepted', ({ to, ans }: any) => {
    emitToUser(to, 'call:accepted', { from: socketIdToUserId.get(socket.id), ans });
  });

  socket.on('call:rejected', ({ to }: any) => {
    emitToUser(to, 'call:rejected', { from: socketIdToUserId.get(socket.id) });
  });

  socket.on('peer:nego:needed', ({ to, offer }: any) => {
    emitToUser(to, 'peer:nego:needed', { from: socketIdToUserId.get(socket.id), offer });
  });

  socket.on('peer:nego:done', ({ to, ans }: any) => {
    emitToUser(to, 'peer:nego:final', { from: socketIdToUserId.get(socket.id), ans });
  });

  socket.on('peer:ice:candidate', ({ to, candidate }: any) => {
    emitToUser(to, 'peer:ice:candidate', { from: socketIdToUserId.get(socket.id), candidate });
  });

  socket.on('disconnect', () => {
    const userId = socketIdToUserId.get(socket.id);
    if (userId) {
      const socketIds = userIdToSocketIds.get(userId);
      if (socketIds) {
        socketIds.delete(socket.id);
        if (socketIds.size === 0) {
          userIdToSocketIds.delete(userId);
        }
      }
      socketIdToUserId.delete(socket.id);
    }
    console.log('Socket Disconnected:', socket.id);
  });
});

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow any origin in development to support both localhost and network IP
      callback(null, true);
    },
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
app.use('/api/users', userRoutes);
app.use('/api/explore', exploreRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/tweets', tweetRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api', uploadRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/blocks', blockRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/bookmarks', bookmarkRoutes);
app.use('/api/not-interested', notInterestedRoutes);
app.use('/api/payments/esewa', paymentRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Twizzle API is running' });
});

// Error handler (must be last)
app.use(errorHandler);

// Server
const PORT = process.env.PORT || 5050;

if (process.env.NODE_ENV !== 'test') {
  // Connect Database only when not testing - tests handle their own connection
  connectDB();

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Mobile/Internal access: http://192.168.1.84:${PORT}`);
    console.log(`Local access: http://localhost:${PORT}`);
  });
}

export { app, httpServer };
export default app;
