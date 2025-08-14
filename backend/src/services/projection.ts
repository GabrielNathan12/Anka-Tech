import { prisma } from '../lib/utils/prisma'

export async function getInitialValue(clientId: number, overrideInitial?: number) {
    if(overrideInitial != null) {
        return { 
            initial: overrideInitial,
            asOfYear: new Date().getUTCFullYear()
        }
    }

    const snap = await prisma.portfolioSnapshot.findFirst({
        where: { clientId, kind: "CURRENT" },
        orderBy: { asOfDate: "desc" },
        select: { totalValue: true, asOfDate: true }
    })

    if(!snap) {
        return null
    }

    return {
        initial: Number(snap.totalValue),
        asOfYear: new Date(snap.asOfDate).getUTCFullYear(),
    }
}

export function buildProjection(initial: number, rate: number, startYear: number, untilYear: number) {
    const series: Array<{year: number, value: number}> = []
    let value = initial
    
    for(let i = startYear; i <= untilYear; i++) {
        value = Number((value * (1 + rate)).toFixed(2))
        series.push({year: i, value: value})
    }

    return series
}

export function buildProjectionWithFlows(initial: number, rate: number, startYear: number, untilYear: number, yearlyFlows: Map<number, number>) {
    const series: Array<{ year: number; value: number }> = []
    let value = initial

    for (let y = startYear; y <= untilYear; y++) {
        value = Number((value * (1 + rate)).toFixed(2))
        const flow = Number((yearlyFlows.get(y) ?? 0).toFixed(2))
        value = Number((value + flow).toFixed(2))
        series.push({ year: y, value })
    }
    
    return series

}
