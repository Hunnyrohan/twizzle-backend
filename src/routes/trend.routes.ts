import { Router } from 'express';
import { getTrends } from '../controllers/trend.controller';

const router = Router();

router.get('/', getTrends);

export default router;
