import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import jwt from "@fastify/jwt";

declare module "fastify" {
    interface FastifyInstance {
        auth: {
            verify: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
            role: (roles: Array<"ADVISOR" | "VIEWER">) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>
        }
    }
}

declare module "@fastify/jwt" {
    interface FastifyJWT {
        user: { sub: number; role: "ADVISOR" | "VIEWER"; email: string }
    }
}

export default fp(async function (app: FastifyInstance) {
    app.register(jwt, {
        secret: process.env.JWT_SECRET || "dev-secret",
    })

    const unauthorized = () => {
        const err: any = new Error("Invalid or missing token")
        err.statusCode = 401
        return err
    }
    const forbidden = () => {
        const err: any = new Error("Insufficient role")
        err.statusCode = 403
        return err
    }

    const verify = async (req: FastifyRequest) => {
        try {
            await req.jwtVerify()
        } catch {
            throw unauthorized()
        }
    }

    const role = (roles: Array<"ADVISOR" | "VIEWER">) =>
        async (req: FastifyRequest) => {
            await verify(req)
            if (!roles.includes(req.user.role)) {
                throw forbidden()
            }
        }

    app.decorate("auth", { verify, role })
})
