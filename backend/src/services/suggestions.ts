import { prisma } from '../lib/utils/prisma';

type EventType = "DEPOSIT" | "WITHDRAWAL" | "CONTRIBUTION" | "EXPENSE"
type Frequency = "ONE_TIME" | "MONTHLY" | "YEARLY"

const ymIndex = (year: number, month1to12: number) => year * 12 + (month1to12 - 1)
const indexToYM = (idx: number) => ({ year: Math.floor(idx / 12), month: (idx % 12) + 1 })
const toDate = (d: Date | string) => (d instanceof Date ? d : new Date(d))
const endOfMonth = (y: number, m1: number) => new Date(y, m1, 0)

function monthlyRateFromAnnual(annual: number) {
    return Math.pow(1 + annual, 1 / 12) - 1
}

function monthsBetweenInclusive(start: Date, end: Date) {
    const s = new Date(start.getFullYear(), start.getMonth(), 1)
    const e = new Date(end.getFullYear(), end.getMonth(), 1)
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
}

function signByType(t: EventType) {
    return t === "DEPOSIT" || t === "CONTRIBUTION" ? 1 : -1
}


function occursThisMonth(event: {frequency: Frequency; startDate: Date; endDate?: Date | null; executionMonth?: number | null}, monthIndex: number) {
    const start = ymIndex(event.startDate.getFullYear(), event.startDate.getMonth() + 1)
    const end = event.endDate != null ? ymIndex(event.endDate.getFullYear(), event.endDate.getMonth() + 1) : Number.POSITIVE_INFINITY

    if(monthIndex < start || monthIndex > end) {
        return false
    }

    if(event.frequency === 'ONE_TIME') {
        return monthIndex === start
    }

    if(event.frequency === 'MONTHLY') {
        return true
    }

    const { month } = indexToYM(monthIndex)

    const executionMonth = event.executionMonth ?? event.startDate.getMonth() + 1
    return month === executionMonth

}

async function projectUntilMonth(clientId: number, initialValue: number, startDate: Date, untilYear: number, untilMonth1to12: number, annualRate: number) {
    const r = monthlyRateFromAnnual(annualRate)
    let value = Math.round(initialValue * 100) / 100

    const untilDate = endOfMonth(untilYear, untilMonth1to12)

     const events = await prisma.event.findMany({
        where: {clientId:clientId,
            OR: [
                { endDate: null, startDate: { lte: untilDate } },
                { AND: [{ startDate: { lte: untilDate } }, { endDate: { gte: startDate } }] }
            ]
        },
        orderBy: { startDate: "asc" }
    })

    const m0 = ymIndex(startDate.getFullYear(), startDate.getMonth() + 1)
    const mN = ymIndex(untilYear, untilMonth1to12)

    for (let i = m0; i <= mN; i++) {
        value = Math.round(value * (1 + r) * 100) / 100
        let flow = 0

        for (const ev of events) {
            if(occursThisMonth(ev as any, i)) {
                flow += signByType(ev.type as EventType) * Number(ev.amount)
            }
        }
        value = Math.round((value + flow) * 100) / 100
        if(value < 0 ) {
            value = 0
        }
    }
    return value    
}

function fvAnnuityFactor(rateMonth: number, months: number) {
    
    if(months <= 0) {
        return 0
    }

    if(Math.abs(rateMonth) < 1e-12) {
        return months
    }

    return (Math.pow(1 + rateMonth, months) - 1) / rateMonth
}

function requiredMonthlyToReach(targetFV: number, currentFV: number, rateMonth: number, months: number) {
    const gap = Math.max(0, targetFV - currentFV)

    const factor = fvAnnuityFactor(rateMonth, months)

    if(!Number.isFinite(factor) || factor <= 0) {
        return Infinity
    }

    return gap / factor
}

