import type { FastifyInstance } from "fastify";
import { createEvent, deleteEvent, getEventById, listEvents, updateEvent } from "../../controllers/eventControllers";
import { eventCreateSchema, eventIdParams, eventListQuery, eventUpdateSchema } from "../../schemas/eventSchema";
import { validateBody, validateParams, validateQuery } from "../../plugins/validate";

export async function eventRoutes(app:FastifyInstance) {
    app.get('/event', 
        {
            schema: {
                tags: ['events'],
                description: 'List events',
                querystring: eventListQuery
            },
            preValidation: validateQuery(eventListQuery)
        },
        listEvents
    )

    app.get('/event/:id', 
        {
            schema: {
                tags: ['events'],
                description: 'Get event by id',
                params: eventIdParams
            },
            preValidation: validateParams(eventIdParams)
        }, 
        getEventById
    )

    app.post('/event', 
        {
            schema: {
                tags: ['events'],
                description: 'Create new event',
                body: eventCreateSchema
            },
            preValidation: validateBody(eventCreateSchema)
        }, 
        createEvent
    )

    app.put('/event/:id', 
        {
            schema: {
                tags: ['events'],
                description: 'Update event',
                body: eventUpdateSchema,
                params: eventIdParams
            },
            preValidation: [validateParams(eventIdParams), validateBody(eventUpdateSchema)]
        },
        updateEvent
    )

    app.delete('/event/:id', 
        {
            schema: {
                tags: ['events'],
                description: 'Delete event by id',
                params: eventIdParams
            },
            preValidation: validateParams(eventIdParams)
        },
        deleteEvent
    )
}