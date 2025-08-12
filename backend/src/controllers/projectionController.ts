import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/utils/prisma";
import { buildProjection, buildProjectionWithFlows, getInitialValue } from "../services/projection";
import { simulateWealthCurve, type WealthEvent } from "../logic/simulateWealthCurve";
import { computeYearlyNetFlows } from "../services/eventFlows";

export async function getProjection(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any
    const q = (req.query as any) ?? {}

    const rate = q.rate
    const untilYear = q.untilYear
    const includeEvents: boolean = q.includeEvents
    const projectionWhithFlows = q.projectionWhithFlows

    const initial = await getInitialValue(Number(id), q.initialValue)
    
    if (!initial) {
        return reply.status(404).send({ error: "No CURRENT snapshot found for client" })
    }

    const startYear: number = q.startYear != null ? q.startYear : (initial.asOfYear || new Date().getFullYear())

    if (startYear > untilYear) {
        return reply.status(400).send({
            errors: [{ field: "startYear", message: "startYear must be <= untilYear" }]
        })
    }

    let series: Array<{ year: number; value: number }>

    if (includeEvents) {
        const eventsFromDb = await prisma.event.findMany({
            where: {
                clientId: Number(id),
                OR: [
                    { endDate: null, startDate: { lte: new Date(`${untilYear}-12-31`) } },
                {
                    AND: [
                        { startDate: { lte: new Date(`${untilYear}-12-31`) } },
                        { endDate: { gte: new Date(`${startYear}-01-01`) } }
                    ]
                }
            ]
        },
            orderBy: { startDate: "asc" }
        })

        const events: WealthEvent[] = eventsFromDb.map((e) => ({
            type: e.type as any,
            frequency: e.frequency as any,
            amount: Number(e.amount),
            start: e.startDate,
            end: e.endDate ?? undefined,
            executionMonth: e.executionMonth ?? undefined
        }))

        const initialState = {
            initialValue: Number(initial.initial),
            startYear,
            utilYear: untilYear,
            startMonth: 1,
            flowTiming: "end",
            clampZero: true
        } as const

        const sim = simulateWealthCurve(initialState, events, rate)
    
        series = sim.map((p) => ({ year: p.year, value: p.projectedValue }))

    } else if(includeEvents && projectionWhithFlows) {
        const flows = await computeYearlyNetFlows(Number(id), startYear, untilYear)
        series = buildProjectionWithFlows(initial.initial, rate, startYear, untilYear, flows)
    }
    else {
        series = buildProjection(Number(initial.initial), rate, startYear, untilYear)
    }

    const lastValue = series.at(-1)?.value ?? Number(initial.initial)

    return reply.send({
        clientId: Number(id),
        rate,
        startYear,
        untilYear,
        initialValue: Number(initial.initial),
        lastValue,
        points: series.length,
        series
    })
}
