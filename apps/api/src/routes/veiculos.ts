import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import { PerfilUsuario, CriarVeiculoSchema, AtualizarVeiculoSchema } from '@metalsider/shared'

const ONLY_ADMIN = [authenticate, roleGuard([PerfilUsuario.ADMIN])]

const SELECT_VEICULO = {
  id: true,
  placa: true,
  marca: true,
  modelo: true,
  codigo_frota: true,
  ativo: true,
} as const

export async function veiculosRoutes(fastify: FastifyInstance) {
  // GET /veiculos — listagem (autenticado)
  fastify.get('/veiculos', { preHandler: [authenticate] }, async (request, reply) => {
    const { ativo } = z.object({ ativo: z.coerce.boolean().optional() }).parse(request.query)
    const veiculos = await prisma.veiculos.findMany({
      where: { ...(ativo !== undefined ? { ativo } : { ativo: true }) },
      orderBy: { placa: 'asc' },
      select: SELECT_VEICULO,
    })
    return reply.send({ dados: veiculos })
  })

  // POST /veiculos — criar (somente admin)
  fastify.post('/veiculos', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const body = CriarVeiculoSchema.parse(request.body)

    const existente = await prisma.veiculos.findFirst({ where: { placa: body.placa } })
    if (existente) {
      return reply.code(409).send({
        type: 'https://metalsider.com.br/erros/409',
        title: 'Conflito',
        status: 409,
        detail: `Veículo com placa "${body.placa}" já cadastrado`,
      })
    }

    const novo = await prisma.veiculos.create({
      data: {
        placa: body.placa.toUpperCase(),
        marca: body.marca,
        modelo: body.modelo,
        codigo_frota: body.codigo_frota ?? null,
        ativo: true,
      },
      select: SELECT_VEICULO,
    })

    return reply.code(201).send({ dados: novo })
  })

  // PATCH /veiculos/:id — editar (somente admin)
  fastify.patch('/veiculos/:id', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)
    const body = AtualizarVeiculoSchema.parse(request.body)

    const existente = await prisma.veiculos.findUnique({ where: { id } })
    if (!existente) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Veículo não encontrado',
      })
    }

    const atualizado = await prisma.veiculos.update({
      where: { id },
      data: {
        ...(body.placa ? { placa: body.placa.toUpperCase() } : {}),
        ...(body.marca ? { marca: body.marca } : {}),
        ...(body.modelo ? { modelo: body.modelo } : {}),
        ...(body.codigo_frota !== undefined ? { codigo_frota: body.codigo_frota } : {}),
      },
      select: SELECT_VEICULO,
    })

    return reply.send({ dados: atualizado })
  })

  // DELETE /veiculos/:id — soft-delete (somente admin)
  fastify.delete('/veiculos/:id', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)

    const existente = await prisma.veiculos.findUnique({ where: { id } })
    if (!existente) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Veículo não encontrado',
      })
    }

    await prisma.veiculos.update({
      where: { id },
      data: { ativo: false },
    })

    return reply.code(204).send()
  })
}
