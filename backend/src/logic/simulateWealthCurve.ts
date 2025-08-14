export type Frequency =  "ONE_TIME" | "MONTHLY" | "YEARLY"
export type EventType = "DEPOSIT" | "WITHDRAWAL" | "CONTRIBUTION" | "EXPENSE"

export type WealthEvent  =  {
    type: EventType
    frequency: Frequency
    amount: number
    start: Date | string
    end?: Date | string
    executionMonth?: number
}

export type InitialState = {
    initialValue: number
    startYear: number
    untilYear: number
    startMonth?: number
    flowTiming?: 'start' | 'end'
    clampZero?: boolean
}

export type YearPoint = {year: number; projectedValue: number}

const round2 = (x: number) => Math.round(x * 100) / 100

const ymIndex = (year: number, month: number) => year * 12 + (month -1)

const indexToYM = (index: number) => {
    const year = Math.floor(index / 12)
    const month = (index % 12) + 1
    return {year: year, month: month}
}

function toDate(date: Date |  string) {
    return date instanceof Date ? date : new Date(date)
}

function monthlyRateFromAnnual(annual: number) {
    return Math.pow(1 + annual, 1 / 12) -1
}

function signByType(event: EventType) {
    return event === 'DEPOSIT' || event === 'CONTRIBUTION' ? 1 : -1
}


function occursThisMonth(event: WealthEvent, monthIdx: number) {
    const start = ymIndex(toDate(event.start).getFullYear(), toDate(event.start).getMonth() + 1)
    const end = event.end ? ymIndex(toDate(event.end).getFullYear(), toDate(event.end).getMonth() + 1) : Number.POSITIVE_INFINITY

    if(monthIdx < start || monthIdx > end) {
        return false
    }

    if(event.frequency === 'ONE_TIME') {
        return monthIdx === start
    }

    if(event.frequency === 'MONTHLY') {
        return true
    }

    const { month } = indexToYM(monthIdx)
    const execMonth = event.executionMonth ?? (toDate(event.start).getMonth() + 1)

    return month === execMonth 
}

/**
* Simula a curva patrimonial com capitalização mensal + eventos.
* @param initialState estado inicial e opções
* @param events lista de movimentações
* @param annualRate taxa anual real (ex.: 0.04 = 4% a.a.)
* @returns pontos anuais [{ year, projectedValue }]
*/

export function simulateWealthCurve(initialState: InitialState, events: WealthEvent[], annualRate: number) {
    const startMonth = initialState.startMonth ?? 1
    const flowTiming = initialState.flowTiming ?? 'end'
    const clampZero = initialState.clampZero ?? false

    if (initialState.untilYear < initialState.startYear) {
        throw new Error("untilYear must be >= startYear")
    }

    if (startMonth < 1 || startMonth > 12) {
        throw new Error("startMonth must be in 1..12")
    }

    const m0 = ymIndex(initialState.startYear, startMonth)

    const mN = ymIndex(initialState.untilYear, 12)

    const r = monthlyRateFromAnnual(annualRate)

    let value = round2(initialState.initialValue)

    const annualPoinys = []

    for (let i = m0; i <= mN; i++) {
        let monthFlow = 0

        for(const ev of events) {
            if(occursThisMonth(ev, i)) {
                monthFlow += signByType(ev.type) * ev.amount
            }
        }

        monthFlow = round2(monthFlow)

        if(flowTiming === 'start') {
            if(clampZero && value < 0) {
                value = 0
            }
            value = round2(value * (1 + r))
        } else {
            value = round2(value * (1 + r))
            value = round2(value + monthFlow)

            if(clampZero && value < 0) {
                value = 0
            }
        }

        const {year, month} = indexToYM(i)

        if(month === 12) {
            annualPoinys.push({ year: year, projectedValue: value})
        }
    }

    return annualPoinys
}