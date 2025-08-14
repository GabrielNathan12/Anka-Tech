import type { FastifyInstance } from "fastify";
import { createEvent, deleteEvent, getEventById, listEvents, updateEvent } from "../../controllers/eventControllers";
import { eventCreateSchema, eventIdParams, eventListQuery, eventUpdateSchema } from "../../schemas/eventSchema";
import { validateBody, validateParams, validateQuery } from "../../plugins/validate";

export async function eventRoutes(app:FastifyInstance) {
    app.get('/events', 
        {
            schema: {
                tags: ['events'],
                description: 'List events',
                querystring: eventListQuery,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateQuery(eventListQuery),
            preHandler: app.auth.verify
        },
        listEvents
    )

    app.get('/events/:id', 
        {
            schema: {
                tags: ['events'],
                description: 'Get event by id',
                params: eventIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(eventIdParams),
            preHandler: app.auth.verify
        }, 
        getEventById
    )

    app.post('/events', 
        {
            schema: {
                tags: ['events'],
                description: 'Create new event',
                body: eventCreateSchema,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateBody(eventCreateSchema),
            preHandler: app.auth.role(["ADVISOR"])
        }, 
        createEvent
    )

    app.put('/events/:id', 
        {
            schema: {
                tags: ['events'],
                description: 'Update event',
                body: eventUpdateSchema,
                params: eventIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: [validateParams(eventIdParams), validateBody(eventUpdateSchema)],
            preHandler: app.auth.role(["ADVISOR"])
        },
        updateEvent
    )

    app.delete('/events/:id', 
        {
            schema: {
                tags: ['events'],
                description: 'Delete event by id',
                params: eventIdParams,
                security: [{ bearerAuth: [] }] 
            },
            preValidation: validateParams(eventIdParams),
            preHandler: app.auth.role(["ADVISOR"])
        },
        deleteEvent
    )
}