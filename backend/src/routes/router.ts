import type { FastifyInstance } from "fastify";
import { clientCreateSchema, clientIdParams, listQuery } from "../schemas/clientSchema";
import { createClient, deleteClient, getClientById, getClients } from '../controllers/clientControllers'
import { validateBody, validateParams, validateQuery  } from "../plugins/validate";

export async function routes(app:FastifyInstance) {
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
                description: "Delete client"
            },
            preValidation: validateParams(clientIdParams)
        },
        deleteClient
    );
}