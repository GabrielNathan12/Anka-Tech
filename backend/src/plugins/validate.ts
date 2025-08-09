import type { FastifyRequest , FastifyReply  } from "fastify";
import { ZodSchema, ZodError } from "zod/v4";

export function validateBody(schema: ZodSchema) {
    return (req: FastifyRequest, reply: FastifyReply, done: (error?: Error) => void) => {
        try {
            req.body = schema.parse(req.body)
            done()
        } catch (error) {
            if(error instanceof ZodError) {
                return reply.status(400).send({erros: error.flatten() })
            }
            return reply.status(400).send({error: 'Invalid payload'})
        }
    }
}

export function validateParams(schema: ZodSchema) {
    return (req: FastifyRequest, reply: FastifyReply, done: (error?:Error) => void) => {
        try {
            req.params = schema.parse(req.params)
            done()
        } catch (error) {
            if (error instanceof ZodError) {
                return reply.status(400).send({ errors: error.flatten() });
            }
            return reply.status(400).send({ error: "invalid params" });
        }
    }
}

export function validateQuery (schema: ZodSchema) {
    return (req: FastifyRequest, reply: FastifyReply, done:(error?: Error) => void) => {
        try {
            req.query = schema.parse(req.query)
            done()
        } catch (error) {
            if (error instanceof ZodError) {
                return reply.status(400).send({ errors: error.flatten() });
            }
            return reply.status(400).send({ error: "invalid query" });
        }
    }
}