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
import { checklistsRoutes } from './routes/checklists.js'
import { turnosRoutes } from './routes/turnos.js'
import { zodErrorHandler } from './plugins/zod-error-handler.js'

type LoggerOptions = boolean | {
  level: string
  transport?: { target: string; options: { colorize: boolean } }
}

function buildLogger(): LoggerOptions {
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
  const jwtSecret = process.env['JWT_SECRET']
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado. Defina a variável de ambiente antes de iniciar o servidor.')
  }

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
    secret: jwtSecret,
  })

  await app.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',
  })

  await app.register(multipart, {
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  })

  const uploadsDir = join(process.cwd(), 'uploads')
  mkdirSync(uploadsDir, { recursive: true })
  await app.register(fastifyStatic, {
    root: uploadsDir,
    prefix: '/uploads/',
    decorateReply: false,
  })

  app.setErrorHandler(zodErrorHandler)

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      type:   'https://metalsider.com.br/erros/404',
      title:  'Não encontrado',
      status: 404,
      detail: `Rota '${request.method} ${request.url}' não encontrada.`,
    })
  })

  await app.register(healthRoutes, { prefix: '/api/v1' })
  await app.register(authRoutes, { prefix: '/api/v1' })
  await app.register(ordensServicoRoutes, { prefix: '/api/v1' })
  await app.register(categoriasRoutes, { prefix: '/api/v1' })
  await app.register(veiculosRoutes, { prefix: '/api/v1' })
  await app.register(usuariosRoutes, { prefix: '/api/v1' })
  await app.register(analyticsRoutes, { prefix: '/api/v1' })
  await app.register(checklistsRoutes, { prefix: '/api/v1' })
  await app.register(turnosRoutes, { prefix: '/api/v1' })

  return app
}
