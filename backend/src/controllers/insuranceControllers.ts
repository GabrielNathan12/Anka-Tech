import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/utils/prisma";
import { Prisma } from "@prisma/client";

const insuranceSelect = {
    id: true,
    clientId: true,
    type: true,
    coverage: true,
    premium: true,
    provider: true,
    startDate: true,
    endDate: true,
    status: true,
    notes: true,
    createdAt: true,
    updatedAt: true
}

export async function listInsurances(req: FastifyRequest, reply: FastifyReply) {
    const { clientId } = req.params as any
    const { page = 1, perPage = 20, type, status } = (req.query as any) ?? {}

    const where = {
        clientId: Number(clientId),
        ...(type ? { type } : {}),
        ...(status ? { status } : {})
    }

    const [total, items] = await Promise.all([
        prisma.insurance.count({ where }),
        prisma.insurance.findMany({
            where: where,
            orderBy: { createdAt: "desc" },
            select: insuranceSelect,
            skip: (page - 1) * perPage,
            take: perPage
        })
    ])

    return reply.send({ page, perPage, total, items })
}

export async function getInsuranceById(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any

    const item = await prisma.insurance.findUnique({
        where: { id: Number(id) },
        select: insuranceSelect
    })

    if (!item) {
        return reply.status(404).send({ error: "Insurance not found" })
    }

    return reply.send(item)
}

export async function createInsurance(req: FastifyRequest, reply: FastifyReply) {
    const { clientId } = req.params as any
    const body = req.body as any

    await prisma.insurance.create({
        data: {
            clientId: Number(clientId),
            type: body.type,
            coverage: new Prisma.Decimal(body.coverage),
            premium: body.premium != null ? new Prisma.Decimal(body.premium) : undefined,
            provider: body.provider,
            startDate: body.startDate,
            endDate: body.endDate,
            status: body.status ?? "ACTIVE",
            notes: body.notes
        },
        select: insuranceSelect
    })

    return reply.code(201).send(true)
}

export async function updateInsurance(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any
    const body = req.body as any

    try {
        await prisma.insurance.update({
            where: { id: Number(id) },
            data: {
                type: body.type,
                coverage: body.coverage != null ? new Prisma.Decimal(body.coverage) : undefined,
                premium: body.premium != null ? new Prisma.Decimal(body.premium) : undefined,
                provider: body.provider,
                startDate: body.startDate,
                endDate: body.endDate,
                status: body.status,
                notes: body.notes
            },
            select: insuranceSelect
        })

    return reply.send(true);
    
    } catch (err: any) {
        if (err?.code === "P2025") {
            return reply.status(404).send({ error: "Insurance not found" })
        }
        req.log.error(err)
        return reply.status(500).send({ error: "Error updating insurance" })
    }
}

export async function deleteInsurance(req: FastifyRequest, reply: FastifyReply) {
    const { id } = req.params as any

    try {
        await prisma.insurance.delete({ where: { id: Number(id) } })
        return reply.code(204).send()
    } catch (err: any) {
        if (err?.code === "P2025") {
            return reply.status(404).send({ error: "Insurance not found" })
        }
        req.log.error(err)
        return reply.status(500).send({ error: "Error deleting insurance" })
    }
}

export async function getInsuranceDistribution(req: FastifyRequest, reply: FastifyReply) {
    const { clientId } = req.params as any

    const items = await prisma.insurance.findMany({
        where: { clientId: Number(clientId), status: "ACTIVE" },
        select: { type: true, coverage: true, premium: true }
    })

    const agg = {
        totalCoverage: 0,
        totalPremium: 0,
        LIFE: { coverage: 0, premium: 0, policies: 0 },
        DISABILITY: { coverage: 0, premium: 0, policies: 0 }
    }

    for (const it of items) {
        const t = it.type as "LIFE" | "DISABILITY";
        const cov = Number(it.coverage);
        const pre = it.premium != null ? Number(it.premium) : 0;

        agg[t].coverage += cov;
        agg[t].premium += pre;
        agg[t].policies += 1;

        agg.totalCoverage += cov;
        agg.totalPremium += pre;
    }

    const byType = (["LIFE", "DISABILITY"] as const).map((t) => {
        const coverage = agg[t].coverage
        const premium = agg[t].premium
        const coveragePct = agg.totalCoverage > 0 ? coverage / agg.totalCoverage : 0
        const premiumPct = agg.totalPremium > 0 ? premium / agg.totalPremium : 0
        
        return {
            type: t,
            policies: agg[t].policies,
            coverage: coverage,
            coveragePct: coveragePct,
            premium: premium,
            premiumPct: premiumPct
        }
    })

    return reply.send({
        clientId: Number(clientId),
        totalCoverage: agg.totalCoverage,
        totalPremium: agg.totalPremium,
        byType
    })
}
