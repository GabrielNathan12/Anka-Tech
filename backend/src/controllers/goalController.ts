import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/utils/prisma";
import { Prisma } from "@prisma/client";

export async function createGoal(req: FastifyRequest, reply: FastifyReply) {
    const body = req.body as any
    
    await prisma.goal.create({
        data: {
            clientId: body.clientId,
            type: body.type,
            name: body.name,
            targetValue: new Prisma.Decimal(body.targetValue),
            targetDate: body.targetDate,
            notes: body.notes
        }
    })
    return reply.code(201).send(true)
}

export async function listGoals(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any
    
    const items = await prisma.goal.findMany({
        where: { clientId: Number(id) },
        orderBy: { targetDate: "asc" }
    })

    return reply.send({items})
}