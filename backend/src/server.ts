import { fastify } from 'fastify'
import { fastifySwagger } from '@fastify/swagger'
import { fastifyCors } from '@fastify/cors'
import { validatorCompiler, serializerCompiler, ZodTypeProvider, jsonSchemaTransform } from 'fastify-type-provider-zod'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { routes } from './routes/router'

export const app = fastify().withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

app.register(fastifyCors, { origin: '*' })

app.register(fastifySwagger, {
    openapi: {
        info: {
            title: 'Anka Tech',
            version: '1.0.0'
        }
    },
    transform: jsonSchemaTransform
})

app.register(fastifySwaggerUi, {
    routePrefix: '/api-docs'
})

app.register(routes)

app.listen({port: 3001, host: '0.0.0.0'}, () => {
    console.log('🚀 Servidor rodando em http://localhost:3001/api-docs')
})

