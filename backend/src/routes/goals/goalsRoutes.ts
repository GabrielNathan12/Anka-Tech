import type { FastifyInstance } from "fastify";
import { validateBody, validateParams } from "../../plugins/validate";
import { goalCreateSchema, goalParmas } from "../../schemas/goalSchema";
import { createGoal, listGoals } from "../../controllers/goalController";

export async function goalsRoutes(app:FastifyInstance) {
    app.post('/goals', 
        {
            schema: {
                tags: ['goals'],
                description: 'Create new goal',
                body: goalCreateSchema,
                security: [{ bearerAuth: [] }] 
            }, 
            preValidation: validateBody(goalCreateSchema),
            preHandler: app.auth.role(["ADVISOR"])
        },
        createGoal
    )

    app.get('/goals/:id', 
        {
            schema: {
                tags: ['goals'],
                description: 'Return goals by client',
                params: goalParmas,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(goalParmas),
            preHandler: app.auth.verify
        },
        listGoals
    )
    
}