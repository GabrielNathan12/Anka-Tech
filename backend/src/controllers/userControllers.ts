import type { FastifyReply, FastifyRequest } from "fastify"
import { prisma } from '../lib/utils/prisma'

export async function getUsers(req: FastifyRequest, reply: FastifyReply) {
    try {
        const users = await prisma.user.findMany()
        console.log('chegou aqui', users)
        return reply.send(users)
    } catch (error) {
        return reply.status(500).send({ error: 'Erro ao buscar usuários.' })
    }
}