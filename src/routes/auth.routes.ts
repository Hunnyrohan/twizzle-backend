import { Router } from 'express';
import authController from '../controllers/auth.controller';

const router = Router();

// AUTH ROUTES
router.post('/register', authController.register);
router.post('/login', authController.login);

export default router;
