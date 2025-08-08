// src/schemas/user-schema.ts
import { z } from "zod"

export const userSchema = z.object({
    name: z.string(),
    email: z.string().email(),
    age: z.number(),
    status: z.boolean(),
    family_perfil: z.string()
})
