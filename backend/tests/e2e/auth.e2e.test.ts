import request from "supertest";
import { getTestApp, closeTestApp } from "../__helpers__/testApp";
import { expect, it, afterAll , beforeAll} from '@jest/globals';
import { prisma, resetDb, createUser } from "../__helpers__/db";

beforeAll(async () => {
    await resetDb()
    await createUser("advisor@example.com", "ADVISOR", "123456")
    await createUser("viewer@example.com", "VIEWER", "123456")
})

afterAll(async () => {
    await prisma.$disconnect()
    await closeTestApp()
})

it("login (deve retornar 401 com a mensagem Invalid credentials)", async () => {
    const app = await getTestApp()
    const res = await request(app.server)
                        .post("/auth/login")
                        .send({ email: "advisor@example.com", password: "111111" })

    expect(res.status).toBe(401)
    expect(res.body).toHaveProperty("error", "Invalid credentials")
})

it("login (deve retornar 200 com token quando senha correta)", async () => {
    const app = await getTestApp()
    const res = await request(app.server)
                        .post("/auth/login")
                        .send({ email: "advisor@example.com", password: "123456" })

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
})

it("register (deve retornar 201 quando um usuário for criado corretamente)", async () => {
    const app = await getTestApp()
    const res = await request(app.server)
                            .post('/auth/register')
                            .send({ email: "viewer2@example.com", name: "Viewer 2", password: "123456",role: "VIEWER"})
    expect(res.status).toBe(201)
})

it("register (deve retornar 400 quando um usuário for criado com email já cadastrado)", async () => {
    const app = await getTestApp()
    const res = await request(app.server)
                            .post('/auth/register')
                            .send({ email: "viewer@example.com", name: "Viewer 2", password: "123456",role: "VIEWER"})
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("error", "Email already register")

})

it("register (deve retornar 400 quando um usuário não informar algum campo do palyload)", async () => {
    const app = await getTestApp()
    const res = await request(app.server)
                            .post('/auth/register')
                            .send({ email: "viewer@example.com", password: "123456",role: "VIEWER"})
    
    expect(res.status).toBe(400)
    expect(res.body).toHaveProperty("errors")
    expect(Array.isArray(res.body.errors)).toBe(true)
    expect(res.body.errors[0]).toHaveProperty("field", "name")
})
