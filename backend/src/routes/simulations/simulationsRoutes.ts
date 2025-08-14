import type { FastifyInstance } from "fastify";
import { validateBody, validateParams, validateQuery } from "../../plugins/validate";
import { simulationCreateBody, simulationListQuery, simulationParams, simulationIdParams } from "../../schemas/simulationSchema";
import { createSimulation, listSimulations, getSimulationById } from "../../controllers/simulationControllers";

export async function simulationsRoutes(app: FastifyInstance) {
    app.post("/clients/:clientId/simulations",
        {
            schema: { 
                tags: ["simulations"], 
                description: "Create a new simulation for a client",
                params: simulationParams,
                body: simulationCreateBody,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(simulationParams), validateBody(simulationCreateBody)],
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
                params: simulationParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(simulationParams), validateQuery(simulationListQuery)],
            preHandler: app.auth.verify
        },
        listSimulations
    )

    app.get("/simulations/:id",
        {
            schema: { 
                tags: ["simulations"], 
                description: "Get a simulation by id",
                params: simulationIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(simulationIdParams),
            preHandler: app.auth.verify
        },
        getSimulationById
    )
}