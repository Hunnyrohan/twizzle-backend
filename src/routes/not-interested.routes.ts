import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { toggleNotInterested } from '../controllers/not-interested.controller';

const router = Router();

router.post('/:tweetId', authMiddleware, toggleNotInterested);

export default router;
