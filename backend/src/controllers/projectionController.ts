import type { FastifyReply, FastifyRequest } from "fastify";
import { buildProjection, buildProjectionWithFlows, getInitialValue } from "../services/projection";
import { computeYearlyNetFlows } from "../services/eventFlows";

export async function getProjection(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any
    const q = (req.query as any) ?? {}

    const rate = q.rate != null ? Number(q.rate) : 0.04
    const untilYear = q.untilYear != null ? Number(q.untilYear) : 2060

    const initial = await getInitialValue(Number(id), q.initialValue)
    
    if (!initial){ 
        return reply.status(404).send({ error: "No CURRENT snapshot found for client" })
    }

    const startYear = q.startYear != null ? Number(q.startYear) : (initial.asOfYear || new Date().getFullYear())
    
    if (startYear > untilYear) {
        return reply.status(400).send({ errors: [{ field: "startYear", message: "startYear must be <= untilYear" }] })
    }

    let series

    if (q.includeEvents === undefined || String(q.includeEvents) === "true") {
        const flows = await computeYearlyNetFlows(Number(id), startYear, untilYear)
        series = buildProjectionWithFlows(initial.initial, rate, startYear, untilYear, flows)
    } else {
        series = buildProjection(initial.initial, rate, startYear, untilYear)
    }

    const lastValue = series.at(-1)?.value ?? initial.initial

    return reply.send({
        clientId: Number(id),
        rate,
        startYear,
        untilYear,
        initialValue: initial.initial,
        points: series.length,
        lastValue,
        series
    })
}