async function getPlanDistance(clientId: number) {
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

    if(!current || !plan) {
        return null
    }

    const curr = new Map<string, number>(
        current.allocations.map((a:any) => [a.assetClass, Number(a.percent)])
    )
    const tgt = new Map<string, number>(
        plan.allocations.map((a:any) => [a.assetClass, Number(a.percent)])
    )

    const all = new Set([...curr.keys(), ...tgt.keys()])

    const diffs: Array<{ assetClass: string; currentPct: number; targetPct: number; deltaPct: number }> = []

    let aligned = 0

    for (const i of all) {
        const c = curr.get(i) ?? 0
        const t = tgt.get(i) ?? 0
        diffs.push({ assetClass: String(i), currentPct: c, targetPct: t, deltaPct: t - c })
        aligned += Math.min(c, t)
    }

    const alignmentPercent = aligned / 100

    return {
        currentTotal: Number(current.totalValue),
        planTotal: Number(plan.totalValue ?? current.totalValue),
        alignmentPercent: alignmentPercent,
        diffs: diffs.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    }

}

export async function buildSuggestionsForClient(clientId: number, opts: { annualRate?: number; roundStep?: number } = {}) {
    const annualRate = opts.annualRate ?? 0.04
    const roundStep = opts.roundStep ?? 10

    const rMonthly = monthlyRateFromAnnual(annualRate)

    const currentSnap = await prisma.portfolioSnapshot.findFirst({
        where: { clientId: clientId, kind: "CURRENT" },
        orderBy: { asOfDate: "desc" },
        select: { totalValue: true, asOfDate: true }
    })

    if (!currentSnap) {
        return { suggestions: [], meta: { reason: "No CURRENT snapshot" } }
    }

    const startDate = new Date(currentSnap.asOfDate)
    const initialValue = Number(currentSnap.totalValue)
    
    const goals = await prisma.goal.findMany({
        where: { clientId: clientId },
        orderBy: { targetDate: "asc" },
        select: { id: true, name: true, targetValue: true, targetDate: true }
    })

    const suggestions: Array<{type: "CONTRIBUTION" | "REBALANCE" | "LUMP_SUM"; message: string;details?: any;}> = []

    for (const g of goals) {
        const target = Number(g.targetValue)
        const goalDate = new Date(g.targetDate)

        const months = monthsBetweenInclusive(startDate, goalDate)
        
        if (months <= 0) {
            continue
        }

        const projected = await projectUntilMonth(
            clientId,
            initialValue,
            startDate,
            goalDate.getFullYear(),
            goalDate.getMonth() + 1,
            annualRate
        )

        const needed = requiredMonthlyToReach(target, projected, rMonthly, months)

        if (!Number.isFinite(needed) || needed <= 0.5) {
            suggestions.push({
                type: "CONTRIBUTION",
                message: `Meta "${g.name}": projeção atual já atinge o alvo. Nenhum aporte extra necessário.`,
                details: { target, projected, months }
            })
            continue
        }

        const rounded = Math.ceil(needed / roundStep) * roundStep

        suggestions.push({
            type: "CONTRIBUTION",
            message: `Aumente contribuição em R$ ${rounded.toLocaleString("pt-BR")} por ${months} meses para atingir "${g.name}" até ${goalDate.getFullYear()}.`,
            details: {
                goalId: g.id,
                target,
                months,
                currentProjectionAtGoal: projected,
                requiredMonthlyExtra: needed,
                suggestedMonthlyExtra: rounded,
                annualRate
            }
        })
    }

    const dist = await getPlanDistance(clientId)
    
    if (dist && dist.alignmentPercent < 0.9) {
        const top = dist.diffs.slice(0, 2)
        const tips = top.map((d) =>
            d.deltaPct > 0
            ? `aumentar ${d.assetClass} em ${d.deltaPct.toFixed(1)} pp`
            : `reduzir ${d.assetClass} em ${Math.abs(d.deltaPct).toFixed(1)} pp`
        )
        .join(" e ")

        suggestions.push({
            type: "REBALANCE",
            message: `Rebalancear carteira para aproximar do plano (${(dist.alignmentPercent * 100).toFixed(
                1
            )}% alinhado): sugerido ${tips}.`,
            details: { diffs: dist.diffs, alignmentPercent: dist.alignmentPercent }
        })
    }

    return { 
        suggestions: suggestions,
        meta: { annualRate: annualRate, startDate: startDate, initialValue:initialValue }
    }
}