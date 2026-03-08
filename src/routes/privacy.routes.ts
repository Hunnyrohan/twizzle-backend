import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { updatePrivacy, getPrivacy } from '../controllers/privacy.controller';

const router = Router();

router.get('/me', authMiddleware, getPrivacy);
router.patch('/me', authMiddleware, updatePrivacy);

export default router;
