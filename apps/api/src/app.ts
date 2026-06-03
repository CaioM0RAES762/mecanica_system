import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import cors from '@fastify/cors'
import compress from '@fastify/compress'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { healthRoutes } from './routes/health.js'
import { authRoutes } from './routes/auth.js'
import { ordensServicoRoutes } from './routes/ordens-servico.js'
import { categoriasRoutes } from './routes/categorias.js'
import { veiculosRoutes } from './routes/veiculos.js'
import { usuariosRoutes } from './routes/usuarios.js'
import { analyticsRoutes } from './routes/analytics.js'
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
  await app.register(compress, { global: true })

  await app.register(cors, {
    origin: process.env['ALLOWED_ORIGINS']?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control', 'X-Requested-With'],
    exposedHeaders: ['Content-Type'],
  })

  await app.register(jwt, {
    secret: process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production',
  })

  await app.register(rateLimit, {
    global: false,
    max: 100,
    timeWindow: '1 minute',
  })

  // Multipart para upload de arquivos — limite 10 MB por arquivo (CLAUDE.md)
  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  })

  // Servir arquivos enviados via upload (modo local de desenvolvimento)
  const uploadsDir = join(process.cwd(), 'uploads')
  mkdirSync(uploadsDir, { recursive: true })
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.setErrorHandler(zodErrorHandler)

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(ordensServicoRoutes, { prefix: '/api/v1' })
  await app.register(categoriasRoutes, { prefix: '/api/v1' })
  await app.register(veiculosRoutes, { prefix: '/api/v1' })
  await app.register(usuariosRoutes, { prefix: '/api/v1' })
  await app.register(analyticsRoutes, { prefix: '/api/v1' })

  return app
}
