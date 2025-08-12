import { z } from "zod";


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

export const importClientRow = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(3).optional().default("changeme"),
    age: z.coerce.number().int().min(0).max(130).optional().default(0),
    status: booleanish.optional().default(true),
    family_perfil: z.string().optional().default("unknown")
})

export type ImportClientRow = z.infer<typeof importClientRow>
