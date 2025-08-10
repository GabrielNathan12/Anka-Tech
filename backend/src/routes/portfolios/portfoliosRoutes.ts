import type { FastifyInstance } from "fastify";
import type { FastifyRequest, FastifyReply } from "fastify";
import { portfolioCreateSchema, portfolioListQuery } from "../../schemas/portfolioSchema";
import { validateBody, validateQuery } from "../../plugins/validate";
import { createPortfolioSnapshot, listPortfolios } from "../../controllers/portfoliosController";

export async function portfoliosRoutes(app:FastifyInstance) {
    app.post('/portfolios', 
        {
            schema: {
                tags: ['portfolios'],
                description: 'Create new portfolio',
                body: portfolioCreateSchema
            }, 
            preValidation: validateBody(portfolioCreateSchema)
        },
        createPortfolioSnapshot
    )

    app.get('/portfolios', 
        {
            schema: {
                tags: ['portfolios'],
                description: 'Return goals by client',
                querystring: portfolioListQuery
            },
            preValidation: validateQuery(portfolioListQuery)
        },
        listPortfolios
    )
    
}