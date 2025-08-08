const Fastify = require('fastify')
const swagger = require('@fastify/swagger')

const app = Fastify()

app.register(swagger, {
    prefix: '/api-docs',
    swagger: {
        info: {
            title: 'API com Fastify',
            version: '1.0.0'
        }
    }
})

app.listen({port: 3000}, () => {
    console.log('🚀 Servidor rodando em http://localhost:3000/api-docs')
})