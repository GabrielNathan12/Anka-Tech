import request from "supertest";
import { getTestApp, closeTestApp } from "../__helpers__/testApp";
import { prisma, loginToken, seedClientMinimal, resetDb, createUser, getClient } from "../__helpers__/db";
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


describe("Metas (Goals)", () => {
    it("Cria metas (aposentadoria / curto / médio) prazo com o valor alvo e data alvo", async () => {
        const app = await getTestApp()
        
        const client = await seedClientMinimal({email: 'goal_client1@teste.com'})

        const g1 = await request(app.server)
                            .post('/goals')
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                type: "RETIREMENT",
                                name: "Aposentadoria",
                                targetValue: 1000000,
                                targetDate: "2040-12-31",
                            })

        expect([201, 200]).toContain(g1.status)

        const g2 = await request(app.server)
                            .post('/goals')
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                type: "SHORT_TERM",
                                name: "Fundo Emergência",
                                targetValue: 60000,
                                targetDate: "2026-12-31",
                            })

        expect([201, 200]).toContain(g2.status)

        const g3 = await request(app.server)
                            .post('/goals')
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                type: "MEDIUM_TERM",
                                name: "MBA",
                                targetValue: 200000,
                                targetDate: "2029-09-30", 
                            })
        
        expect([201, 200]).toContain(g3.status)

        const list = await request(app.server)
                            .get(`/goals/${client.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(list.status).toBe(200)
        expect(Array.isArray(list.body.items)).toBe(true)
        expect(list.body.items.length).toBeGreaterThanOrEqual(3)

    })

    it("validação (400) quando meta sem targetValue ou targetDate", async () => {
        
        const client = await seedClientMinimal({email: "goals_invalid@test.com"})
        const app = await getTestApp()

        const bad = await request(app.server)
                            .post("/goals")
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({
                                clientId: client.id,
                                type: "RETIREMENT",
                                name: "Sem datas/valor",
                                targetDate: "2030-01-01",
                            })

        expect(bad.status).toBe(400)
        expect(bad.body).toHaveProperty("errors")
    })
})


describe("Carteira (Snapshots) + Alinhamento", () => {
    it("Alinhamento deve ser null quando só existe o CURRENT", async () => {
        const app = await getTestApp()
        const client = await seedClientMinimal({email: 'client_aliment@teste.com'})

        const current = await request(app.server)
                                .post('/portfolios')
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({
                                    clientId: client.id,
                                    kind: "CURRENT",
                                    asOfDate: "2025-01-01T00:00:00.000Z",
                                    totalValue: 150000,
                                    allocations: [
                                        { assetClass: "EQUITIES", percent: 50 },
                                        { assetClass: "FIXED_INCOME", percent: 50 },
                                    ],
                                })

        expect([201,200]).toContain(current.status)

        const alignment = await request(app.server)
                                .get(`/${client.id}/alignment`)
                                .set("authorization", `Bearer ${advisorToken}`)
       
        expect([200,404,400]).toContain(alignment.status)
    
        if (alignment.status === 200) {
            expect(alignment.body).toHaveProperty("alignmentCategory", null)
            expect(alignment.body).toHaveProperty("alignmentPercent", null)
            expect(alignment.body).toHaveProperty("alignedValue", null)
        }
    })
    
    it("Cria um PLAN e calcula o alinhamemnto (percent = plan / current) + categoria correta", async () => {
        const app = await getTestApp()
        const client = await seedClientMinimal({email: 'client_aliment2@teste.com'})

        if(client) {
            const resPlan = await request(app.server)
                                    .post('/portfolios')
                                    .set("authorization", `Bearer ${advisorToken}`)
                                    .send({
                                        clientId: client.id,
                                        kind: "PLAN",
                                        asOfDate: "2025-01-01T00:00:00.000Z",
                                        totalValue: 120000,
                                        allocations: [
                                            { assetClass: "EQUITIES", percent: 50 },
                                            { assetClass: "FIXED_INCOME", percent: 50 },
                                        ],
                                    })
    
            expect([201,200]).toContain(resPlan.status)
            
            const align = await request(app.server)
                                    .get(`/${client.id}/alignment`)
                                    .set("authorization", `Bearer ${advisorToken}`)
            
            expect(align.status).toBe(200)
            expect(align.body).toHaveProperty("alignmentPercent")
            expect(align.body).toHaveProperty("alignmentCategory")
    
            const p = Number(align.body.alignmentPercent)
            expect(p).toBeCloseTo(1.2, 6)
            expect(align.body.alignmentCategory).toBe("GREEN")

        }
    })

    it("Valida alocações: soma != 100 deve dar 400", async  () => {
        const app = await getTestApp()
        const client = await seedClientMinimal({email: 'client_aliment3@teste.com'})

        const badReq = await request(app.server)
                                .post('/portfolios')
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({
                                    clientId: client.id,
                                    kind: "CURRENT",
                                    asOfDate: "2025-02-01T00:00:00.000Z",
                                    totalValue: 100000,
                                    allocations: [
                                        { assetClass: "EQUITIES", percent: 40 },
                                        { assetClass: "FIXED_INCOME", percent: 40 },
                                    ],
                                })

        expect(badReq.status).toBe(400)
        expect(badReq.body).toHaveProperty("errors")
    })

    it("Idempotência: repetir o mesmo snapshot (clientId, kind, asOfDate) não deve estourar 500", async () => {
        const app = await getTestApp()
        const client = await getClient('client_aliment2@teste.com')

        const again = await request(app.server)
                                .post('/portfolios')
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({
                                        clientId: client?.id,
                                        kind: "PLAN",
                                        asOfDate: "2025-01-01T00:00:00.000Z",
                                        totalValue: 120000,
                                        allocations: [
                                            { assetClass: "EQUITIES", percent: 50 },
                                            { assetClass: "FIXED_INCOME", percent: 50 },
                                        ],
                                    })
        expect([200,409]).toContain(again.status)
    })

    it("Categorias: GREEN (>90%), YELLOW_LIGHT (70-90], YELLOW_DARK (50-70), RED (<50%)", async () => {
        const client = await seedClientMinimal({email: 'client_aliment4@teste.com'})
        const app = await getTestApp()

        async function setTotals(current: number, plan: number, clientId: number) {
            await prisma.walletAllocation.deleteMany({  where: { snapshot: { clientId } } })
            await prisma.portfolioSnapshot.deleteMany({ where: { clientId: clientId } })
            
            const c = await request(app.server).post("/portfolios")
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({
                                    clientId: clientId,
                                    kind: "CURRENT",
                                    asOfDate: "2025-03-01T00:00:00.000Z",
                                    totalValue: current,
                                    allocations: [
                                        { assetClass: "EQUITIES", percent: 50 },
                                        { assetClass: "FIXED_INCOME", percent: 50 },
                                    ],
                                })

            expect([201,200]).toContain(c.status)

            const p = await request(app.server).post("/portfolios")
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({
                                    clientId: clientId,
                                    kind: "PLAN",
                                    asOfDate: "2025-03-01T00:00:00.000Z",
                                    totalValue: plan,
                                    allocations: [
                                        { assetClass: "EQUITIES", percent: 50 },
                                        { assetClass: "FIXED_INCOME", percent: 50 },
                                    ],
                                })
            expect([201,200]).toContain(p.status)
        }

        await setTotals(100000, 91000, client.id)

        let res = await request(app.server)
                            .get(`/${client.id}/alignment`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(200)
        expect(res.body.alignmentCategory).toBe("GREEN")

        await setTotals(100000, 80000, client.id)

        res = await request(app.server)
                        .get(`/${client.id}/alignment`)
                        .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(200)
        expect(res.body.alignmentCategory).toBe("YELLOW_LIGHT")
        
        await setTotals(100000, 60000, client.id)
        res = await request(app.server)
                        .get(`/${client.id}/alignment`)
                        .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(200)
        expect(res.body.alignmentCategory).toBe("YELLOW_DARK")

        await setTotals(100000, 40000, client.id)
        res = await request(app.server)
                        .get(`/${client.id}/alignment`)
                        .set("authorization", `Bearer ${advisorToken}`)

        expect(res.status).toBe(200)
        expect(res.body.alignmentCategory).toBe("RED")

    })

    it("Retorna a lista de portfolios snapshots do cliente", async () => {
        const client = await getClient('client_aliment4@teste.com')
        const app = await getTestApp()

        const res = await request(app.server)
                            .get(`/portfolios?clientId=${client?.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)

                            
        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("items")
        expect(Array.isArray(res.body.items)).toBe(true)
    })

    it("Viewer consegue ler alignment e portfolios, mas não criar snapshots (403)", async () => {
        const client = await getClient('client_aliment4@teste.com')
        const app = await getTestApp()

        const viewList = await request(app.server)
                                .get(`/portfolios?clientId=${client?.id}`)
                                .set("authorization", `Bearer ${viewerToken}`)

        expect(viewList.status).toBe(200)

        const viewAlign = await request(app.server)
                                    .get(`/${client?.id}/alignment`)
                                    .set("authorization", `Bearer ${viewerToken}`)

        expect(viewAlign.status).toBe(200)

        const createDenied = await request(app.server)
                                    .post("/portfolios")
                                    .set("authorization", `Bearer ${viewerToken}`)
                                    .send({
                                        clientId: client?.id,
                                        kind: "CURRENT",
                                        asOfDate: "2025-04-01T00:00:00.000Z",
                                        totalValue: 123000,
                                        allocations: [
                                            { assetClass: "EQUITIES", percent: 50 },
                                            { assetClass: "FIXED_INCOME", percent: 50 },
                                        ],
                                    })
        expect([403,401]).toContain(createDenied.status)
    })
})
