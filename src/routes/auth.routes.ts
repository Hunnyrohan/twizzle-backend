import { Router } from 'express';
import { login, register, forgotPassword, resetPassword, googleLogin, changePassword, deactivateAccount, logoutAllSessions, logout, getMe } from '../controllers/auth.controller';
import authMiddleware from '../middlewares/auth.middleware';
const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/logout', logout);
router.post('/google-login', googleLogin);
router.get('/me', authMiddleware, getMe);

// Protected routes
router.post('/change-password', authMiddleware, changePassword);
router.post('/deactivate', authMiddleware, deactivateAccount);
router.post('/logout-all', authMiddleware, logoutAllSessions);

export default router;
