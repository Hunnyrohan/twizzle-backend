import { Router } from 'express';
import * as searchController from '../controllers/search.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', optionalAuth, searchController.search);

export default router;
