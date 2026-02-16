import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { getSettings, updateSettings } from '../controllers/settings.controller';

const router = Router();

router.get('/me', authMiddleware, getSettings);
router.patch('/me', authMiddleware, updateSettings);

export default router;
