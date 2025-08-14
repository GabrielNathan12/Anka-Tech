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
            where: { id: clientId },
            data: { alignmentPercent: null, alignmentCategory: null }
        })

        return { percent: null, category: null, alignedValue: null }
    }

    // const currentMap = new Map(current.allocations.map(a => [a.assetClass, Number(a.percent)]))
    // const planMap = new Map(plan.allocations.map(a => [a.assetClass, Number(a.percent)]))

    // const allClasses = new Set([...currentMap.keys(), ...planMap.keys()])

    // let alignedPercent = 0

    // for (const data of allClasses) {
    //     const currentPerc = currentMap.get(data) ?? 0
    //     const planPerc = planMap.get(data) ?? 0

    //     alignedPercent += Math.min(Number(currentPerc), Number(planPerc));

    // }

    const currentTotal = Number(current.totalValue)
    const planTotal = Number(plan.totalValue)

    const percent = planTotal / currentTotal
    const category = categorizeAlignment(percent)
    const alignedValue = percent * currentTotal

    // alignedPercent = alignedPercent / 100

    // const alignedValue = alignedPercent * Number(current.totalValue)


    await prisma.client.update({
        where: {id: clientId},
        data: {
            alignmentPercent: new Prisma.Decimal(percent),
            alignmentCategory: category
        }
    })

    return {
            percent: percent,
            category: category, 
            alignedValue: alignedValue
        }
}

export async function safeRecalculate(clientId: number) {
    try {
        return await recalculateAligment(clientId)
    } catch {
        return { percent: null, category: null, alignedValue: null }
    }
}