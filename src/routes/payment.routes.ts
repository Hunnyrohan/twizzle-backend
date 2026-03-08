import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.post('/verification/initiate', authMiddleware, paymentController.initiateVerification);
router.get('/verification/confirm', paymentController.confirmVerification);
router.get('/verification/status', authMiddleware, paymentController.getVerificationStatus);
router.get('/checkout/:txnUuid', paymentController.renderCheckoutForm);

export default router;
