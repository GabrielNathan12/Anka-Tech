import { z } from 'zod';

export const allocationItem = z.object({
    assetClass: z.enum([
        "EQUITIES",
        "FIXED_INCOME",
        "CASH",
        "REAL_ESTATE",
        "INTERNATIONAL",
        "ALTERNATIVES"
    ]),
    percent: z.coerce.number().min(0).max(100)
})

export const portfolioCreateSchema = z.object({
    clientId: z.coerce.number().int().positive(),
    kind: z.enum(["CURRENT", "PLAN"]),
    asOfDate: z.string().datetime().optional(),
    totalValue: z.coerce.number().nonnegative(),
    allocations: z.array(allocationItem)
}).superRefine((val, ctx) => {
    const sum = val.allocations.reduce((acc, a) => acc + a.percent, 0)
    const diff = Math.abs(sum - 100)

    if(diff > 0.01) {
        ctx.addIssue({
            code: 'custom',
            path: ['allocations'],
            message: `Sum of percentages must be 100. Received: ${sum.toFixed(3)}`
        })
    }
})

export const portfolioListQuery = z.object({
    clientId: z.coerce.number().int().positive(),
    kind: z.enum(["CURRENT", "PLAN"]).optional()
})