import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodTypeAny } from "zod";

type Done = (err?: Error) => void

function formatZodError(error: z.ZodError) {
    const { fieldErrors, formErrors } = error.flatten()
    const typedFieldErrors = fieldErrors as Record<string, string[] | undefined>;

    const out = Object.keys(typedFieldErrors).map((field) => {
        const msgs = typedFieldErrors[field]
        return { field, message: msgs?.[0] ?? "Invalid value" }
    })

    return out.length ? out : formErrors.map((m) => ({ field: "_root", message: m }))

}

export function validateBody(schema: ZodTypeAny) {
    return (req: FastifyRequest, reply: FastifyReply, done: Done) => {
        const raw = req.body ?? {}

        if (typeof raw === "object" && Object.keys(raw).length === 0) {
            reply.status(400).send({ errors: [{ field: "_", message: "Envie pelo menos um campo para atualizar" }] })
            return
        }

        const parsed = schema.safeParse(raw)
        
        if (!parsed.success) {
            const errors = parsed.error.issues.map(i => ({ field: i.path.join("."), message: i.message }))

            reply.status(400).send({ errors })

            return
        }
        req.body = parsed.data
        done()
    }
}

export function validateParams(schema: ZodTypeAny) {
    return (req: FastifyRequest, reply: FastifyReply, done: Done) => {
        const result = schema.safeParse((req as any).params)

        if (!result.success) {
            return reply.status(400).send({
                errors: formatZodError(result.error)
            })
        }

        (req as any).params = result.data

        done()
    }
}

export function validateQuery(schema: ZodTypeAny) {
    return (req: FastifyRequest, reply: FastifyReply, done: Done) => {
        const result = schema.safeParse((req as any).query)
        if (!result.success) {
            return reply.status(400).send({
                errors: formatZodError(result.error)
            })
        }
        (req as any).query = result.data
        done()
    }
}
