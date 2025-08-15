import { app } from "../server";
import { clientesRoutes } from "./clients/clientsRoutes";
import { goalsRoutes } from "./goals/goalsRoutes";
import { portfoliosRoutes } from "./portfolios/portfoliosRoutes";
import { clientsAlignmentRoutes } from "./alignment/alignmentRoutes";
import { projectionRoutes } from "./projection/projectionRoutes";
import { eventRoutes } from "./event/eventsRoutes";
import { simulationsRoutes } from "./simulations/simulationsRoutes";
import { insurancesRoutes } from "./insurances/insurancesRoutes";
import { authRoutes } from "./auth/authRoutes";
import authPlugin from "../middleware/auth"
import { suggestionsRoutes } from "./suggestions/suggestionsRoutes";

export async function registerRoutes() {
    await app.register(authPlugin)
    await app.register(authRoutes)
    await app.register(clientesRoutes)
    await app.register(goalsRoutes)
    await app.register(portfoliosRoutes)
    await app.register(clientsAlignmentRoutes)
    await app.register(projectionRoutes)
    await app.register(eventRoutes)
    await app.register(simulationsRoutes)
    await app.register(insurancesRoutes)
    await app.register(suggestionsRoutes)
}