import type { FastifyInstance } from "fastify";
import { userSchema } from "../schemas/userSchema";
import { ZodError } from "zod";
import { getUsers } from '../controllers/userControllers'

export async function routes(app:FastifyInstance) {
    app.get('/users',
        {
            schema: {
                tags: ['users'],
                description: 'List all users'
            }
        }, 
        getUsers
    )

    app.post('/users',
        {
            schema: {
                description: 'Create new user',
                tags: ['users'],
                body: userSchema
            },
            preValidation: (request, reply, done) => {
                try {
                    userSchema.parse(request.body)
                    done()
                } catch (err) {
                    if(err instanceof ZodError) {
                        const formattedErrors = err.message
                          reply.status(400).send({
                            detail: JSON.parse(formattedErrors),
                        })
                    }

                    reply.status(400).send({ detail: err })
                }
            }
    }, 
    async (request, reply) => {
        return {message: 'Criado com sucesso'}  
    })
}