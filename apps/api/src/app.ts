import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { ordensServicoRoutes } from './routes/ordens-servico.js'
import { categoriasRoutes } from './routes/categorias.js'
import { veiculosRoutes } from './routes/veiculos.js'
import { usuariosRoutes } from './routes/usuarios.js'
import { zodErrorHandler } from './plugins/zod-error-handler.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildLogger(): any {
  if (process.env['NODE_ENV'] === 'test') return false
  if (process.env['NODE_ENV'] === 'development') {
    return {
      level: process.env['LOG_LEVEL'] ?? 'info',
      transport: { target: 'pino-pretty', options: { colorize: true } },
    }
  }
  return { level: process.env['LOG_LEVEL'] ?? 'info' }
}

export async function buildApp() {
  const app = Fastify({ logger: buildLogger() })

  await app.register(helmet, { contentSecurityPolicy: false })

  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })

  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  })

  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  })

  app.setErrorHandler(zodErrorHandler)

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(ordensServicoRoutes, { prefix: '/api/v1' })
  await app.register(categoriasRoutes, { prefix: '/api/v1' })
  await app.register(veiculosRoutes, { prefix: '/api/v1' })
  await app.register(usuariosRoutes, { prefix: '/api/v1' })

  return app
}
