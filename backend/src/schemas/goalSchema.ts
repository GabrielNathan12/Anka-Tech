import { z } from 'zod';

export const goalCreateSchema = z.object({
    clientId: z.coerce.number().int().positive(),
    type: z.enum(["RETIREMENT", "SHORT_TERM", "MEDIUM_TERM", "OTHER"]),
    name: z.string().min(1),
    targetValue: z.coerce.number().nonnegative(),
    targetDate: z.coerce.date(),
    notes: z.string().max(1000).optional()
})

export const goalParmas = z.object({
    id: z.coerce.number().int().positive()
})

export const goalListQuery = z.object({
    clientId: z.coerce.number().int().positive()
})

