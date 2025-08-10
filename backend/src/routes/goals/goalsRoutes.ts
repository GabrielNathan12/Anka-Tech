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
                body: goalCreateSchema
            }, 
            preValidation: validateBody(goalCreateSchema)
        },
        createGoal
    )

    app.get('/goals/:id', 
        {
            schema: {
                tags: ['goals'],
                description: 'Return goals by client',
                params: goalParmas
            },
            preValidation: validateParams(goalParmas)
        },
        listGoals
    )
    
}