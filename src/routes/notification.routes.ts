// backend/src/routes/notification.routes.ts
import { Router } from 'express';
import {
    getNotifications,
    getUnreadCount,
    markAllAsRead,
    markAsRead,
} from '../controllers/notification.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

// All routes are protected
router.get('/', authMiddleware, getNotifications);
router.get('/unread-count', authMiddleware, getUnreadCount);
router.post('/read-all', authMiddleware, markAllAsRead);
router.post('/:id/read', authMiddleware, markAsRead);

export default router;
