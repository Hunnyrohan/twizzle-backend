import { Router } from 'express';
import * as exploreController from '../controllers/explore.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/trending', exploreController.getTrending);
router.get('/hot', exploreController.getHotPosts);
router.get('/suggestions', optionalAuth, exploreController.getSuggestions);

export default router;
