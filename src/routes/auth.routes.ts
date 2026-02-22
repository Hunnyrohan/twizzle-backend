import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, googleLogin } from '../controllers/auth.controller';
const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/google-login', googleLogin);

export default router;
