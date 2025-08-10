import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from '../lib/utils/prisma'
import { Prisma } from "@prisma/client";
import { recalculateAligment } from "../services/alignment";

export async function createPortfolioSnapshot(req: FastifyRequest, reply: FastifyReply) {
    const body = req.body as any
    
    const snapshot = await prisma.$transaction(async (tx) => {
        const snap = await tx.portfolioSnapshot.create({
            data: {
                clientId: body.clientId,
                kind: body.kind,
                asOfDate: body.asOfDate ?? new Date(),
                totalValue: new Prisma.Decimal(body.totalValue)
            }
        })
        await tx.walletAllocation.createMany({
            data: body.allocations.map((a: any) => ({
                snapshotId: snap.id,
                assetClass: a.assetClass,
                percent: new Prisma.Decimal(a.percent)
            }))
        })
        return snap
    })

    const align = await recalculateAligment(Number(body.clientId))

    return reply.code(201).send({ snapshotId: snapshot.id, alignment: align  })
    
}

export async function listPortfolios(req: FastifyRequest, reply: FastifyReply) {
    const { clientId, kind } = req.query as any

    const items = await prisma.portfolioSnapshot.findMany({
        where: { clientId: Number(clientId), ...(kind ? { kind } : {})},
        orderBy: [{ asOfDate: "desc" }, { id: "desc" }],
        include: { allocations: true }
    })

    return reply.send({ items })
} 