import { z } from "zod";

export const projectionParams = z.object({
    id: z.coerce.number().int().positive()
})

const booleanish = z.union([z.boolean(), z.string(), z.number()]).transform((v) => {
    if (typeof v === "boolean") {
        return v
    }
    
    if (typeof v === "number") {
        return v !== 0
    }
    
    const s = v.toLowerCase().trim()
    
    if (["false", "0", "off", "no"].includes(s)) {
        return false
    }

    if (["true", "1", "on", "yes"].includes(s)) {
        return true
    }
    return true;
})

export const projectionQuery = z.object({
    rate: z.coerce.number().min(-0.99).max(1).default(0.04),
    untilYear: z.coerce.number().int().min(1900).max(3000).default(2060),
    startYear: z.coerce.number().int().min(1900).max(3000).optional(),
    initialValue: z.coerce.number().nonnegative().optional(),
    includeEvents: booleanish.default(true),
    mode: z.enum(['monthly', 'yearly']).default('monthly')
}).refine(v => !v.startYear || v.startYear <= v.untilYear, {
    path: ['startYear'],
    message: 'startYear must be <= untilYear'
})