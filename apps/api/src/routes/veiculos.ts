import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'

export async function veiculosRoutes(fastify: FastifyInstance) {
  fastify.get('/veiculos', { preHandler: [authenticate] }, async (_request, reply) => {
    const veiculos = await prisma.veiculos.findMany({
      where: { ativo: true },
      orderBy: { placa: 'asc' },
      select: { id: true, placa: true, marca: true, modelo: true, codigo_frota: true, ativo: true },
    })
    return reply.send({ dados: veiculos })
  })
}
