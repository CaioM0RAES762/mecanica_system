import type { FastifyInstance } from 'fastify'
import { AtivarContaSchema, LoginSchema, ReenviarCodigoSchema } from '@metalsider/shared'
import { PerfilUsuario } from '@metalsider/shared'
import {
  ativarContaController,
  loginController,
  reenviarCodigoController,
} from '../controllers/auth.controller.js'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)
    return loginController(fastify, body, reply)
  })

  fastify.post('/auth/ativar-conta', async (request, reply) => {
    const body = AtivarContaSchema.parse(request.body)
    return ativarContaController(body, reply)
  })

  fastify.post(
    '/auth/reenviar-codigo',
    { preHandler: [authenticate, roleGuard([PerfilUsuario.ADMIN])] },
    async (request, reply) => {
      const body = ReenviarCodigoSchema.parse(request.body)
      return reenviarCodigoController(body, reply)
    },
  )
}
