import type { FastifyInstance } from "fastify";
import { validateBody, validateParams, validateQuery } from "../../plugins/validate";
import { insuranceCreateSchema, insuranceUpdateSchema, insuranceIdParams, insuranceByClientParams, insuranceListQuery } from "../../schemas/insuranceSchema";
import { listInsurances, getInsuranceById, createInsurance, updateInsurance, deleteInsurance, getInsuranceDistribution } from "../../controllers/insuranceControllers";

export async function insurancesRoutes(app: FastifyInstance) {
    app.get("/clients/:clientId/insurances",
        {
            schema: { 
                tags: ["insurances"],
                description: "List insurances by client",
                params: insuranceByClientParams,
                querystring: insuranceListQuery,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(insuranceByClientParams), validateQuery(insuranceListQuery)],
            preHandler: app.auth.verify
        },
        listInsurances
    )

    app.post("/clients/:clientId/insurances",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Create insurance for client",
                params: insuranceByClientParams,
                body: insuranceCreateSchema,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(insuranceByClientParams), validateBody(insuranceCreateSchema)],
            preHandler: app.auth.role(["ADVISOR"])
        },
        createInsurance
    )

    app.get("/clients/:clientId/insurances/distribution",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Coverage/premium distribution by type",
                params: insuranceByClientParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(insuranceByClientParams),
            preHandler: app.auth.verify
        },
        getInsuranceDistribution
    )

    app.get("/insurances/:id",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Get insurance by id",
                params: insuranceIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(insuranceIdParams),
            preHandler: app.auth.verify
        },
        getInsuranceById
    )

    app.put("/insurances/:id",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Update insurance",
                params: insuranceIdParams,
                body: insuranceUpdateSchema,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(insuranceIdParams), validateBody(insuranceUpdateSchema)],
            preHandler: app.auth.role(["ADVISOR"])
        },
        updateInsurance
    )

    app.delete("/insurances/:id",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Delete insurance",
                params: insuranceIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(insuranceIdParams),
            preHandler: app.auth.role(["ADVISOR"])
        },
        deleteInsurance
    )
}
