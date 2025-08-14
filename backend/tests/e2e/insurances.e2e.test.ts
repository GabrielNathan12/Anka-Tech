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
    viewerToken = await loginToken(app, 'viewer@example.com', '123456')
})

afterAll(async () => {
    await prisma.$disconnect()
    await closeTestApp()
})


describe("Perfis de Seguro (Insurance)", () => {
    it("POST /clients/:clientId/insurances cria seguro (ADVISOR) e retorna objeto", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "ins_create@test.com" })

        const res = await request(app.server)
                            .post(`/clients/${client.id}/insurances`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                type: "LIFE",
                                coverage: 300000,
                                premium: 120.5,
                                provider: "Seguradora X",
                                startDate: "2025-01-01",
                                status: "ACTIVE",
                                notes: "Apólice de teste"
                            })

        expect(res.status).toBe(201)
        expect(res.body).toHaveProperty("id")
        expect(res.body.clientId).toBe(client.id)
        expect(res.body.type).toBe("LIFE")
        expect(Number(res.body.coverage)).toBe(300000)
    })

    it("POST retorna 400 se endDate < startDate (validação Zod) e 403 para VIEWER", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "ins_val@test.com" })

        const forbidden = await request(app.server)
                                .post(`/clients/${client.id}/insurances`)
                                .set("authorization", `Bearer ${viewerToken}`)
                                .send({
                                    type: "LIFE",
                                    coverage: 10000,
                                })
        expect([401, 403]).toContain(forbidden.status)

        const bad = await request(app.server)
                            .post(`/clients/${client.id}/insurances`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                type: "DISABILITY",
                                coverage: 50000,
                                startDate: "2025-12-31",
                                endDate: "2025-01-01",
                            })

        expect(bad.status).toBe(400)
        expect(bad.body).toHaveProperty("errors")
    })

    it("GET lista + distribuição por tipo (LIFE/DISABILITY) com totais e percentuais", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "ins_list@test.com" })

        await prisma.insurance.deleteMany({ where: { clientId: client.id } })

        await request(app.server)
                .post(`/clients/${client.id}/insurances`)
                .set("authorization", `Bearer ${advisorToken}`)
                .send({ type: "LIFE", coverage: 100000, premium: 100, status: "ACTIVE" })

        await request(app.server)
                .post(`/clients/${client.id}/insurances`)
                .set("authorization", `Bearer ${advisorToken}`)
                .send({ type: "DISABILITY", coverage: 50000, premium: 50, status: "ACTIVE" })

        const list = await request(app.server)
                            .get(`/clients/${client.id}/insurances?page=1&perPage=10`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(list.status).toBe(200)
        expect(Array.isArray(list.body.items)).toBe(true)
        expect(list.body.total).toBeGreaterThanOrEqual(2)

        const dist = await request(app.server)
                            .get(`/clients/${client.id}/insurances/distribution`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(dist.status).toBe(200)
        expect(dist.body).toHaveProperty("totalCoverage", 150000)
        expect(dist.body).toHaveProperty("totalPremium", 150)
        expect(Array.isArray(dist.body.byType)).toBe(true)

        const life = dist.body.byType.find((x: any) => x.type === "LIFE")
        const dis = dist.body.byType.find((x: any) => x.type === "DISABILITY")
        expect(life.coverage).toBe(100000)
        expect(dis.coverage).toBe(50000)

        expect(life.coveragePct).toBeCloseTo(100000 / 150000, 6)
        expect(dis.coveragePct).toBeCloseTo(50000 / 150000, 6)
    })

    it("PUT atualiza seguro e DELETE exclui; GET by id 404 após exclusão", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({ email: "ins_update@test.com" })

        const created = await request(app.server)
                                .post(`/clients/${client.id}/insurances`)
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({ type: "LIFE", coverage: 200000, premium: 90, status: "ACTIVE" })

        expect(created.status).toBe(201)

        const upd = await request(app.server)
                            .put(`/insurances/${created.body.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({ premium: 110.75, provider: "Seguradora Y" })

        expect(upd.status).toBe(200)
        expect(Number(upd.body.premium)).toBeCloseTo(110.75, 2)
        expect(upd.body.provider).toBe("Seguradora Y")

        const del = await request(app.server)
                            .delete(`/insurances/${created.body.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect([200, 204]).toContain(del.status)

        const get404 = await request(app.server)
                                .get(`/insurances/${created.body.id}`)
                                .set("authorization", `Bearer ${advisorToken}`)
        expect(get404.status).toBe(404)
    })
})