import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import { PerfilUsuario, CriarVeiculoSchema, AtualizarVeiculoSchema } from '@metalsider/shared'

const ONLY_ADMIN = [authenticate, roleGuard([PerfilUsuario.ADMIN])]

const SELECT_VEICULO = {
  id: true,
  veiculo: true,
  placa: true,
  cod_tipo_aplicacao: true,
  descricao_tipo_aplicacao: true,
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

    const existente = await prisma.veiculos.findFirst({ where: { veiculo: body.veiculo } })
    if (existente) {
      return reply.code(409).send({
        type: 'https://metalsider.com.br/erros/409',
        title: 'Conflito',
        status: 409,
        detail: `Veículo "${body.veiculo}" já cadastrado`,
      })
    }

    const novo = await prisma.veiculos.create({
      data: {
        veiculo: body.veiculo,
        placa: body.placa ? body.placa.toUpperCase() : null,
        cod_tipo_aplicacao: body.cod_tipo_aplicacao ?? null,
        descricao_tipo_aplicacao: body.descricao_tipo_aplicacao ?? null,
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
        ...(body.veiculo ? { veiculo: body.veiculo } : {}),
        ...(body.placa !== undefined ? { placa: body.placa ? body.placa.toUpperCase() : null } : {}),
        ...(body.cod_tipo_aplicacao !== undefined ? { cod_tipo_aplicacao: body.cod_tipo_aplicacao ?? null } : {}),
        ...(body.descricao_tipo_aplicacao !== undefined ? { descricao_tipo_aplicacao: body.descricao_tipo_aplicacao ?? null } : {}),
      },
      select: SELECT_VEICULO,
    })

    return reply.send({ dados: atualizado })
  })

  // PATCH /veiculos/:id/desativar — soft-delete (somente admin)
  fastify.patch('/veiculos/:id/desativar', { preHandler: ONLY_ADMIN }, async (request, reply) => {
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

    await prisma.veiculos.update({ where: { id }, data: { ativo: false } })
    return reply.code(204).send()
  })

  // DELETE /veiculos/:id — exclusão permanente (somente admin)
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

    const ordens = await prisma.ordens_servico.count({ where: { veiculo_id: id } })
    if (ordens > 0) {
      return reply.code(409).send({
        type: 'https://metalsider.com.br/erros/409',
        title: 'Conflito',
        status: 409,
        detail: `Este veículo possui ${ordens} ordem(ns) de serviço vinculada(s) e não pode ser excluído. Desative-o em vez de excluir.`,
      })
    }

    await prisma.veiculos.delete({ where: { id } })
    return reply.code(204).send()
  })
}
