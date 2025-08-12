import type { FastifyInstance } from "fastify";
import { getProjection } from "../../controllers/projectionController";
import { projectionParams, projectionQuery } from "../../schemas/projectionSchema"
import { validateParams, validateQuery } from "../../plugins/validate";

export async function projectionRoutes(app:FastifyInstance) {
    app.get('/:id/projection',
        {
            schema: {
                tags: ['projection'],
                description: 'Year-by-year wealth projection through 2060 (compounded real rate)',
                params: projectionParams,
                querystring: projectionQuery,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [
                validateParams(projectionParams),
                validateQuery(projectionQuery)
            ],
            preHandler: app.auth.verify
        },
        getProjection
    )
}