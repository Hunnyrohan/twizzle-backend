import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { getBlocks, toggleBlock } from '../controllers/block.controller';

const router = Router();

router.get('/', authMiddleware, getBlocks);
router.post('/:userId', authMiddleware, toggleBlock);

export default router;
