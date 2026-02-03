import { Router } from 'express';
import adminController from '../controllers/admin.controller';
import { upload } from '../config/multer.config';
import authMiddleware from '../middlewares/auth.middleware';
import { adminOnly } from '../middlewares/admin.middleware';

const router = Router();

router.use(authMiddleware, adminOnly);

router.post('/users', upload.single('image'), adminController.createUser);
router.get('/users', adminController.getUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', upload.single('image'), adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

export default router;
