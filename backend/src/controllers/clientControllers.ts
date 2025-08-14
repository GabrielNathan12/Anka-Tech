import type { FastifyReply, FastifyRequest } from "fastify"
import { prisma } from '../lib/utils/prisma'
import { clientDTO } from "../schemas/clientSchema";

const clientSelect = {
    id: true,
    name: true,
    email: true,
    age: true,
    status: true,
    family_perfil: true,
    createdAt: true,
    updatedAt: true
}

export async function getClients(req: FastifyRequest, reply: FastifyReply) {
    const {page = 1, perPage = 20, search} = (req.query as any) ?? {}
    
    const where = search
        ? {
            OR: 
            [
                { name: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: "insensitive" as const} }
            ]
        }
    : {}

    const [total, items] = await Promise.all([
            prisma.client.count({ where }),
            prisma.client.findMany({
            where,
            select: clientSelect,
            orderBy: { id: "asc" },
            skip: (page - 1) * perPage,
            take: perPage
        })
    ])

    return reply.send({page, perPage, total, items})
}

export async function getClientById(req: FastifyRequest, reply: FastifyReply) {
    const { id}  = req.params as any

    const client = await prisma.client.findUnique({
        where: {id: Number(id)},
        select: clientSelect
    })

    if (!client) {
        return reply.status(404).send({error: 'Client not found'})
    }

    return reply.send(clientDTO.parse(client))
}

export async function createClient(req: FastifyRequest, reply: FastifyReply) {
    const body = req.body as any

    try {
        await prisma.client.create({
            data: {
                name: body.name,
                email: body.email,
                age: body.age,
                status: body.status,
                family_perfil: body.family_perfil
            },
            select: clientSelect
        })
        return reply.code(201).send(true)
    } catch (error: any) {
        if (error?.code === "P2002") {
                return reply.status(409).send({ error: "Email already exists" })
        }
            req.log.error(error)
            return reply.status(500).send({ error: "Error create client" })
        
    }
}

export async function updateClient(req: FastifyRequest, reply: FastifyReply) {
    const {id} = req.params as any
    const body = req.body as any

    try {
        await prisma.client.update({
            where: {id: Number(id)},
             data: {
                name: body.name,
                email: body.email,
                age: body.age,
                status: body.status,
                family_perfil: body.family_perfil
            },
            select: clientSelect
        })
        return reply.send(true)

    } catch (error:any) {
        if (error?.code === "P2025") {
            return reply.status(404).send({ error: "Client not found" })
        }
        if (error?.code === "P2002") {
            return reply.status(409).send({ error: "Email already exists" })
        }
        req.log.error(error)

        return reply.status(500).send({ error: "Erro update client" })
    }
}

export async function deleteClient(req: FastifyRequest, reply: FastifyReply) {
    const {id} = req.params as any
    try {
        await prisma.client.delete({where: {id: Number(id)}})
        return reply.code(204).send(true)
    } catch (error:any) {
        if (error?.code === "P2025") {
            return reply.status(404).send({ error: "Cliente não encontrado" });
        }
        req.log.error(error);
        return reply.status(500).send({ error: "Erro ao excluir cliente" });
    }
}