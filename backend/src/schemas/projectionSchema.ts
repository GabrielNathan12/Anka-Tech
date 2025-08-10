import { z } from "zod";

export const projectionParams = z.object({
    id: z.coerce.number().int().positive()
})

export const projectionQuery = z.object({
    rate: z.coerce.number().min(-0.99).max(1).default(0.04),
    untilYear: z.coerce.number().int().min(1900).max(3000).default(2060),
    startYear: z.coerce.number().int().min(1900).max(3000).optional(),
    initialValue: z.coerce.number().nonnegative().optional()
}).refine(v => !v.startYear || v.startYear <= v.untilYear, {
    path: ['startYear'],
    message: 'startYear must be <= untilYear'
})