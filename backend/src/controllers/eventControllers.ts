import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from '../lib/utils/prisma';
import { Prisma } from "@prisma/client";

const eventSelect = {
    id: true,
    clientId: true,
    type: true,
    amount: true,
    frequency: true,
    startDate: true,
    endDate: true,
    executionDay: true,
    executionMonth: true,
    description: true,
    createdAt: true,
    updatedAt: true
}

export async function listEvents(req: FastifyRequest, reply: FastifyReply) {
    const { clientId, type, frequency, from, to, page = 1, perPage = 20 } = (req.query as any) ?? {}
    
    const where = {
        clientId: Number(clientId),
            ...(type ? { type } : {}),
            ...(frequency ? { frequency } : {}),
            ...(from || to
        ? {
          AND: [
            from ? { startDate: { lte: to ?? new Date("3000-01-01") } } : {},
            to ? { OR: [{ endDate: null }, { endDate: { gte: from ?? new Date("1900-01-01") } }] } : {}
          ]
        }
      : {})
    }
    const [total, items] = await Promise.all([
        prisma.event.count({ where }),
        prisma.event.findMany({
            where: where,
            orderBy: { startDate: "desc" },
            select: eventSelect,
            skip: (page - 1) * perPage,
            take: perPage
        })
    ])

    return reply.send({ page, perPage, total, items })
}

export async function getEventById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any

    const event = await prisma.event.findUnique({
        where: { id: Number(id) },
        select: eventSelect
    })

    if (!event) {
        return reply.status(404).send({ error: "Event not found" })
    }
    return reply.send(event)
}

export async function createEvent(req: FastifyRequest, reply: FastifyReply) {
    const body = req.body as any

    await prisma.event.create({
        data: {
            clientId: body.clientId,
            type: body.type,
            amount: new Prisma.Decimal(body.amount),
            frequency: body.frequency,
            startDate: body.startDate,
            endDate: body.endDate,
            executionDay: body.executionDay,
            executionMonth: body.executionMonth,
            description: body.description
        },
        select: eventSelect
    })

    return reply.code(201).send(true)
}

export async function updateEvent(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any
    const body = req.body as any

    try {
        await prisma.event.update({
            where: { id: Number(id) },
            data: {
                clientId: body.clientId,
                type: body.type,
                amount: body.amount != null ? new Prisma.Decimal(body.amount) : undefined,
                frequency: body.frequency,
                startDate: body.startDate,
                endDate: body.endDate,
                executionDay: body.executionDay,
                executionMonth: body.executionMonth,
                description: body.description
            },
            select: eventSelect
        })

    return reply.send(true)
  } catch (error: any) {
        if (error?.code === "P2025") {
            return reply.status(404).send({ error: "Event not found" })
        }
        req.log.error(error)
        return reply.status(500).send({ error: "Error updating event" })
    }
}

export async function deleteEvent(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any

    try {

        await prisma.event.delete({ where: { id: Number(id) } })

        return reply.code(204).send()
    } catch (err: any) {
        if (err?.code === "P2025") {
        return reply.status(404).send({ error: "Event not found" })
        }
        req.log.error(err)
        return reply.status(500).send({ error: "Error deleting event" })
    }
}