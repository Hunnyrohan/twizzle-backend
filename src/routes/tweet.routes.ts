import { Router } from 'express';
import { createTweet, getFeed, getTweet, getTweetComments, createComment, deleteTweet, likeTweet, unlikeTweet, retweet, unretweet, searchTweets } from '../controllers/tweet.controller';
import authMiddleware from '../middlewares/auth.middleware';
import optionalAuth from '../middlewares/optional-auth.middleware';
import { upload } from '../config/multer.config';

const router = Router();

// PUBLIC/PROTECTED (with enrichment support)
router.get('/', optionalAuth, getFeed);
router.get('/search', optionalAuth, searchTweets);
router.get('/:id', optionalAuth, getTweet);

// PROTECTED
router.post('/', authMiddleware, upload.array('media', 4), createTweet);
router.get('/:id/comments', optionalAuth, getTweetComments);
router.post('/:id/comments', authMiddleware, createComment);
router.delete('/:id', authMiddleware, deleteTweet);
router.post('/:id/like', authMiddleware, likeTweet);
router.delete('/:id/like', authMiddleware, unlikeTweet);
router.post('/:id/retweet', authMiddleware, retweet);
router.delete('/:id/retweet', authMiddleware, unretweet);

import { toggleBookmark } from '../controllers/bookmark.controller';
router.post('/:postId/bookmark', authMiddleware, toggleBookmark); // Requirement says /api/posts/:postId/bookmark

export default router;
