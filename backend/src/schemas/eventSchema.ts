import { z } from 'zod'

export const eventCreateSchema = z.object({
    clientId: z.coerce.number().int().positive(),
    type: z.enum(["DEPOSIT", "WITHDRAWAL", "CONTRIBUTION", "EXPENSE"]),
    amount: z.coerce.number().positive(),
    frequency: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    executionDay: z.coerce.number().int().min(1).max(28).optional(),
    executionMonth: z.coerce.number().int().min(1).max(12).optional(),
    description: z.string().max(1000).optional()
}).superRefine((v, ctx) => {
    if (v.endDate && v.endDate < v.startDate) {
        ctx.addIssue({ code: "custom", path: ["endDate"], message: "endDate must be >= startDate" })
    }
    if (v.frequency === "MONTHLY" && v.executionDay == null) {
        ctx.addIssue({ code: "custom", path: ["executionDay"], message: "executionDay is required for MONTHLY" })
    }
    if (v.frequency === "YEARLY" && v.executionMonth == null) {
        ctx.addIssue({ code: "custom", path: ["executionMonth"], message: "executionMonth is required for YEARLY" })
    }
})

export const eventUpdateSchema = eventCreateSchema.partial().refine(d => Object.keys(d).length > 0, {
    message: "Send at least one field to update"
})

export const eventIdParams = z.object({
    id: z.coerce.number().int().positive()
})

export const eventListQuery = z.object({
    clientId: z.coerce.number().int().positive(),
    type: z.enum(["DEPOSIT", "WITHDRAWAL", "CONTRIBUTION", "EXPENSE"]).optional(),
    frequency: z.enum(["ONE_TIME", "MONTHLY", "YEARLY"]).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20)
}).superRefine((v, ctx) => {
    if (v.from && v.to && v.to < v.from) {
        ctx.addIssue({ code: "custom", path: ["to"], message: "to must be >= from" })
    }
})