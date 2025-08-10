import { z } from "zod";

export const simulationParams = z.object({
    id: z.coerce.number().int().positive()
})

export const simulationByClientParams = z.object({
    clientId: z.coerce.number().int().positive()
})

export const simulationCreateBody = z.object({
    name: z.string().min(1).optional(),
    rate: z.coerce.number().min(-0.99).max(1).default(0.04),
    untilYear: z.coerce.number().int().min(1900).max(3000).default(2060),
    startYear: z.coerce.number().int().min(1900).max(3000).optional(),
    initialValue: z.coerce.number().nonnegative().optional(),
    includeEvents: z.coerce.boolean().default(true)
}).refine(v => !v.startYear || v.startYear <= v.untilYear, {
    path: ["startYear"],
    message: "startYear must be <= untilYear"
})

export const simulationListQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    withSeries: z.coerce.boolean().default(false)
})
