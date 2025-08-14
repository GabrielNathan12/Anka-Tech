// controllers/simulationsController.ts
import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/utils/prisma";
import { getInitialValue, buildProjection, buildProjectionWithFlows } from "../services/projection";
import { computeYearlyNetFlows } from "../services/eventFlows";
import { simulationParams, simulationCreateBody, simulationListQuery } from "../schemas/simulationSchema";

export async function createSimulation(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { clientId } = simulationParams.parse(req.params)
        const body = simulationCreateBody.parse(req.body)

        const initValue = await getInitialValue(clientId, body.initialValue)

        if (!initValue) {
            return reply.status(404).send({ error: "No CURRENT snapshot found for client" })
        }

        const rate = Number(body.rate)
        const untilYear = Number(body.untilYear)
        const startYear = body.startYear ?? initValue.asOfYear ?? new Date().getUTCFullYear()

        let series: Array<{ year: number; value: number; flow?: number }>

        if (body.includeEvents) {
            const flows = await computeYearlyNetFlows(clientId, startYear, untilYear)
            series = buildProjectionWithFlows(initValue.initial, rate, startYear, untilYear, flows)
        } else {
            series = buildProjection(initValue.initial, rate, startYear, untilYear).map(p => ({ ...p }))
        }

        const created = await prisma.$transaction(async (tx) => {
            const agg = await tx.simulation.aggregate({
                where: { clientId: clientId },
                _max: { version: true },
            })

            const nextVersion = (agg._max.version ?? 0) + 1

            return tx.simulation.create({
                data: {
                    clientId: clientId,
                    name: body.name,
                    version: nextVersion,
                    realRate: new Prisma.Decimal(rate),
                    untilYear,
                    inputs: {
                        startYear,
                        initialValueUsed: initValue.initial,
                        includeEvents: body.includeEvents,
                        source: body.initialValue != null ? "override" : "snapshot",
                        snapshotYear: initValue.asOfYear,
                    },
                    resultSeries: series,
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
                    createdAt: true,
                },
            })
        })

        return reply.code(201).send(created)
    } catch (err: any) {
        if (err?.issues) {
            const errors = err.issues.map((i: any) => ({ field: i.path.join("."), message: i.message }))
            return reply.status(400).send({ errors })
        }
        if (err?.code === "P2002") {
        return reply.status(409).send({ error: "Version conflict, please retry" })
        }
        req.log.error(err)
        return reply.status(500).send({ error: "Error creating simulation" })
    }
}

export async function listSimulations(req: FastifyRequest, reply: FastifyReply) {
    try {
        const { clientId } = simulationParams.parse(req.params)
        const q = simulationListQuery.parse(req.query)

        const [total, items] = await Promise.all([
            prisma.simulation.count({ where: { clientId: clientId } }),
            prisma.simulation.findMany({
                where: { clientId: clientId },
                orderBy: [{ createdAt: "desc" }, { version: "desc" }],
                skip: (q.page - 1) * q.perPage,
                take: q.perPage,
                select: {
                    id: true,
                    clientId: true,
                    name: true,
                    version: true,
                    realRate: true,
                    untilYear: true,
                    inputs: true,
                    resultSeries: q.withSeries,
                    createdAt: true,
                },
            }),
        ])

        return reply.send({ page: q.page, perPage: q.perPage, total, items })
    } catch (err: any) {
        if (err?.issues) {
            const errors = err.issues.map((i: any) => ({ field: i.path.join("."), message: i.message }))
            return reply.status(400).send({ errors })
        }
        req.log.error(err)
        return reply.status(500).send({ error: "Error listing simulations" })
    }
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
            createdAt: true,
        },
    })

    if (!sim) {
        return reply.status(404).send({ error: "Simulation not found" })
    }
    return reply.send(sim)
}
