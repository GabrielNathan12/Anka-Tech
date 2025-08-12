import type { FastifyBaseLogger } from "fastify";
import { parse } from "@fast-csv/parse";
import { importClientRow, type ImportClientRow } from "../schemas/importClientRow";
import { sseHub } from "./sseHub";
import { getJob, updateJob } from "./jobStore";
import { prisma } from "../lib/utils/prisma";

const toStatusEnum = (b?: boolean) => b ? "ACTIVE" : "INACTIVE";

export async function importClientsCSV(jobId: string, fileStream: NodeJS.ReadableStream, logger: FastifyBaseLogger, opts?: { hasHeader?: boolean }) {
    const job = getJob(jobId)
    
    if (!job) {
        throw new Error("Job not found")
    }

    updateJob(jobId, { status: "running", startedAt: new Date() })
    sseHub.publish(jobId, { event: "start", data: {} })

    const started = Date.now()

    return new Promise<void>((resolve, reject) => {
        const parser = parse<ImportClientRow, ImportClientRow>({
            headers: true,
            ignoreEmpty: true,
            trim: true
        })

        let rowIdx = 0

        parser.on("error", (err) => {
            logger.error(err, "CSV parse error")
            updateJob(jobId, { status: "error", finishedAt: new Date(), errorMessage: err.message })
            sseHub.publish(jobId, { event: "error", data: { message: err.message } })
            reject(err)
        })

        parser.on("data", async (raw: any) => {
            rowIdx++
            parser.pause()

            try {
                const row = importClientRow.parse(raw)

                await prisma.client.upsert({
                    where: { email: row.email },
                    update: {
                        name: row.name,
                        password: row.password,
                        age: row.age,
                        status: { set: toStatusEnum(row.status) },
                        family_perfil: row.family_perfil
                    },
                    create: {
                        name: row.name,
                        email: row.email,
                        password: row.password,
                        age: row.age,
                        status: toStatusEnum(row.status),
                        family_perfil: row.family_perfil
                    }
                })

                const stats = { processed: rowIdx, ok: (getJob(jobId)?.stats.ok ?? 0) + 1, errors: getJob(jobId)?.stats.errors ?? 0 }
                updateJob(jobId, { stats })
                sseHub.publish(jobId, { event: "progress", data: { ...stats, last: row.email } })
            } catch (e: any) {
                const errMsg = e?.message ?? "Invalid row"
                const stats = { processed: rowIdx, ok: getJob(jobId)?.stats.ok ?? 0, errors: (getJob(jobId)?.stats.errors ?? 0) + 1 }
                updateJob(jobId, { stats })
                sseHub.publish(jobId, { event: "log", data: { message: `Row ${rowIdx} error: ${errMsg}` } })
                sseHub.publish(jobId, { event: "progress", data: { ...stats } })
            } finally {
                parser.resume()
            }
        })

        parser.on("end", async () => {
            const job = getJob(jobId)
            const finished = Date.now()
            updateJob(jobId, { status: "done", finishedAt: new Date() })
            sseHub.publish(jobId, {
                event: "done",
                data: {
                    processed: job?.stats.processed ?? 0,
                    ok: job?.stats.ok ?? 0,
                    errors: job?.stats.errors ?? 0,
                    durationMs: finished - started
                }
            })
            resolve()
        })

        fileStream.pipe(parser)
    })
}
