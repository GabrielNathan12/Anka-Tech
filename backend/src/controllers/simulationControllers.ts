import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/utils/prisma";
import { getInitialValue } from "../services/projection";
import { buildProjection, buildProjectionWithFlows } from "../services/projection";
import { computeYearlyNetFlows } from "../services/eventFlows";

export async function createSimulation(req: FastifyRequest, reply: FastifyReply) {
    const { clientId } = req.params as any
    const body = req.body as any

    const iv = await getInitialValue(Number(clientId), body.initialValue)

    if (!iv) {
        return reply.status(404).send({ error: "No CURRENT snapshot found for client" })
    }

    const rate = Number(body.rate ?? 0.04)
    const untilYear = Number(body.untilYear ?? 2060)
    const startYear = body.startYear != null ? Number(body.startYear) : (iv.asOfYear || new Date().getFullYear())

    if (startYear > untilYear) {
        return reply.status(400).send({ errors: [{ field: "startYear", message: "startYear must be <= untilYear" }] })
    }

    let series: Array<{ year: number; value: number; flow?: number }>

    if (body.includeEvents === undefined || body.includeEvents === true) {
        const flows = await computeYearlyNetFlows(Number(clientId), startYear, untilYear)
        series = buildProjectionWithFlows(iv.initial, rate, startYear, untilYear, flows)
    } else {
        series = buildProjection(iv.initial, rate, startYear, untilYear).map(p => ({ ...p }))
    }

    const agg = await prisma.simulation.aggregate({
        where: { clientId: Number(clientId) },
        _max: { version: true }
    })

    const nextVersion = (agg._max.version ?? 0) + 1

    await prisma.simulation.create({
        data: {
            clientId: Number(clientId),
            name: body.name,
            version: nextVersion,
            realRate: new Prisma.Decimal(rate),
            untilYear,
            inputs: {
                startYear,
                initialValueUsed: iv.initial,
                includeEvents: body.includeEvents !== false,
                source: body.initialValue != null ? "override" : "snapshot",
                snapshotYear: iv.asOfYear
            },
            resultSeries: series
        },
        select: {
            id: true,
            clientId: true,
            name: true,
            version: true,
            realRate: true,
            untilYear: true,
            inputs: true,
            resultSeries: true,
            createdAt: true
        }
    })

    return reply.code(201).send(true)
}

export async function listSimulations(req: FastifyRequest, reply: FastifyReply) {
    const { clientId } = req.params as any
    const { page = 1, perPage = 20, withSeries = false } = (req.query as any) ?? {}

    const [total, items] = await Promise.all([
        prisma.simulation.count({ where: { clientId: Number(clientId) } }),
        prisma.simulation.findMany({
            where: { clientId: Number(clientId) },
            orderBy: [{ createdAt: "desc" }, { version: "desc" }],
            skip: (page - 1) * perPage,
            take: perPage,
            select: {
                id: true,
                clientId: true,
                name: true,
                version: true,
                realRate: true,
                untilYear: true,
                inputs: true,
                resultSeries: withSeries,
                createdAt: true
            }
        })
    ])

    return reply.send({ page, perPage, total, items })
}

export async function getSimulationById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any

    const sim = await prisma.simulation.findUnique({
        where: { id: Number(id) },
        select: {
            id: true,
            clientId: true,
            name: true,
            version: true,
            realRate: true,
            untilYear: true,
            inputs: true,
            resultSeries: true,
            createdAt: true
        }
    })

    if (!sim){
        return reply.status(404).send({ error: "Simulation not found" })
    }
  
    return reply.send(sim)
}
