import type { FastifyReply, FastifyRequest } from 'fastify'
import type { CriarOSDTO, AtualizarOSDTO, FecharOSDTO, FiltroOSDTO } from '@metalsider/shared'
import {
  listarOSService,
  contarOSService,
  buscarOSService,
  criarOSService,
  atualizarOSService,
  fecharOSService,
  excluirOSService,
  buscarAuditoriaService,
} from '../services/ordens-servico.service.js'
import type { JwtPayload } from '../middlewares/authenticate.js'

export async function contagemOSController(
  request: FastifyRequest<{ Querystring: FiltroOSDTO }>,
  reply: FastifyReply,
) {
  const total = await contarOSService(request.query)
  return reply.code(200).send({ total })
}

export async function listarOSController(
  request: FastifyRequest<{ Querystring: FiltroOSDTO }>,
  reply: FastifyReply,
) {
  const resultado = await listarOSService(request.query, request.user as JwtPayload)
  return reply.code(200).send(resultado)
}

export async function buscarOSController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = parseInt(request.params.id, 10)
  if (isNaN(id)) {
    return reply.code(400).send({
      type:   'https://metalsider.com.br/erros/400',
      title:  'Parâmetro inválido',
      status: 400,
      detail: 'O parâmetro :id deve ser um número inteiro',
    })
  }
  const os = await buscarOSService(id, request.user as JwtPayload)
  return reply.code(200).send(os)
}

export async function criarOSController(
  request: FastifyRequest<{ Body: CriarOSDTO }>,
  reply: FastifyReply,
) {
  const ator = request.user as JwtPayload
  const os   = await criarOSService(request.body, ator.sub)
  return reply.code(201).header('Location', `/api/v1/ordens-servico/${os.id}`).send(os)
}

export async function atualizarOSController(
  request: FastifyRequest<{ Params: { id: string }; Body: AtualizarOSDTO }>,
  reply: FastifyReply,
) {
  const id = parseInt(request.params.id, 10)
  if (isNaN(id)) {
    return reply.code(400).send({
      type:   'https://metalsider.com.br/erros/400',
      title:  'Parâmetro inválido',
      status: 400,
      detail: 'O parâmetro :id deve ser um número inteiro',
    })
  }
  const os = await atualizarOSService(id, request.body, request.user as JwtPayload)
  return reply.code(200).send(os)
}

export async function fecharOSController(
  request: FastifyRequest<{ Params: { id: string }; Body: FecharOSDTO }>,
  reply: FastifyReply,
) {
  const id = parseInt(request.params.id, 10)
  if (isNaN(id)) {
    return reply.code(400).send({
      type:   'https://metalsider.com.br/erros/400',
      title:  'Parâmetro inválido',
      status: 400,
      detail: 'O parâmetro :id deve ser um número inteiro',
    })
  }
  const os = await fecharOSService(id, request.body, request.user as JwtPayload)
  return reply.code(200).send(os)
}

export async function excluirOSController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = parseInt(request.params.id, 10)
  if (isNaN(id)) {
    return reply.code(400).send({
      type:   'https://metalsider.com.br/erros/400',
      title:  'Parâmetro inválido',
      status: 400,
      detail: 'O parâmetro :id deve ser um número inteiro',
    })
  }
  await excluirOSService(id, request.user as JwtPayload)
  return reply.code(204).send()
}

export async function buscarAuditoriaController(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply,
) {
  const id = parseInt(request.params.id, 10)
  if (isNaN(id)) {
    return reply.code(400).send({
      type:   'https://metalsider.com.br/erros/400',
      title:  'Parâmetro inválido',
      status: 400,
      detail: 'O parâmetro :id deve ser um número inteiro',
    })
  }
  const logs = await buscarAuditoriaService(id)
  return reply.code(200).send({ dados: logs })
}
