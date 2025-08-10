import type { FastifyReply, FastifyRequest } from "fastify";
import { z, ZodTypeAny } from "zod";

type Done = (err?: Error) => void

function formatZodError(error: z.ZodError) {
    const { fieldErrors } = error.flatten()

    return Object.entries(fieldErrors).map(([field, messages]) => ({
        field,
        message: messages?.[0] ?? "Invalid value"
    }))
}

export function validateBody(schema: ZodTypeAny) {
    return (req: FastifyRequest, reply: FastifyReply, done: Done) => {
        const result = schema.safeParse((req as any).body)
        
        if (!result.success) {
            return reply.status(400).send({
                errors: formatZodError(result.error)
            })
        }
        (req as any).body = result.data

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
