import z, { email } from "zod";

export const login = z.object({
    email: z.string().email('E-mail incorreto'),
    password: z.string().min(6, 'A senha deve ter ao menos 6 caracteres')
})