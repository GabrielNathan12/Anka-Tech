import { z } from 'zod';

export const loginBody = z.object({
    email: z.string().email(),
    password: z.string().min(6)
})

export const registerBody = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    password: z.string().min(6),
    role: z.enum(["ADVISOR", "VIEWER"]).default("VIEWER")
})