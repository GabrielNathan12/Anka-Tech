import { z } from "zod";

export const insuranceCreateSchema = z.object({
    type: z.enum(["LIFE", "DISABILITY"]),
    coverage: z.coerce.number().positive(),
    premium: z.coerce.number().nonnegative().optional(),
    provider: z.string().max(200).optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
    notes: z.string().max(1000).optional()
}).superRefine((v, ctx) => {
    if (v.endDate && v.startDate && v.endDate < v.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "endDate must be >= startDate" })
    }
})

export const insuranceUpdateSchema = insuranceCreateSchema.partial().refine(
    d => Object.keys(d).length > 0, { message: "Send at least one field to update" }
)

export const insuranceIdParams = z.object({
    id: z.coerce.number().int().positive()
})

export const insuranceByClientParams = z.object({
    clientId: z.coerce.number().int().positive()
})

export const insuranceListQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    type: z.enum(["LIFE", "DISABILITY"]).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional()
})
