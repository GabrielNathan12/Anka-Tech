import type { FastifyInstance } from "fastify";
import { validateParams, validateQuery } from "../../plugins/validate";
import { suggestionsParams, suggestionsQuery } from "../../schemas/suggestionsSchema";
import { getSuggestions } from "../../controllers/suggestionsController";

export async function suggestionsRoutes(app: FastifyInstance) {
    app.get("/clients/:clientId/suggestions",
        {
            schema: {
                tags: ["suggestions"],
                description: "Generates automatic suggestions (monthly contribution, rebalancing)",
                params: suggestionsParams,
                querystring: suggestionsQuery,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(suggestionsParams), validateQuery(suggestionsQuery)],
            preHandler: app.auth.verify
        },
        getSuggestions
    )
}
