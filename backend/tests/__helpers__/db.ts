import { PrismaClient, Prisma } from "@prisma/client";
import argon2 from "argon2";

export const prisma = new PrismaClient()
export const  D = (n: number) => new Prisma.Decimal(n)

export async function resetDb() {
    await prisma.walletAllocation.deleteMany()
    await prisma.portfolioSnapshot.deleteMany()
    await prisma.goal.deleteMany()
    await prisma.event.deleteMany()
    await prisma.insurance.deleteMany()
    await prisma.simulation.deleteMany()
    await prisma.client.deleteMany()
    await prisma.user.deleteMany()
}

export async function createUser(email: string, role: "ADVISOR" | "VIEWER", password = "123456") {
    const hash = await argon2.hash(password)
    
    return prisma.user.upsert({
        where: { email },
        update: { name: email.split("@")[0], role, password: hash },
        create: { email, name: email.split("@")[0], role, password: hash }
    })
}

export async function loginToken(app: any, email: string, password = "123456") {
    
    const res = await (await import("supertest")).default(app.server)
                        .post("/auth/login")
                        .send({ email, password })
  
    if (res.status !== 200) {
        throw new Error(`Login falhou para ${email}: ${res.status} ${JSON.stringify(res.body)}`)
    }

    return res.body.accessToken as string
}

export async function seedClientMinimal(data?: Partial<{
    name: string; email: string; password: string; age: number; status: "ACTIVE"|"INACTIVE"; family_perfil: string;
}>) {
    const c = await prisma.client.create({
        data: {
            name: data?.name ?? "Cliente Teste",
            email: data?.email ?? `client_${Date.now()}@test.com`,
            age: data?.age ?? 30,
            status: data?.status ?? "ACTIVE",
            family_perfil: data?.family_perfil ?? "Solteiro",
        }
    })

    await prisma.portfolioSnapshot.create({
        data: {
            clientId: c.id,
            kind: "CURRENT",
            asOfDate: new Date("2025-01-01"),
            totalValue: D(100000)
        }
    })
    return c
}

export async function getClient(email: string) {
    const client = await prisma.client.findFirst({
        where: {email: email}
    })

    if(client) {
        return client
    }
    return null
}

export async function createSimpleClient(data?: Partial<{
    name: string; email: string; password: string; age: number; status: "ACTIVE"|"INACTIVE"; family_perfil: string;
}>) {
    const c = await prisma.client.create({
        data: {
            name: data?.name ?? "Cliente Teste",
            email: data?.email ?? `client_${Date.now()}@test.com`,
            age: data?.age ?? 30,
            status: data?.status ?? "ACTIVE",
            family_perfil: data?.family_perfil ?? "Solteiro",
        }
    })

    return c
}

export async function createSimplePostCurrentSnapshot(clientId: number, asOf: string, total: number) {
    const  current =  await prisma.portfolioSnapshot.create({
        data: {
            clientId: clientId,
            kind: "CURRENT",
            asOfDate: asOf,
            totalValue: total,
            allocations: {
                create: [
                    { assetClass: "EQUITIES", percent: 50 },
                    { assetClass: "FIXED_INCOME", percent: 50 },
                ],
            },
        }
    })

    return current
}