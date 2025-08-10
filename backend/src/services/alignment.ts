import { prisma } from "../lib/utils/prisma"
import { Prisma } from "@prisma/client"

export function categorizeAlignment(p: number) {
    if(p > 0.90) {
        return 'GREEN'
    }

    if(p >= 0.70 && p <= 0.90) {
        return 'YELLOW_LIGHT'
    }

    if(p >= 0.50 && p < 0.70) {
        return 'YELLOW_DARK'
    }

    return 'RED'
}

export async function recalculateAligment(clientId:number) {
    const [current, plan] = await Promise.all([
        prisma.portfolioSnapshot.findFirst({
            where: { clientId, kind: "CURRENT" },
            orderBy: { asOfDate: "desc" },
            include: { allocations: true }
        }),
        prisma.portfolioSnapshot.findFirst({
            where: { clientId, kind: "PLAN" },
            orderBy: { asOfDate: "desc" },
            include: { allocations: true }
        })
    ])

    if(!current || !plan || Number(current.totalValue) <= 0) {
        await prisma.client.update({
            where: {id: clientId},
            data: { alignmentPercent: null, alignmentCategory: null }
        })

        return { percent: null, category: null, alignedValue: null }
    }

    const currentMap = new Map(current.allocations.map(a => [a.assetClass, Number(a.percent)]))
    const planMap = new Map(plan.allocations.map(a => [a.assetClass, Number(a.percent)]))

    const allClasses = new Set([...currentMap.keys(), ...planMap.keys()])

    let alignedPercent = 0

    for (const data of allClasses) {
        const currentPerc = currentMap.get(data) ?? 0
        const planPerc = planMap.get(data) ?? 0

        alignedPercent += Math.min(Number(currentPerc), Number(planPerc));

    }

    alignedPercent = alignedPercent / 100

    const alignedValue = alignedPercent * Number(current.totalValue)

    const category = categorizeAlignment(alignedPercent)

    await prisma.client.update({
        where: {id: clientId},
        data: {
            alignmentPercent: new Prisma.Decimal(alignedPercent),
            alignmentCategory: category
        }
    })

    return {
            percent: alignedPercent,
            category: category, 
            alignedValue: alignedValue
        }
}