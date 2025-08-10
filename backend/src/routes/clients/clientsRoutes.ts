import type { FastifyInstance } from "fastify";
import { clientCreateSchema, clientIdParams, clientUpdateSchema, listQuery } from "../../schemas/clientSchema";
import { createClient, deleteClient, getClientById, getClients, updateClient } from '../../controllers/clientControllers'
import { validateBody, validateParams, validateQuery  } from "../../plugins/validate";

export async function clientesRoutes(app:FastifyInstance) {
    app.get('/clients', 
        {
            schema: {
                tags: ['clients'],
                description: 'List all users'
            },
            preValidation: validateQuery(listQuery)
        },

        getClients
    )

    app.get('/clients/:id',
        {
            schema: {
                tags: ['clients'],
                description: 'Find client by id',
                params: clientIdParams
            },
                preValidation : validateParams(clientIdParams)
            },
            getClientById
        )

    app.post('/clients',
        {
            schema: {
                description: 'Create new user',
                tags: ['clients'],
                body: clientCreateSchema
            },
            preValidation: validateBody(clientCreateSchema)
        },
        createClient
    )
    app.delete('/clients/:id',
        {
            schema: {
                tags: ["clients"],
                description: "Delete client",
                params: clientIdParams,
            },
            preValidation: validateParams(clientIdParams)
        },
        deleteClient
    )

    app.put('/clients/:id',  
        {
            schema: {
                tags: ['clients'],
                description: "Update client",
                body: clientUpdateSchema,
                params: clientIdParams
            },
            preValidation: 
                [
                    validateParams(clientIdParams),
                    validateBody(clientUpdateSchema)
                ]

        },
        updateClient
    )
}