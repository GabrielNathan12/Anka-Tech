import request from "supertest";
import { getTestApp, closeTestApp } from "../__helpers__/testApp";
import { prisma,loginToken, seedClientMinimal, resetDb, createUser } from "../__helpers__/db";
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

    await seedClientMinimal({ name: "Cliente_1", email: "cliente1@test.com" })
    await seedClientMinimal({ name: "Cliente_2", email: "cliente2@test.com" })
    await seedClientMinimal({ name: "Cliente_3", email: "cliente3@test.com", status: "INACTIVE" })
})

afterAll(async () => {
    await prisma.$disconnect()
    await closeTestApp()
})

describe("Clients - READ", () => {
    it("GET /clients (advisor) retorna lista paginada", async () => {
        const app = await getTestApp()
        const res = await request(app.server)
                        .get("/clients?page=1&perPage=2")
                        .set("authorization", `Bearer ${advisorToken}`)

        expect(res.status).toBe(200)
        expect(res.body).toHaveProperty("total")
        expect(res.body).toHaveProperty("items")
        expect(Array.isArray(res.body.items)).toBe(true)
        expect(res.body.items.length).toBeLessThanOrEqual(2)
    })

    it("GET /clients com search filtra por nome/email", async () => {
        const app = await getTestApp()

        const res = await request(app.server)
                        .get("/clients?search=Cliente_1")
                        .set("authorization", `Bearer ${advisorToken}`)

        expect(res.status).toBe(200)
        const names = res.body.items.map((i: any) => i.name)
        expect(names.join(" ")).toMatch(/Cliente_1/i)

    })

    it("GET /clients (viewer) também pode listar (somente leitura)", async () => {
        const app = await getTestApp()

        const res = await request(app.server)
                            .get("/clients")
                            .set("authorization", `Bearer ${viewerToken}`)
    
        expect(res.status).toBe(200)
    })

    it("GET /clients/:id (200) e (404)", async () => {
        const app = await getTestApp()
        const existing = await prisma.client.findFirstOrThrow()

        const ok = await request(app.server)
                        .get(`/clients/${existing.id}`)
                        .set("authorization", `Bearer ${advisorToken}`)

        expect(ok.status).toBe(200)
        expect(ok.body).toHaveProperty("id", existing.id)

        const notFound = await request(app.server)
                                .get(`/clients/9999999`)
                                .set("authorization", `Bearer ${advisorToken}`)

        expect(notFound.status).toBe(404)
    })
})

describe("Clients - CREATE", () => {
    it("POST /clients cria novo cliente (advisor)", async () => {
   
        const app = await getTestApp()
            const payload = {
                name: "Novo Cliente",
                email: "novo@test.com",
                password: "123456",
                age: 25,
                status: "ACTIVE",
                family_perfil: "Solteiro"
            }

        const res = await request(app.server)
                    .post("/clients")
                    .set("authorization", `Bearer ${advisorToken}`)
                    .send(payload)

        expect([201,200]).toContain(res.status)
    })

    it("POST /clients falha com Zod 400 quando payload inválido (sem name)", async () => {
        const app = await getTestApp()
        
        const payload = {
                email: "sem-name@test.com",
                password: "123456",
                age: 25,
                status: "ACTIVE",
                family_perfil: "Solteiro"
        }

        const res = await request(app.server)
                        .post("/clients")
                        .set("authorization", `Bearer ${advisorToken}`)
                        .send(payload)

        expect(res.status).toBe(400)
        expect(res.body).toHaveProperty("errors")
        expect(Array.isArray(res.body.errors)).toBe(true)

    })

    it("POST /clients (409) quando email já existe", async () => {
        const app = await getTestApp()

        const dupe = {
            name: "Duplicado",
            email: "cliente1@test.com",
            password: "123456",
            age: 33,
            status: "ACTIVE",
            family_perfil: "X"
        }

        const res = await request(app.server)
                        .post("/clients")
                        .set("authorization", `Bearer ${advisorToken}`)
                        .send(dupe)

        expect([409,400]).toContain(res.status)
    })

    it("POST /clients (viewer) deve ser 403", async () => {
        const app = await getTestApp()
        const res = await request(app.server)
                            .post("/clients")
                            .set("authorization", `Bearer ${viewerToken}`)
                            .send({
                                name: "Viewer Não Pode acessar",
                                email: "viewer-nao-pode-acessar@test.com",
                                password: "123456",
                                age: 45,
                                status: "ACTIVE",
                                family_perfil: "Y"
                            })
        expect(res.status).toBe(403)
    })
})

describe("Clients - UPDATE", () => {
    it("PUT /clients/:id atualiza parcialmente (advisor)", async () => {
        const app = await getTestApp()
        const c = await seedClientMinimal({ email: "update_me@test.com" })
        const res = await request(app.server)
                                .put(`/clients/${c.id}`)
                                .set("authorization", `Bearer ${advisorToken}`)
                                .send({ name: "Atualizado", age: 31 })

        expect([200,204]).toContain(res.status)
    })

    it("PUT /clients/:id (400) Zod quando payload vazio", async () => {
        const app = await getTestApp()

        const c = await seedClientMinimal({ email: "update@test.com" })
    
        const res = await request(app.server)
                            .put(`/clients/${c.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({})
    
        expect(res.status).toBe(400)
    })

    it("PUT /clients/:id (404) quando cliente não existe", async () => {
        const app = await getTestApp()

        const res = await request(app.server)
                            .put(`/clients/999999`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({ name: "Nada" })
    
        expect(res.status).toBe(404)
    })

    it("PUT /clients/:id (409) quando email conflita", async () => {
        const app = await getTestApp()

        const a = await seedClientMinimal({ email: "duplicado_a@test.com" })
        const b = await seedClientMinimal({ email: "duplicado_b@test.com" })

        const res = await request(app.server)
                            .put(`/clients/${b.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)
                            .send({ email: "duplicado_a@test.com" })

        expect([409,400]).toContain(res.status)
    })

    it("PUT /clients/:id (viewer) deve ser 403", async () => {
        const app = await getTestApp()

        const c = await seedClientMinimal({ email: "viewer_no_edit@test.com" })

        const res = await request(app.server)
                            .put(`/clients/${c.id}`)
                            .set("authorization", `Bearer ${viewerToken}`)
                            .send({ name: "Viewer Edit" })

        expect(res.status).toBe(403)

    })
})

describe("Clients - DELETE", () => {
    it("DELETE /clients/:id (advisor) 204", async () => {
        const app = await getTestApp()

        const c = await seedClientMinimal({ email: "delete@test.com" })

        const res = await request(app.server)
                            .delete(`/clients/${c.id}`)
                            .set("authorization", `Bearer ${advisorToken}`)
    
        expect([204,200]).toContain(res.status)
    })

    it("DELETE /clients/:id (404) quando não existe", async () => {
        const app = await getTestApp()

        const res = await request(app.server)
                            .delete(`/clients/9999999`)
                            .set("authorization", `Bearer ${advisorToken}`)

        expect(res.status).toBe(404)
    })

    it("DELETE /clients/:id (viewer) deve ser 403", async () => {
        const app = await getTestApp()

        const c = await seedClientMinimal({ email: "viewer_no_delete@test.com" })

        const res = await request(app.server)
                            .delete(`/clients/${c.id}`)
                            .set("authorization", `Bearer ${viewerToken}`)

        expect(res.status).toBe(403)
    })
})
