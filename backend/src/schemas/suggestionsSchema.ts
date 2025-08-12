import { z } from "zod";

export const suggestionsParams = z.object({
    clientId: z.coerce.number().int().positive()
})

export const suggestionsQuery = z.object({
    rate: z.coerce.number().min(-0.99).max(1).default(0.04),
    roundStep: z.coerce.number().int().min(1).max(1000).default(10)
})
