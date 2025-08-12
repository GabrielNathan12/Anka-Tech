import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/utils/prisma";
import argon2 from "argon2";


export async function register(req: FastifyRequest, reply: FastifyReply) {
    const {name, email, password, role} = req.body as any

    const emailExists = await prisma.user.findUnique({where: {email}})

    if(emailExists) {
        return reply.status(400).send({email: 'Email already register'})
    }

    const hash = await argon2.hash(password)

    await prisma.user.create({
        data: { name: name, email: email, password: hash, role:role },
        select: { id: true, name: true, email: true, role: true }
    })

    return reply.code(201).send(true)
}

export async function login(req: FastifyRequest, reply: FastifyReply) {
    const {email, password} = req.body as any

    const user = await prisma.user.findUnique({where: { email }})

    if(!user) {
        return reply.status(404).send({error: "Invalid credentials"})
    }

    const passwordVerify = argon2.verify(user.password, password)
    
    if(!passwordVerify) {
        return reply.status(401).send({error: 'Invalid credentials'})
    }

    const token = await reply.jwtSign({
        sub: user.id,
        email: user.email,
        role: user.role
    }, {expiresIn: '1d'})

    return reply.send({ accessToken: token, tokenType: "Bearer", expiresIn: 86400 })
}

export async function me(req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ user: req.user })
}

