import type { FastifyInstance } from "fastify";
import { validateBody, validateParams, validateQuery } from "../../plugins/validate";
import { simulationByClientParams, simulationCreateBody, simulationListQuery, simulationParams } from "../../schemas/simulationSchema";
import { createSimulation, listSimulations, getSimulationById } from "../../controllers/simulationControllers";

export async function simulationsRoutes(app: FastifyInstance) {
    app.post("/clients/:clientId/simulations",
        {
            schema: { 
                tags: ["simulations"], 
                description: "Create a new simulation for a client",
                params: simulationByClientParams,
                body: simulationCreateBody,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(simulationByClientParams), validateBody(simulationCreateBody)],
            preHandler: app.auth.role(["ADVISOR"])
        },
        createSimulation
    )

    app.get("/clients/:clientId/simulations", 
        {
            schema: { 
                tags: ["simulations"], 
                description: "List simulations for a client",
                querystring: simulationListQuery,
                params: simulationByClientParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(simulationByClientParams), validateQuery(simulationListQuery)],
            preHandler: app.auth.verify
        },
        listSimulations
    )

    app.get("/simulations/:id",
        {
            schema: { 
                tags: ["simulations"], 
                description: "Get a simulation by id",
                params: simulationParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(simulationParams),
            preHandler: app.auth.verify
        },
        getSimulationById
    )
}