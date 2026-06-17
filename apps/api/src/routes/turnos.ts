import type { FastifyInstance } from 'fastify'
import { PerfilUsuario } from '@metalsider/shared'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import { listarTurnosController, atualizarTurnosController } from '../controllers/turnos.controller.js'

const AUTH = [authenticate]
const ADMIN_ONLY = [authenticate, roleGuard([PerfilUsuario.ADMIN])]

export async function turnosRoutes(fastify: FastifyInstance) {
  // GET /configuracoes/turnos — leitura (qualquer usuário autenticado, usado pelo dashboard)
  fastify.get('/configuracoes/turnos', { preHandler: AUTH }, listarTurnosController)

  // PUT /configuracoes/turnos — atualização (somente admin)
  fastify.put(
    '/configuracoes/turnos',
    { preHandler: ADMIN_ONLY },
    async (request, reply) => atualizarTurnosController(
      request as Parameters<typeof atualizarTurnosController>[0],
      reply,
    ),
  )
}
