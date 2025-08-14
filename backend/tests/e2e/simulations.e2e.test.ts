import request from "supertest";
import { getTestApp, closeTestApp } from "../__helpers__/testApp";
import { prisma, loginToken, seedClientMinimal, resetDb, createUser, getClient, createSimpleClient, createSimplePostCurrentSnapshot } from "../__helpers__/db";
import { expect, it, afterAll , beforeAll, describe} from '@jest/globals';


let advisorToken = ""
let viewerToken = ""

beforeAll(async () => {

    await resetDb()

    const app = await getTestApp()

    await createUser("advisor@example.com", "ADVISOR", "123456")
    await createUser("viewer@example.com", "VIEWER", "123456")

    advisorToken = await loginToken(app, "advisor@example.com", "123456")
    viewerToken = await loginToken(app, 'viewer@example.com', '123456')
})

afterAll(async () => {
    await prisma.$disconnect()
    await closeTestApp()
})


describe("Histórico de Simulações", () => {
    it("POST /clients/:id/simulations cria simulação e salva versão correta", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "sim_v1@test.com" })
        await createSimplePostCurrentSnapshot(client.id, "2025-01-01T00:00:00.000Z", 100000)

        const res = await request(app.server)
                            .post(`/clients/${client.id}/simulations`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                name: "Simulação Inicial",
                                rate: 0.05,
                                untilYear: 2027,
                                includeEvents: false,
                            })

        expect(res.status).toBe(201)
    })

    it("POST cria segunda versão automaticamente", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "sim_v2@test.com" })
        await createSimplePostCurrentSnapshot(client.id, "2025-01-01T00:00:00.000Z", 100000)

        await prisma.simulation.create({
            data: {
                clientId: client.id,
                name: "Simulação v1",
                version: 1,
                realRate: 0.04,
                untilYear: 2026,
                inputs: {},
                resultSeries: [],
            },
        })

        const res = await request(app.server)
                            .post(`/clients/${client.id}/simulations`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                name: "Simulação v2",
                                rate: 0.05,
                                untilYear: 2027,
                                includeEvents: false,
                            })

        expect(res.status).toBe(201)
    })

    it("GET /clients/:id/simulations lista simulações", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "sim_list@test.com" })
        await createSimplePostCurrentSnapshot(client.id, "2025-01-01T00:00:00.000Z", 50000)

        await request(app.server)
                .post(`/clients/${client.id}/simulations`)
                .set("authorization", `Bearer ${advisorToken}`)
                .send({ name: "Listar", rate: 0.05, untilYear: 2026 })

        const res = await request(app.server)
                            .get(`/clients/${client.id}/simulations`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(res.status).toBe(200)
        expect(Array.isArray(res.body.items)).toBe(true)
        expect(res.body.total).toBeGreaterThanOrEqual(1)
    })

    it("GET /simulations/:id retorna simulação completa", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "sim_get@test.com" })
        await createSimplePostCurrentSnapshot(client.id, "2025-01-01T00:00:00.000Z", 80000)

        const created = await request(app.server)
                                .post(`/clients/${client.id}/simulations`)
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({ name: "Simulação única", rate: 0.05, untilYear: 2027 })
        
        const res = await request(app.server)
                            .get(`/simulations/${created.body.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("resultSeries")
        expect(res.body.clientId).toBe(client.id)
    })

    it("Não permite criar simulação se snapshot não existe", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "sim_nosnap@test.com" })

        const res = await request(app.server)
                            .post(`/clients/${client.id}/simulations`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({ name: "Inválida", rate: 0.05, untilYear: 2027 })                    

        expect(res.status).toBe(404)
        expect(res.body).toHaveProperty("error", "No CURRENT snapshot found for client")
    })
})
