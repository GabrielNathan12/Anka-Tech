import type { FastifyInstance } from "fastify";
import authPlugin from '../../middleware/auth'
import { login, me, register } from "../../controllers/authController";
import { loginBody, registerBody } from "../../schemas/authSchema";
import { validateBody } from "../../plugins/validate";

export async function authRoutes(app:FastifyInstance) {

    app.post('/auth/register',
        {
            schema: {
                tags: ['auth'],
                description: 'Create new User',
                body: registerBody
            },
            preValidation: validateBody(registerBody)
        } ,
        register
    )

    app.post('/auth/login', 
        {
            schema: {
                tags: ['auth'],
                description: 'Login for user',
                body: loginBody
            },
            preValidation: validateBody(loginBody)
        },
        login
    )
    app.get('/auth/me', 
        {
            schema: {
                tags: ['auth'],
                description: 'Returns the authenticated user',
                security: [{ bearerAuth: [] }] 
            },
            preHandler: app.auth.verify
        },
        me
    )
}