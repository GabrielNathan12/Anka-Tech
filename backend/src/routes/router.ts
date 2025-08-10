import type { FastifyInstance } from "fastify";
import { app } from "../server";
import { clientesRoutes } from "./clients/clientsRoutes";
import { goalsRoutes } from "./goals/goalsRoutes";
import { portfoliosRoutes } from "./portfolios/portfoliosRoutes";
import { clientsAlignmentRoutes } from "./alignment/alignmentRoutes";
import { projectionRoutes } from "./projection/projectionRoutes";
import { eventRoutes } from "./event/eventsRoutes";
import { simulationsRoutes } from "./simulations/simulationsRoutes";
import { insurancesRoutes } from "./insurances/insurancesRoutes";

export async function registerRoutes(params: FastifyInstance) {
    await app.register(clientesRoutes)
    await app.register(goalsRoutes)
    await app.register(portfoliosRoutes)
    await app.register(clientsAlignmentRoutes)
    await app.register(projectionRoutes)
    await app.register(eventRoutes)
    await app.register(simulationsRoutes)
    await app.register(insurancesRoutes)
}