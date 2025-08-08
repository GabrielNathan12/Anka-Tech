import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify"

export const getAllUsers = async (app: FastifyInstance) => {
    app.get('/users', (request:FastifyRequest, replay: FastifyReply) => {
        replay.status(200).send([{id: 1, name: 'Gabriel'}])
    })
}