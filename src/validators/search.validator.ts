import { z } from 'zod';

export const searchSchema = z.object({
    q: z.string().optional(),
    filter: z.enum(['top', 'latest', 'people', 'media', 'tags']).optional().default('top'),
    cursor: z.string().optional(),
    limit: z.string().transform((val) => parseInt(val, 10)).optional().default('10'),
});
