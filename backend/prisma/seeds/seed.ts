import { PrismaClient, Prisma, UserRole, AssetClass, PortfolioKind, Status, GoalType, EventType, EventFrequency,  InsuranceType} from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient()
const D = (n: number | string) => new Prisma.Decimal(n)

async function upsertUser(email: string, name: string, role: UserRole, password = "123456") {
    const hash = await argon2.hash(password)

    return prisma.user.upsert({
        where: { email },
        update: { name, role, password: hash },
        create: { email, name, role, password: hash },
        select: { id: true, email: true, role: true }
    })
}

type Allocation = { assetClass: AssetClass; percent: number }

async function upsertSnapshotWithAllocations(
    clientId: number,
    kind: PortfolioKind,
    asOfDate: Date,
    totalValue: number,
    allocations: Allocation[]
    ) {

    const sum = allocations.reduce((acc, a) => acc + a.percent, 0)

    if (Math.abs(sum - 100) > 1e-6) {
        throw new Error(`Allocations for client ${clientId} ${kind} must sum to 100. Got ${sum}`);
    }

    const snapshot = await prisma.portfolioSnapshot.upsert({
        where: {
        clientId_kind_asOfDate: { clientId, kind, asOfDate }
        },
        update: { totalValue: D(totalValue) },
        create: { clientId, kind, asOfDate, totalValue: D(totalValue) }
    })

    await prisma.walletAllocation.deleteMany({ where: { snapshotId: snapshot.id } })

    await prisma.walletAllocation.createMany({
        data: allocations.map(a => ({
        snapshotId: snapshot.id,
        assetClass: a.assetClass,
        percent: D(a.percent)
        }))
    })

    return snapshot
}

async function seedClient(data: {
    name: string
    email: string
    password?: string
    age?: number
    status?: Status
    family_perfil?: string
    current: { asOfDate: string; totalValue: number; allocations: Allocation[] }
    plan: { asOfDate: string; totalValue?: number; allocations: Allocation[] }
    goals: Array<{ type: GoalType; name: string; targetValue: number; targetDate: string }>
    events: Array<{
        type: EventType
        amount: number
        frequency: EventFrequency
        startDate: string
        endDate?: string
        executionDay?: number | null
        executionMonth?: number | null
        description?: string | null
    }>
    insurances: Array<{
        type: InsuranceType
        coverage: number
        premium?: number
        provider?: string
        startDate?: string
        endDate?: string
        status?: Status
        notes?: string
    }>
}) {
    const client = await prisma.client.upsert({
        where: { email: data.email },
        update: {
            name: data.name,
            age: data.age ?? null,
            status: data.status ?? "ACTIVE",
            family_perfil: data.family_perfil ?? null
        },
        create: {
            name: data.name,
            email: data.email,
            age: data.age ?? null,
            status: data.status ?? "ACTIVE",
            family_perfil: data.family_perfil ?? null
        }
    })

    await upsertSnapshotWithAllocations(
        client.id,
        "CURRENT",
        new Date(data.current.asOfDate),
        data.current.totalValue,
        data.current.allocations
    )

    await upsertSnapshotWithAllocations(
        client.id,
        "PLAN",
        new Date(data.plan.asOfDate),
        data.plan.totalValue ?? data.current.totalValue,
        data.plan.allocations
    )

    await prisma.goal.deleteMany({ where: { clientId: client.id } })
    await prisma.event.deleteMany({ where: { clientId: client.id } })
    await prisma.insurance.deleteMany({ where: { clientId: client.id } })

  await prisma.goal.createMany({
        data: data.goals.map(g => ({
            clientId: client.id,
            type: g.type,
            name: g.name,
            targetValue: D(g.targetValue),
            targetDate: new Date(g.targetDate)
        }))
    })

    await prisma.event.createMany({
        data: data.events.map(e => ({
            clientId: client.id,
            type: e.type,
            amount: D(e.amount),
            frequency: e.frequency,
            startDate: new Date(e.startDate),
            endDate: e.endDate ? new Date(e.endDate) : null,
            executionDay: e.executionDay ?? null,
            executionMonth: e.executionMonth ?? null,
            description: e.description ?? null
        }))
  })

    await prisma.insurance.createMany({
        data: data.insurances.map(i => ({
            clientId: client.id,
            type: i.type,
            coverage: D(i.coverage),
            premium: i.premium != null ? D(i.premium) : null,
            provider: i.provider ?? null,
            startDate: i.startDate ? new Date(i.startDate) : null,
            endDate: i.endDate ? new Date(i.endDate) : null,
            status: i.status ?? "ACTIVE",
            notes: i.notes ?? null
        }))
    })

    return client
}

