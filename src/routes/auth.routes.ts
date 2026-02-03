import { Router } from 'express';
import { register, login, me, updateProfile } from '../controllers/auth.controller';
import authMiddleware from '../middlewares/auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// PUBLIC
router.post('/register', register);
router.post('/login', login);

// PROTECTED
router.get('/me', authMiddleware, me);

// ✅ REQUIRED BY TASK
router.put(
  '/:id',
  authMiddleware,
  upload.single('image'),
  updateProfile
);

export default router;
