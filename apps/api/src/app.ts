import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import { healthRoutes } from './routes/health.js'
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

  app.setErrorHandler(zodErrorHandler)

  await app.register(healthRoutes, { prefix: '/api/v1' })

  return app
}