async function main() {
    console.log("Seeding...")

    await upsertUser("advisor@example.com", "Advisor", "ADVISOR", "secret123");
    await upsertUser("viewer@example.com", "Viewer", "VIEWER", "secret123");

    await seedClient({
        name: "Alice Souza",
        email: "alice@example.com",
        password: "changeme",
        age: 35,
        status: "ACTIVE",
        family_perfil: "Casal sem filhos",
        current: {
            asOfDate: "2025-01-01",
            totalValue: 200_000,
            allocations: [
                { assetClass: "EQUITIES", percent: 40 },
                { assetClass: "FIXED_INCOME", percent: 50 },
                { assetClass: "CASH", percent: 10 }
            ]
        },
        plan: {
            asOfDate: "2025-01-01",
            totalValue: 200_000,
            allocations: [
                { assetClass: "EQUITIES", percent: 60 },
                { assetClass: "FIXED_INCOME", percent: 35 },
                { assetClass: "CASH", percent: 5 }
            ]
        },
        goals: [
            { type: "RETIREMENT", name: "Aposentadoria", targetValue: 1_000_000, targetDate: "2040-12-31" },
            { type: "MEDIUM_TERM", name: "Casa de Praia", targetValue: 300_000, targetDate: "2030-06-30" }
        ],
        events: [
            { type: "CONTRIBUTION", amount: 1000, frequency: "MONTHLY", startDate: "2025-01-01", description: "Aporte mensal" },
            { type: "WITHDRAWAL", amount: 20000, frequency: "ONE_TIME", startDate: "2028-06-01", description: "Reforma" },
            { type: "EXPENSE", amount: 3000, frequency: "YEARLY", startDate: "2025-01-01", executionMonth: 12, description: "Seguro anual" }
        ],
        insurances: [
            { type: "LIFE", coverage: 400_000, premium: 250, provider: "Seguradora A", startDate: "2024-01-01" },
            { type: "DISABILITY", coverage: 120_000, premium: 60, provider: "Seguradora B", startDate: "2024-01-01" }
        ]
    })

    await seedClient({
        name: "Cliente 1",
        email: "cliente@teste1.com",
        age: 42,
        status: "ACTIVE",
        family_perfil: "Solteiro, sem filhos",
        current: {
            asOfDate: "2025-02-01",
            totalValue: 350_000,
            allocations: [
                { assetClass: "EQUITIES", percent: 35 },
                { assetClass: "FIXED_INCOME", percent: 55 },
                { assetClass: "CASH", percent: 10 }
            ]
        },
        plan: {
            asOfDate: "2025-02-01",
            allocations: [
                { assetClass: "EQUITIES", percent: 50 },
                { assetClass: "FIXED_INCOME", percent: 45 },
                { assetClass: "CASH", percent: 5 }
            ]
        },
        goals: [
            { type: "MEDIUM_TERM", name: "MBA no Exterior", targetValue: 200_000, targetDate: "2029-09-30" },
            { type: "SHORT_TERM", name: "Fundo de Emergência", targetValue: 60_000, targetDate: "2026-12-31" }
        ],
        events: [
            { type: "CONTRIBUTION", amount: 2000, frequency: "MONTHLY", startDate: "2025-03-01", description: "Aporte mensal" },
            { type: "DEPOSIT", amount: 50000, frequency: "ONE_TIME", startDate: "2026-01-15", description: "Bônus" }
        ],
        insurances: [
            { type: "LIFE", coverage: 300_000, premium: 180, provider: "Seguradora C", startDate: "2023-05-01" }
        ]
    })

  await seedClient({
        name: "Cliente 2",
        email: "cliente@teste2.com",
        age: 29,
        status: "INACTIVE",
        family_perfil: "Solteira",
        current: {
            asOfDate: "2025-01-15",
            totalValue: 80_000,
            allocations: [
                { assetClass: "EQUITIES", percent: 25 },
                { assetClass: "FIXED_INCOME", percent: 65 },
                { assetClass: "CASH", percent: 10 }
            ]
        },
        plan: {
            asOfDate: "2025-01-15",
            allocations: [
                { assetClass: "EQUITIES", percent: 40 },
                { assetClass: "FIXED_INCOME", percent: 55 },
                { assetClass: "CASH", percent: 5 }
            ]
        },
        goals: [
            { type: "SHORT_TERM", name: "Viagem", targetValue: 25_000, targetDate: "2027-03-31" }
        ],
        events: [
            { type: "EXPENSE", amount: 1500, frequency: "YEARLY", startDate: "2025-01-01", executionMonth: 11, description: "Seguro carro" }
        ],
        insurances: []
    })

    console.log("Seed concluído ✅")
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
