export type ImportJobState = {
    id: string
    type: "clients-csv"
    status: "pending" | "running" | "done" | "error"
    createdAt: Date
    startedAt?: Date
    finishedAt?: Date
    stats: {
        processed: number
        ok: number
        errors: number
        totalRows?: number
    }
    errorMessage?: string
}

export const jobs = new Map<string, ImportJobState>()

export function newJob(id: string): ImportJobState {
    const state: ImportJobState = {
        id:id,
        type: "clients-csv",
        status: "pending",
        createdAt: new Date(),
        stats: { processed: 0, ok: 0, errors: 0 }
    }

    jobs.set(id, state)
    return state
}

export function getJob(id: string) {
    return jobs.get(id)
}

export function updateJob(id: string, patch: Partial<ImportJobState>) {
    const curr = jobs.get(id)

    if (!curr) {
        return
    }
    const next = { ...curr, ...patch, stats: { ...curr.stats, ...(patch.stats ?? {}) } }
    jobs.set(id, next)
}
