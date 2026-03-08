import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import * as messageValidator from '../validators/message.validator';
import authMiddleware from '../middlewares/auth.middleware';
import { upload } from '../config/upload';
import { z, AnyZodObject } from 'zod';

const validateRequest = (schema: AnyZodObject) => (req: any, res: any, next: any) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (err: any) {
        return res.status(400).json({ success: false, error: { message: err.errors?.[0]?.message || 'Validation Error', details: err.errors } });
    }
};

const router = Router();

router.use(authMiddleware);

router.get('/conversations', messageController.getConversations);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/conversations/:id', messageController.getConversationById);

router.get(
    '/conversations/:id/messages',
    validateRequest(messageValidator.getMessagesSchema),
    messageController.getMessages
);

router.post(
    '/conversations/:id/messages',
    upload.array('images', 5),
    validateRequest(messageValidator.sendMessageSchema),
    messageController.sendMessage
);

router.post('/conversations/:id/read', messageController.markAsRead);

router.post(
    '/conversations',
    validateRequest(messageValidator.startConversationSchema),
    messageController.startConversation
);

router.delete('/:messageId', messageController.deleteMessage);

export default router;
