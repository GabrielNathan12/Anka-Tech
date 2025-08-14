import request from "supertest";
import { getTestApp, closeTestApp } from "../__helpers__/testApp";
import { prisma,loginToken, seedClientMinimal, resetDb, createUser, createSimpleClient } from "../__helpers__/db";
import { expect, it, afterAll , beforeAll, describe} from '@jest/globals';

let advisorToken = ""
let viewerToken = ""

beforeAll(async () => {
    await resetDb()

    const app = await getTestApp()
    await createUser("advisor@example.com", "ADVISOR", "123456")
    await createUser("viewer@example.com", "VIEWER", "123456")
    
    advisorToken = await loginToken(app, "advisor@example.com", "123456")
    viewerToken  = await loginToken(app, "viewer@example.com", "123456")

})

afterAll(async () => {
    await prisma.$disconnect()
    await closeTestApp()
})


describe("CRUD de monimentações (Event)", () => {
    it('VIEWER consegue listar e consultar, mas não criar/editar/excluir', async() => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'event_client@gmail.com'})
        
        const list = await request(app.server)
                            .get(`/events?clientId=${client.id}`)
                            .set("authorization", `Bearer ${viewerToken}`)


        expect(list.status).toBe(200)

        const createViewer = await request(app.server)
                                .post("/events")
                                .set("authorization", `Bearer ${viewerToken}`)
                                .send({
                                    clientId: client.id,
                                    type: "CONTRIBUTION",
                                    amount: 100,
                                    frequency: "MONTHLY",
                                    startDate: "2025-01-01"
                                })

        expect([401,403]).toContain(createViewer.status)

        const createdAdvisor = await request(app.server)
                                .post("/events")
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({
                                    clientId: client.id,
                                    type: "CONTRIBUTION",
                                    amount: 100,
                                    frequency: "ONE_TIME",
                                    startDate: "2025-02-01",
                                    description: "One-time for viewer test"
                                })

        expect(createdAdvisor.status).toBe(201)

        await prisma.event.deleteMany({ where: {clientId: client.id}})

        const eventAdvisor = await prisma.event.create({
            data: {
                clientId: client.id,
                type: "CONTRIBUTION",
                amount: 100,
                frequency: "ONE_TIME",
                startDate: "2025-02-10T00:00:00.000Z",
                description: "One-time for viewer test"
            }
        })

        const viewEventByid = eventAdvisor.id
        
        const getById = await request(app.server)
                                .get(`/events/${viewEventByid}`)
                                .set("authorization", `Bearer ${viewerToken}`)
        
        expect(getById.status).toBe(200)


        const updDeniedViewer = await request(app.server)
                                .put(`/events/${viewEventByid}`)
                                .set("authorization", `Bearer ${viewerToken}`)
                                .send({ amount: 200 })

        expect([401,403]).toContain(updDeniedViewer.status)

        const delDeniedViewer = await request(app.server)
                                .delete(`/events/${viewEventByid}`)
                                .set("authorization", `Bearer ${viewerToken}`)

        expect([401,403]).toContain(delDeniedViewer.status)
    })

    it("cria evento válido (CONTRIBUTION MONTHLY) 201 e retorna o true", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'event_client_create@gmail.com'})

        const res = await request(app.server)
                            .post("/events")
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                type: "CONTRIBUTION",
                                amount: 250.5,
                                frequency: "MONTHLY",
                                startDate: "2025-01-10",
                                endDate: "2025-12-31",
                                executionDay: 10,
                                description: "Aporte mensal 250.5",
                            })
         expect(res.status).toBe(201)
    })

    it("Falha 400 quando payload é inválido (endDate < startDate)", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'event_client_bad_payload@gmail.com'})

        const bad = await request(app.server)
                            .post("/events")
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                type: "CONTRIBUTION",
                                amount: 100,
                                frequency: "ONE_TIME",
                                startDate: "2025-05-10",
                                endDate: "2025-05-01",
                            })
      expect(bad.status).toBe(400)

      expect(bad.body).toHaveProperty("errors")
    })

    it("Falha 400 quando clientId não existe (FK)", async () => {
        const app = await getTestApp()

        const bad = await request(app.server)
                            .post("/events")
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: 999999,
                                type: "CONTRIBUTION",
                                amount: 100,
                                frequency: "ONE_TIME",
                                startDate: "2025-05-10",
                            })
        expect([400,404]).toContain(bad.status)
    })

    it("LIST (GET /events) com filtros", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'event_client_get@gmail.com'})
        await prisma.event.deleteMany({where: { clientId: client.id }})

        const row1 = await prisma.event.create({
            data: {
                clientId: client.id,
                type: "CONTRIBUTION",
                amount: 100,
                frequency: "MONTHLY",
                startDate: "2025-01-01T00:00:00.000Z", 
                endDate: "2025-03-31T00:00:00.000Z",
                description: "Mensal 1T25",
            }
        })

        await prisma.event.create({
            data: {
                clientId: client.id,
                type: "CONTRIBUTION",
                amount: 100,
                frequency: "MONTHLY",
                startDate: "2025-01-01T00:00:00.000Z",
                endDate: "2025-03-31T00:00:00.000Z",
                description: "Mensal 1T25",
            }
        })

        await prisma.event.create({
            data: {
                clientId: client.id,
                type: "EXPENSE",
                amount: 200,
                frequency: "YEARLY",
                startDate: "2024-01-01T00:00:00.000Z",
                endDate: "2026-12-31T00:00:00.000Z",
                executionMonth: 12,
                description: "Despesa anual",
            }
        })

        const resByClient = await request(app.server)
                            .get(`/events?clientId=${client.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(resByClient.status).toBe(200)
        expect(resByClient.body).toHaveProperty("items")
        expect(Array.isArray(resByClient.body.items)).toBe(true)
        expect(resByClient.body.total).toBeGreaterThanOrEqual(3)
        
        const resByContribuition = await request(app.server)
                                .get(`/events?clientId=${client.id}&type=CONTRIBUTION`)
                                .set("authorization", `Bearer ${advisorToken}`)
        
        expect(resByContribuition.status).toBe(200)

        const hasOnlyContribution = resByContribuition.body.items.every((x: any) => x.type === "CONTRIBUTION")
        expect(hasOnlyContribution).toBe(true)

        const resFrequencyYearly = await request(app.server)
                                    .get(`/events?clientId=${client.id}&frequency=YEARLY`)
                                    .set("authorization", `Bearer ${advisorToken}`)

        expect(resFrequencyYearly.status).toBe(200)
        const hasOnlyYearly = resFrequencyYearly.body.items.every((x: any) => x.frequency === "YEARLY")
        expect(hasOnlyYearly).toBe(true)

        const resByFromTo = await request(app.server)
                                    .get(`/events?clientId=${client.id}&from=2025-01-01&to=2025-03-31`)
                                    .set("authorization", `Bearer ${advisorToken}`)

        expect(resByFromTo.status).toBe(200)
        expect(resByFromTo.body.items.length).toBeGreaterThan(0)

        const to = new Date("2025-03-31")
        const from = new Date("2025-01-01")
        
        const ok = resByFromTo.body.items.every((ev: any) => {
            const s = new Date(ev.startDate)
            const e = ev.endDate ? new Date(ev.endDate) : null
            return s <= to && (e === null || e >= from)
        })

        expect(ok).toBe(true)

        const findById = await request(app.server)
                            .get(`/events/${row1.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(findById.status).toBe(200)
        expect(findById.body.id).toBe(row1.id)

        const notFoundById = await request(app.server)
                                .get(`/events/99999999`)
                                .set("authorization", `Bearer ${advisorToken}`)

        expect(notFoundById.status).toBe(404);
    
    })

    it("UPDATE (PUT /events/:id)", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'event_client_update@gmail.com'})
        await prisma.event.deleteMany({where: { clientId: client.id }})

        const row1 = await prisma.event.create({
            data: {
                clientId: client.id,
                type: "CONTRIBUTION",
                amount: 100,
                frequency: "MONTHLY",
                startDate: "2025-04-01T00:00:00.000Z",
                endDate: "2025-06-30T00:00:00.000Z",
                executionMonth: 12,
                executionDay: 1,
            }
        })

        const res = await request(app.server)
                            .put(`/events/${row1.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                amount: 150.75,
                                executionDay: 5,
                                clientId: client.id + 1
                            })

        expect(res.status).toBe(200)

        const badResponse = await request(app.server)
                                    .put(`/events/${row1.id}`)
                                    .set("authorization", `Bearer ${advisorToken}`)
                                    .send({
                                        startDate: "2025-08-10T00:00:00.000Z",
                                        endDate: "2025-08-01T00:00:00.000Z", 
                                    })
        
        expect(badResponse.status).toBe(400)
        expect(badResponse.body).toHaveProperty("errors")

        const notFound = await request(app.server)
                                .put(`/events/99999999`)
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({ amount: 10 })

        expect(notFound.status).toBe(404)

    })

    it("DELETE (DELETE /events/:id)", async() => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'event_client_delete@gmail.com'})
        
        await prisma.event.deleteMany({where: { clientId: client.id }})

        const row1 = await prisma.event.create({
            data: {
                clientId: client.id,
                type: "WITHDRAWAL",
                amount: 300,
                frequency: "ONE_TIME",
                startDate: "2025-07-01T00:00:00.000Z",
            }
        })

        const ok = await request(app.server)
                            .delete(`/events/${row1.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(ok.status).toBe(204)
        
        const again = await request(app.server)
                            .delete(`/events/${row1.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(again.status).toBe(404)
    })
})

