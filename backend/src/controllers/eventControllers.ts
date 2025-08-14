import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from '../lib/utils/prisma';
import { Prisma } from "@prisma/client";
import { eventListQuery, eventUpdateSchema } from "../schemas/eventSchema";

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

function normalizeDate(v?: string | Date | null): Date | null | undefined {
    if (v === null) {
        return null
    }
    if (v === undefined) {
        return undefined

    }
    const d = v instanceof Date ? v : new Date(v)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}


export async function listEvents(req: FastifyRequest, reply: FastifyReply) {
    
    try {
        const q = eventListQuery.parse(req.query)

        const fromDate = q.from ? new Date(q.from) : new Date('1900-01-01')
        const toDate = q.to ? new Date(q.to) : new Date('2100-01-01')

        const where = {
            clientId: q.clientId,
            ...(q.type ? { type: q.type } : {}),
            ...(q.frequency ? { frequency: q.frequency } : {}),
            AND: [
                { startDate: { lte: toDate } },
                { OR: [{ endDate: null }, { endDate: { gte: fromDate } }] },
            ],
        }

        const [total, items] = await Promise.all([
            prisma.event.count({ where }),
            prisma.event.findMany({
                where,
                orderBy: {startDate: 'desc'},
                select: eventSelect,
                skip: (q.page - 1) * q.perPage,
                take: q.perPage
            })
        ])

        return reply.send({ page: q.page, perPage: q.perPage, total, items})
    } catch (error: any) {
        if(error?.issues) {
            const erros = error.issues.map((i: any) => ({ field: i.path.join("."), message: i.message}))
            return reply.status(400).send({ error: erros})
        }
        req.log.error(error)
        return reply.status(500).send({ error: "Error listing events"})
    }
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
    try {
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
        
    } catch (error: any) {
        if (error?.issues) {
            const errors = error.issues.map((i: any) => ({ field: i.path.join("."), message: i.message}))
            return reply.status(400).send({ errors: errors })
        }
        if (error?.code === "P2003") {
            return reply.status(400).send({ error: "Invalid clientId" })
        }
        req.log.error(error)
        return reply.status(500).send({ error: "Error creating event" })
    }
}

export async function updateEvent(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { id } = req.params as any
        const body = eventUpdateSchema.parse(req.body)
        
        await prisma.event.update({
            where: { id: Number(id)},
            data: {
                type: body.type,
                amount: body.amount != null ? new Prisma.Decimal(Number(body.amount)) : undefined,
                frequency: body.frequency,
                startDate: body.startDate != null ? normalizeDate(body.startDate)! : undefined,
                endDate: body.endDate === null ? null : (body.endDate != null ? normalizeDate(body.endDate)! : undefined),
                executionDay: body.executionDay,
                executionMonth: body.executionMonth,
                description: body.description, 
            },
            select: eventSelect
        })

        return reply.send(true)

    } catch (error: any) {
        if(error?.issues) {
            const errors = error.issues.map((i: any) => ({ field: i.path.join("."), message: i.message }))
            return reply.status(400).send({ errors })
        }
        if (error?.code === "P2025") {
            return reply.status(404).send({ error: "Event not found" })
        }
        req.log.error(error)
        return reply.status(500).send({ error: "Error creating event" })
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