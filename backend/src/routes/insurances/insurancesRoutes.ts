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
                querystring: insuranceListQuery
            },
            preValidation: [validateParams(insuranceByClientParams), validateQuery(insuranceListQuery)]
        },
        listInsurances
    )

    app.post("/clients/:clientId/insurances",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Create insurance for client",
                params: insuranceByClientParams,
                body: insuranceCreateSchema
            },
            preValidation: [validateParams(insuranceByClientParams), validateBody(insuranceCreateSchema)]
        },
        createInsurance
    )

    app.get("/clients/:clientId/insurances/distribution",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Coverage/premium distribution by type",
                params: insuranceByClientParams
            },
            preValidation: validateParams(insuranceByClientParams)
        },
        getInsuranceDistribution
    )

    app.get("/insurances/:id",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Get insurance by id",
                params: insuranceIdParams
            },
            preValidation: validateParams(insuranceIdParams)
        },
        getInsuranceById
    )

    app.put("/insurances/:id",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Update insurance",
                params: insuranceIdParams,
                body: insuranceUpdateSchema
            },
            preValidation: [validateParams(insuranceIdParams), validateBody(insuranceUpdateSchema)]
        },
        updateInsurance
    )

    app.delete("/insurances/:id",
        {
            schema: { 
                tags: ["insurances"], 
                description: "Delete insurance",
                params: insuranceIdParams
            },
            preValidation: validateParams(insuranceIdParams)
        },
        deleteInsurance
    )
}
