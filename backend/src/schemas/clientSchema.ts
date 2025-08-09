// src/schemas/user-schema.ts
import { z } from "zod"

export const clientBase = z.object({
    name: z.string().min(1, 'O nome é obrigatório'),
    email: z.string().email("Email inválido"),
    age: z.number().int().min(0).max(150),
    status: z.boolean(),
    family_perfil: z.string().min(1, "O perfil familiar é obrigatório")
})

export const clientCreateSchema = clientBase
            .extend({
                password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres")
            })

export const clientUpdateSchema = clientBase
            .partial()
            .extend({
                password: z.string().min(6).optional()
            })
            .refine((data) => Object.keys(data).length > 0 , {
                message: "Envie pelo menos um campo para atualizar"
            })

export const listQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    perPage: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().optional()
})

export const clientIdParams = z.object({
    id: z.coerce.number().int().positive()
})

export const clientDTO = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string().email(),
    age: z.number(),
    status: z.coerce.boolean(), 
    family_perfil: z.string(),
    createdAt: z.date().optional().or(z.string()),
})

export const clientsDTO = z.array(clientDTO)

export type ClientCreateInput = z.infer<typeof clientCreateSchema>
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>
export type ClientIdParams = z.infer<typeof clientIdParams>
export type ListQuery = z.infer<typeof listQuery>