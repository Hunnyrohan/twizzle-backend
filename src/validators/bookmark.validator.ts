import { z } from 'zod';

export const getBookmarksSchema = z.object({
    query: z.object({
        cursor: z.string().optional(),
        limit: z.string().transform((val) => parseInt(val, 10)).optional(),
    }),
});
