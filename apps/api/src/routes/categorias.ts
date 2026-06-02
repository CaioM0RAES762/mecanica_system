import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import { PerfilUsuario, CriarCategoriaSchema, AtualizarCategoriaSchema } from '@metalsider/shared'

const ONLY_ADMIN = [authenticate, roleGuard([PerfilUsuario.ADMIN])]

const SELECT_CATEGORIA = {
  id: true,
  nome: true,
  cor: true,
  ativo: true,
} as const

export async function categoriasRoutes(fastify: FastifyInstance) {
  // GET /categorias — listagem (autenticado)
  fastify.get('/categorias', { preHandler: [authenticate] }, async (request, reply) => {
    const { ativo } = z.object({ ativo: z.coerce.boolean().optional() }).parse(request.query)
    const categorias = await prisma.categorias.findMany({
      where: { ...(ativo !== undefined ? { ativo } : { ativo: true }) },
      orderBy: { nome: 'asc' },
      select: SELECT_CATEGORIA,
    })
    return reply.send({ dados: categorias })
  })

  // POST /categorias — criar (somente admin)
  fastify.post('/categorias', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const body = CriarCategoriaSchema.parse(request.body)

    const existente = await prisma.categorias.findFirst({
      where: { nome: { equals: body.nome } },
    })
    if (existente) {
      return reply.code(409).send({
        type: 'https://metalsider.com.br/erros/409',
        title: 'Conflito',
        status: 409,
        detail: `Categoria "${body.nome}" já existe`,
      })
    }

    const nova = await prisma.categorias.create({
      data: { nome: body.nome, cor: body.cor ?? null, ativo: true },
      select: SELECT_CATEGORIA,
    })

    return reply.code(201).send({ dados: nova })
  })

  // PATCH /categorias/:id — editar (somente admin)
  fastify.patch('/categorias/:id', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)
    const body = AtualizarCategoriaSchema.parse(request.body)

    const existente = await prisma.categorias.findUnique({ where: { id } })
    if (!existente) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Categoria não encontrada',
      })
    }

    const atualizada = await prisma.categorias.update({
      where: { id },
      data: {
        ...(body.nome ? { nome: body.nome } : {}),
        ...(body.cor !== undefined ? { cor: body.cor } : {}),
      },
      select: SELECT_CATEGORIA,
    })

    return reply.send({ dados: atualizada })
  })

  // PATCH /categorias/:id/desativar — soft-delete (somente admin)
  fastify.patch('/categorias/:id/desativar', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)

    const existente = await prisma.categorias.findUnique({ where: { id } })
    if (!existente) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Categoria não encontrada',
      })
    }

    await prisma.categorias.update({ where: { id }, data: { ativo: false } })
    return reply.code(204).send()
  })

  // DELETE /categorias/:id — exclusão permanente (somente admin)
  fastify.delete('/categorias/:id', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.coerce.number().int().positive() }).parse(request.params)

    const existente = await prisma.categorias.findUnique({ where: { id } })
    if (!existente) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Categoria não encontrada',
      })
    }

    const ordens = await prisma.ordens_servico.count({ where: { categoria_id: id } })
    if (ordens > 0) {
      return reply.code(409).send({
        type: 'https://metalsider.com.br/erros/409',
        title: 'Conflito',
        status: 409,
        detail: `Esta categoria possui ${ordens} ordem(ns) de serviço vinculada(s) e não pode ser excluída. Desative-a em vez de excluir.`,
      })
    }

    await prisma.categorias.delete({ where: { id } })
    return reply.code(204).send()
  })
}
