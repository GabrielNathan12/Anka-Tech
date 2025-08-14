import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from '../lib/utils/prisma'
import { Prisma } from "@prisma/client";
import { safeRecalculate } from "../services/alignment";
import { portfolioCreateSchema } from "../schemas/portfolioSchema";


function normalizeDate(date?: string) {
    if(!date) {
        const today = new Date()
        return new Date(today.getFullYear(), today.getMonth(), today.getDate())
    }
    const dt = new Date(date)
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

export async function createPortfolioSnapshot(req: FastifyRequest, reply: FastifyReply) {
    
    try {
        const body = portfolioCreateSchema.parse(req.body)
        const asOfDate = normalizeDate(body.asOfDate)

        const existsPortfolio = await prisma.portfolioSnapshot.findUnique({
            where: { clientId_kind_asOfDate: { clientId: body.clientId, kind: body.kind, asOfDate: asOfDate } },
        })

        if(existsPortfolio) {
            const alignment = await safeRecalculate(body.clientId)
            return reply.code(200).send({ snapshotId: existsPortfolio.id, alignment })
        }

        const snapshot = await prisma.$transaction(async (tx) => {
            const snap = await tx.portfolioSnapshot.create({
                data: {
                    clientId: body.clientId,
                    kind: body.kind,
                    asOfDate: asOfDate,
                    totalValue: new Prisma.Decimal(body.totalValue)
                }
            })

            await tx.walletAllocation.createMany({
                data: body.allocations.map((a) => ({
                    snapshotId: snap.id,
                    assetClass: a.assetClass,
                    percent: new Prisma.Decimal(a.percent),
                }))
            })
            return snap
        })

        const alignment = await safeRecalculate(body.clientId)
        return reply.code(201).send({ snapshotId: snapshot.id, alignment })
    } catch (error: any) {

        if(error?.code === "P2002") {
            const body = req.body as any
    
            const asOfDate = normalizeDate(body.asOfDate)
            const existsPortfolio = await prisma.portfolioSnapshot.findUnique({
                where: { clientId_kind_asOfDate: { clientId: body.clientId, kind: body.kind, asOfDate } },
            })
    
            if(existsPortfolio) {
                return reply.code(200).send({ snapshotId: existsPortfolio.id, alignment: await safeRecalculate(body.clientId) })
            }
            return reply.status(409).send({ error: "Snapshot already exists" })
        }

        if(error?.issues) {
            const erros = error.issues.map((i: any) => ({ field: i.path.join("."), message: i.message}))
            return reply.status(400).send({ erros })
        }
        req.log.error(error)

        return reply.status(500).send({ error: "Internal error creating portfolio snapshot" })
    }
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