import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/utils/prisma";
import { buildProjection, buildProjectionWithFlows, getInitialValue } from "../services/projection";
import { simulateWealthCurve, type WealthEvent } from "../logic/simulateWealthCurve";
import { computeYearlyNetFlows } from "../services/eventFlows";
import { projectionParams, projectionQuery } from "../schemas/projectionSchema";

export async function getProjection(req: FastifyRequest, reply: FastifyReply) {
    const { id } = projectionParams.parse(req.params)

    const q = projectionQuery.parse(req.query)

    const rate = q.rate
    const untilYear = q.untilYear
    const initial = await getInitialValue(id, q.initialValue)

    if(!initial) {
        return reply.status(404).send({ error: "No CURRENT snapshot found for client" })
    }
    
  const startYear = Number.isFinite(q.startYear as any)
                    ? Number(q.startYear)
                    : (initial.asOfYear ?? new Date().getUTCFullYear())

    if(startYear > untilYear) {
        return reply.status(400).send({ errors: [{ field: "startYear", message: "startYear must be <= untilYear" }] })
    }

    let series: Array<{year: number; value: number}>

    if(q.includeEvents) {
        if(q.mode === 'monthly') {
            const eventsFromdb = await prisma.event.findMany({
                where: {
                    clientId: id,
                    OR: [
                        { endDate: null, startDate: { lte: new Date(`${untilYear}-12-31`) } },
                        {
                            AND : [
                                { startDate: { lte: new Date(`${untilYear}-12-31`) } },
                                { endDate: { gte: new Date(`${startYear}-01-01`) } },
                            ]
                        }
                    ]
                },
                orderBy: {startDate: 'asc'}
            })

            const events: WealthEvent[] = eventsFromdb.map((e) => ({
                type: e.type as any,
                frequency: e.frequency as any,
                amount: Number(e.amount),
                start: e.startDate,
                end: e.endDate ?? undefined,
                executionMonth: (e as any).executionMonth ?? undefined
            }))

            const initialState = {
                initialValue: Number(initial.initial),
                startYear: startYear,
                untilYear: untilYear,
                startMonth: 1,
                flowTiming: "end" as const,
                clampZero: true,
            }

            const simulate = simulateWealthCurve(initialState, events, rate)
            series = simulate.map((p) => ({ year: p.year, value: p.projectedValue }))
        } else {
            const flows = await computeYearlyNetFlows(id, startYear, untilYear);
            series = buildProjectionWithFlows(Number(initial.initial), rate, startYear, untilYear, flows);
        }
    } else {
        series = buildProjection(Number(initial.initial), rate, startYear, untilYear);
    }

    const lastValue = series.at(-1)?.value ?? Number(initial.initial)
    

    return reply.send({
        clientId: id,
        rate,
        startYear,
        untilYear,
        initialValue: Number(initial.initial),
        points: series.length,
        lastValue,
        series,
    })

}
