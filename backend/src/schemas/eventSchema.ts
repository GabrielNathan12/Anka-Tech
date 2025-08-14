import { z } from 'zod'

export const eventType = z.enum(["DEPOSIT", "WITHDRAWAL", "CONTRIBUTION", "EXPENSE"])
export const eventFrequency = z.enum(["ONE_TIME", "MONTHLY", "YEARLY"])

export const eventCreateSchema = z.object({
    clientId: z.coerce.number().int().positive(),
    type: eventType,
    amount: z.coerce.number().positive(),
    frequency: eventFrequency,
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    executionDay: z.coerce.number().int().min(1).max(28).optional(),
    executionMonth: z.coerce.number().int().min(1).max(12).optional(),
    description: z.string().max(1000).optional()
}).superRefine((v, ctx) => {
    if (v.endDate && v.startDate && v.endDate < v.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "endDate must be >= startDate" })
    }
})

export const eventUpdateSchema = z.object({
    type: eventType.optional(),
    amount: z.coerce.number().positive().optional(),
    frequency: eventFrequency.optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.union([z.coerce.date(), z.null()]).optional(),
    executionDay: z.coerce.number().int().min(1).max(28).optional(),
    executionMonth: z.coerce.number().int().min(1).max(12).optional(),
    description: z.string().max(1000).optional(),
}).superRefine((v, ctx) => {
    if (v.startDate && v.endDate instanceof Date && v.endDate < v.startDate) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "endDate must be >= startDate" })
    }
}).refine(v => Object.keys(v).length > 0, { message: "Provide at least one field to update" })

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