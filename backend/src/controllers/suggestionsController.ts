import type { FastifyReply, FastifyRequest } from "fastify";
import { buildSuggestionsForClient } from "../services/suggestions";

export async function getSuggestions(req: FastifyRequest, reply: FastifyReply) {
    const { clientId } = req.params as any
    const { rate, roundStep } = (req.query as any) ?? {}

    const out = await buildSuggestionsForClient(Number(clientId), {
        annualRate: Number(rate ?? 0.04),
        roundStep: Number(roundStep ?? 10)
    })

    return reply.send(out)
}
