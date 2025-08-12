import { prisma } from "../lib/utils/prisma";

type Event = {
    id: number
    clientId: number
    type: "DEPOSIT" | "CONTRIBUTION" | "WITHDRAWAL" | "EXPENSE" | "REBALANCE"
    frequency: "ONE_TIME" | "MONTHLY" | "YEARLY"
    amount: number
    startDate: Date
    endDate?: Date | null
}

function signByType(t: Event["type"]) {
    return t === "DEPOSIT" || t === "CONTRIBUTION" ? 1 : -1
}

function monthsBetweenInclusive(start: Date, end: Date) {
    const s = new Date(start.getFullYear(), start.getMonth(), 1)
    const e = new Date(end.getFullYear(), end.getMonth(), 1)
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1
}

function monthsOfEventInYear(ev: Event, year: number): number {
    const yearStart = new Date(year, 0, 1)
    const yearEnd = new Date(year, 11, 31)

    const start = ev.startDate > yearStart ? ev.startDate : yearStart
    const end = ev.endDate ? (ev.endDate < yearEnd ? ev.endDate : yearEnd) : yearEnd

    if (end < start) {
        return 0
    }
    return monthsBetweenInclusive(start, end)

}

export async function computeYearlyNetFlows(clientId: number, startYear: number, untilYear: number) {
    const events = await prisma.event.findMany({
        where: { clientId },
        orderBy: { startDate: "asc" }
    })

    const flows = new Map<number, number>()

    for (let y = startYear; y <= untilYear; y++) {
        flows.set(y, 0)
    }

    for (const ev of events) {
        const sgn = signByType(ev.type)
        const amount = Number(ev.amount)

        for (let y = startYear; y <= untilYear; y++) {
            switch (ev.frequency) {
                case "ONE_TIME": {
                    if (ev.startDate.getFullYear() === y) {
                        flows.set(y, (flows.get(y) ?? 0) + sgn * amount)
                    }
                    break
                }
                case "MONTHLY": {
                    const months = monthsOfEventInYear(ev as any, y)
                    
                    if (months > 0) {
                        flows.set(y, (flows.get(y) ?? 0) + sgn * amount * months)
                    }

                    break
                }
                case "YEARLY": {
                    const startY = ev.startDate.getFullYear()
                    const endY = (ev.endDate ?? new Date("3000-01-01")).getFullYear()
                    
                    if (y >= startY && y <= endY) {
                        flows.set(y, (flows.get(y) ?? 0) + sgn * amount)
                    }
                    break
                }
            }
        }
    }
    return flows
}
