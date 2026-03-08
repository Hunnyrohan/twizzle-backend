import { z } from 'zod';

export const sendMessageSchema = z.object({
    body: z.object({
        text: z.string().max(1000).optional(),
        type: z.enum(['text', 'call', 'image']).optional(),
        callData: z.any().optional(),
    }),
});

export const getMessagesSchema = z.object({
    query: z.object({
        cursor: z.string().optional(),
        limit: z.string().transform((val) => parseInt(val, 10)).optional(),
    }),
});

export const startConversationSchema = z.object({
    body: z.object({
        userId: z.string().min(1),
    }),
});
