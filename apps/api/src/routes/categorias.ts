import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'

export async function categoriasRoutes(fastify: FastifyInstance) {
  fastify.get('/categorias', { preHandler: [authenticate] }, async (_request, reply) => {
    const categorias = await prisma.categorias.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, cor: true, ativo: true },
    })
    return reply.send({ dados: categorias })
  })
}
