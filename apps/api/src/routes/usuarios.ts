import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import { PerfilUsuario } from '@metalsider/shared'

const QuerySchema = z.object({
  perfil: z
    .enum([PerfilUsuario.SUPERVISOR, PerfilUsuario.MECANICO, PerfilUsuario.ADMIN])
    .optional(),
})

const SUPERVISOR_ADMIN = [
  authenticate,
  roleGuard([PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN]),
]

export async function usuariosRoutes(fastify: FastifyInstance) {
  fastify.get('/usuarios', { preHandler: SUPERVISOR_ADMIN }, async (request, reply) => {
    const { perfil } = QuerySchema.parse(request.query)
    const usuarios = await prisma.usuarios.findMany({
      where: {
        ativo: true,
        ...(perfil ? { perfil } : {}),
      },
      orderBy: { nome_completo: 'asc' },
      select: {
        id: true,
        email: true,
        nome_completo: true,
        perfil: true,
        verificado: true,
        ativo: true,
        criado_em: true,
        ultimo_acesso_em: true,
      },
    })
    return reply.send({ dados: usuarios })
  })
}
