import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from '../lib/utils/prisma';
import { recalculateAligment } from "../services/alignment";

export async function getClientAlignment(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any

    const align = await recalculateAligment(Number(id))

    const client = await prisma.client.findUnique({
        where: { id: Number(id)},
        select: { alignmentPercent: true, alignmentCategory: true }
    })

    return reply.send({
        alignmentPercent: client?.alignmentPercent,
        alignmentCategory: client?.alignmentCategory,
        alignedValue: align.alignedValue
    })
}