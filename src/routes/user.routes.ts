import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import authMiddleware from '../middlewares/auth.middleware';

const router = Router();

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
});

// Assuming this route is mounted at /api/users
router.get('/:username', userController.getUserByUsername);
router.put('/profile', authMiddleware, userController.updateProfile);
router.post('/me/avatar', authMiddleware, upload.single('image'), userController.uploadAvatar);
router.post('/me/cover', authMiddleware, upload.single('image'), userController.uploadCover);
import { getUserLikedTweets } from '../controllers/tweet.controller';

router.post('/:userId/follow', authMiddleware, userController.toggleFollow);
router.get('/:username/followers', userController.getFollowers);
router.get('/:username/following', userController.getFollowing);
router.get('/:username/likes', getUserLikedTweets);

export default router;
