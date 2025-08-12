import type { FastifyInstance } from "fastify";
import { clientCreateSchema, clientIdParams, clientUpdateSchema, listQuery } from "../../schemas/clientSchema";
import { createClient, deleteClient, getClientById, getClients, updateClient } from '../../controllers/clientControllers'
import { validateBody, validateParams, validateQuery  } from "../../plugins/validate";
import type { MultipartFile } from "@fastify/multipart";
import multipart from "@fastify/multipart";
import sse  from "fastify-sse-v2";
import { randomUUID } from "node:crypto";
import { sseHub } from "../../services/sseHub";
import { newJob, getJob } from "../../services/jobStore";
import { importClientsCSV } from "../../services/clientCsvImport";

export async function clientesRoutes(app:FastifyInstance) {

    await app.register(multipart)
    await app.register(sse)

    app.get('/clients', 
        {
            schema: {
                tags: ['clients'],
                description: 'List all users',
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateQuery(listQuery),
            preHandler: app.auth.verify
        },

        getClients
    )

    app.get('/clients/:id',
        {
            schema: {
                tags: ['clients'],
                description: 'Find client by id',
                params: clientIdParams,
                security: [{ bearerAuth: [] }] 
            },
                preValidation : validateParams(clientIdParams),
                preHandler: app.auth.verify
            },
            getClientById
        )

    app.post('/clients',
        {
            schema: {
                description: 'Create new user',
                tags: ['clients'],
                body: clientCreateSchema,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateBody(clientCreateSchema),
            preHandler: app.auth.role(['ADVISOR']),
        },
        createClient
    )
    app.delete('/clients/:id',
        {
            schema: {
                tags: ["clients"],
                description: "Delete client",
                params: clientIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(clientIdParams),
            preHandler: app.auth.role(['ADVISOR']),
        },
        deleteClient
    )

    app.put('/clients/:id',  
        {
            schema: {
                tags: ['clients'],
                description: "Update client",
                body: clientUpdateSchema,
                params: clientIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: 
                [
                    validateParams(clientIdParams),
                    validateBody(clientUpdateSchema)
                ],
            preHandler: app.auth.role(['ADVISOR']),
        },
        updateClient
    )

    app.post("/clients/import/init", async (_req, reply) => {
        const jobId = randomUUID()
        newJob(jobId)
        return reply.code(201).send({ jobId })
    })

    app.post("/clients/imports/:jobId/upload", async (req, reply) => {
        const { jobId } = req.params as any

        const job = getJob(jobId)

        if (!job) {
            return reply.status(404).send({ error: "Job not found" })
        }

        const file = (await req.file()) as MultipartFile | undefined
        
        if (!file) {
            return reply.status(400).send({ error: "Missing file" })
        }
        if (!/text\/csv|application\/vnd\.ms-excel/.test(file.mimetype)) {
            return reply.status(400).send({ error: "Invalid mimetype, expected CSV" })
        }

        (async () => {
            try {
                await importClientsCSV(jobId, file.file, req.log);
            } catch (e) {
                req.log.error(e)
            } finally {
                file.file.resume()
            }
        })()

        return reply.code(202).send({ started: true, jobId });
    })

    app.get("/clients/imports/:jobId/stream", async (req, reply) => {
        const { jobId } = req.params as any
        const job = getJob(jobId)

        if (!job) return reply.status(404).send({ error: "Job not found" })
        
        const unsubscribe = sseHub.subscribe(jobId, (payload) => {
            reply.sse({
                id: String(Date.now()),
                event: payload.event,
                data: JSON.stringify(payload.data)
            })
        })

        const hb = setInterval(() => {
            reply.sse({ event: "heartbeat", data: JSON.stringify({ t: Date.now() }) })
        }, 15000)

        req.raw.on("close", () => {
            clearInterval(hb)
            unsubscribe()
        })

        reply.sse({ event: "log", data: JSON.stringify({ message: "SSE connected" }) })
    })
}