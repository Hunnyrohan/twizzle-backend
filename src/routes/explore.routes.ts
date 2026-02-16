import { Router } from 'express';
import * as exploreController from '../controllers/explore.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

router.get('/trending', exploreController.getTrending);
router.get('/hot', exploreController.getHotPosts);
router.get('/suggestions', exploreController.getSuggestions);

export default router;
