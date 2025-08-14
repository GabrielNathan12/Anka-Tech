import request from "supertest";
import { getTestApp, closeTestApp } from "../__helpers__/testApp";
import { prisma, loginToken, resetDb, createUser, getClient, createSimpleClient, createSimplePostCurrentSnapshot } from "../__helpers__/db";
import { expect, it, afterAll , beforeAll, describe} from '@jest/globals';
import { Prisma } from "@prisma/client";

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

describe("Projeção Patrimonial", () => {
    it("404 quando não existe snapshot para o cliente",  async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'no_projection@teste.com'})

        const res = await request(app.server)
                            .get(`/${client.id}/projection`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(404)
        expect(res.body).toHaveProperty('error')

    })

    it("Usa defaults (rate=0.04, untilYear=2060) e startYear do snapshot", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'defaults@test.com'})
        await createSimplePostCurrentSnapshot(client.id,  "2025-01-01T00:00:00.000Z", 100000)

        const res = await request(app.server)
                            .get(`/${client.id}/projection`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(200)
        expect(res.body.rate).toBeCloseTo(0.04, 6)
        expect(res.body.untilYear).toBe(2060)
        expect(res.body.startYear).toBe(2025)
        expect(Array.isArray(res.body.series)).toBe(true)
        expect(res.body.series.length).toBeGreaterThan(0)
    })

    it("400 quando startYear > untilYear", async () => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: 'bad_request@test.com'})
        await createSimplePostCurrentSnapshot(client.id,  "2025-01-01T00:00:00.000Z", 100000)
        
        const res = await request(app.server)
                            .get(`/${client.id}/projection?startYear=2030&untilYear=2029`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty("errors")
    })

    it("Projeção pura (includeEvents=false) bate a fórmula anual composta", async() => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: "pure_projection@test.com"})
        await createSimplePostCurrentSnapshot(client.id,  "2025-01-01T00:00:00.000Z", 100000)

        const res = await request(app.server)
                            .get(`/${client.id}/projection?rate=0.05&untilYear=2027&includeEvents=false`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(res.status).toBe(200)

        const series = res.body.series as Array<{ year: number; value: number }>
        
        expect(series.at(0)?.year).toBe(2025)
        expect(series.at(-1)?.year).toBe(2027)

        const expected = 100000 * Math.pow(1.05, 2)
        expect(series.at(-1)?.value).toBeCloseTo(expected, 2)
    })

    it("includeEvents=true & mode=yearly agrega fluxos anuais corretamente", async() => {
        const app = await getTestApp()
        const client = await createSimpleClient({email: "events_yearly@test.com"})
        
        await prisma.walletAllocation.deleteMany({ where: { snapshot: { clientId: client.id } } })
        await prisma.portfolioSnapshot.deleteMany({ where: { clientId: client.id } })
        await prisma.event.deleteMany({ where: { clientId: client.id } })

        await createSimplePostCurrentSnapshot(client.id, "2025-01-01T00:00:00.000Z", 100000);
        
        await prisma.event.create({
            data: {
                clientId: client.id,
                type: "CONTRIBUTION",
                amount: new Prisma.Decimal(100),
                frequency: "MONTHLY",
                startDate: new Date("2025-01-01"),
                endDate: new Date("2025-12-31"),
                description: "Aporte mensal 100",
            },
        })

        console.log('events count', await prisma.event.count({ where: { clientId: client.id } }));

        const base = await request(app.server)
                            .get(`/${client.id}/projection?rate=0.05&startYear=2025&untilYear=2025&includeEvents=false`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(base.status).toBe(200);
        expect(base.body.startYear).toBe(2025);   // 👈 garante
        expect(base.body.untilYear).toBe(2025);
        expect(base.body.points).toBe(1);

        const withEv = await request(app.server)
                            .get(`/${client.id}/projection?rate=0.05&startYear=2025&untilYear=2025&includeEvents=true&mode=yearly`)
                            .set("authorization", `Bearer ${advisorToken}`)
        
        expect(withEv.status).toBe(200);
        expect(withEv.body.points).toBe(1);

        const baseEnd = base.body.series.at(-1).value
        const withEnd = withEv.body.series.at(-1).value

        expect(baseEnd).toBeCloseTo(105000, 2);
        expect(withEnd - baseEnd).toBeCloseTo(1200, 2);
    
    })

    
//   it("includeEvents=true & startYear personalizado", async () => {
//     const c = await createClient("events_start@test.com");
//     await postCurrentSnapshot(c.id, "2024-01-01T00:00:00.000Z", 50000);

//     // evento anual 1000 por 3 anos
//     await prisma.event.create({
//       data: {
//         clientId: c.id,
//         type: "CONTRIBUTION",
//         amount: D(1000),
//         frequency: "YEARLY",
//         startDate: new Date("2025-01-01"),
//         endDate: new Date("2027-12-31"),
//         description: "Aporte anual 1000 (3 anos)",
//       },
//     });

//     const res = await request(app.server).get(
//       `/${c.id}/projection?rate=0.04&startYear=2025&untilYear=2027&includeEvents=true&mode=yearly`
//     );
//     expect(res.status).toBe(200);
//     expect(res.body.startYear).toBe(2025);
//     expect(res.body.untilYear).toBe(2027);
//     expect(res.body.series.length).toBe(3);
//   });
})