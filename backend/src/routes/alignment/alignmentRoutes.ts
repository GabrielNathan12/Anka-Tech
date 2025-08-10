import type { FastifyInstance } from "fastify";
import { validateParams } from "../../plugins/validate";
import { getClientAlignment } from "../../controllers/alignmentController";
import { clientIdParams } from "../../schemas/clientSchema";

export async function clientsAlignmentRoutes(app:FastifyInstance) {
    app.get('/:id/alignment',
        {
            schema: {
                tags: ['alignment'],
                description: 'Alignment by client',
                params: clientIdParams
            },
            preValidation: validateParams(clientIdParams)
        }
        , 
        getClientAlignment
    )
}
