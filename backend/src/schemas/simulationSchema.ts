import { z } from "zod";

const booleanish = z.union([z.boolean(), z.string(), z.number()]).transform(v => {
    if (typeof v === "boolean") {
        return v
    }
    
    if (typeof v === "number") {
        return v !== 0
    }
    const s = String(v).trim().toLowerCase()

    if (["false","0","no","off"].includes(s)) {
        return false
    }
    
    if (["true","1","yes","on"].includes(s)) {
        return true
    }
    return true
})

export const simulationParams = z.object({
    clientId: z.coerce.number().int().positive(),
})

export const simulationCreateBody = z.object({
    name: z.string().max(100).optional(),
    rate: z.coerce.number().min(-0.99).max(1).default(0.04),
    untilYear: z.coerce.number().int().min(1900).max(3000).default(2060),
    startYear: z.coerce.number().int().min(1900).max(3000).optional(),
    initialValue: z.coerce.number().nonnegative().optional(),
    includeEvents: booleanish.default(true),
}).refine(v => !v.startYear || v.startYear <= v.untilYear, {
    path: ["startYear"],
    message: "startYear must be <= untilYear",
})

export const simulationListQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    withSeries: booleanish.default(false),
})

export const simulationIdParams = z.object({
    id: z.coerce.number().int().positive(),
})