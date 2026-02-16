import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { updatePrivacy } from '../controllers/privacy.controller';

const router = Router();

router.patch('/me', authMiddleware, updatePrivacy);

export default router;
