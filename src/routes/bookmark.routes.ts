import { Router } from 'express';
import * as bookmarkController from '../controllers/bookmark.controller';
import * as bookmarkValidator from '../validators/bookmark.validator';
import authMiddleware from '../middlewares/auth.middleware';
import { z, AnyZodObject } from 'zod';

// Reuse helper (could actally move to utils/validate.ts as planned later)
const validateRequest = (schema: AnyZodObject) => (req: any, res: any, next: any) => {
    try {
        schema.parse({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (err: any) {
        return res.status(400).json({ success: false, error: { message: err.errors?.[0]?.message || 'Validation Error', details: err.errors } });
    }
};

const router = Router();

router.use(authMiddleware);

router.get(
    '/',
    validateRequest(bookmarkValidator.getBookmarksSchema),
    bookmarkController.getBookmarks
);

// Toggle bookmark: /api/posts/:postId/bookmark
// This might typically be in post.routes.ts, but instruction says:
// "POST /api/posts/:postId/bookmark (toggle)"
// "backend/src/routes/post.routes.ts (update to add bookmark toggle route)"
// AND "backend/src/routes/bookmark.routes.ts"
// I will place GET /bookmarks here.
// I can also place POST /posts/:postId/bookmark here if I mount it correctly, OR update post.routes.ts.
// Since existing post.routes.ts exists, I should probably check it.
// Ideally, `bookmark.routes.ts` handles `/api/bookmarks`.
// `post.routes.ts` handles `/api/posts`.
// I will add the toggle route to `bookmark.routes.ts` but exposed at a different path OR simply import/export it.
// Actually, I'll mount `bookmark.routes` at `/api/bookmarks` for the list.
// And I'll ADD the toggle handler to `postRoutes` or mount a specific route here.

export default router;
