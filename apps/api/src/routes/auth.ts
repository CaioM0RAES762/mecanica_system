import type { FastifyInstance, RouteShorthandOptions } from 'fastify'
import {
  AtivarContaSchema,
  FinalizarCadastroSchema,
  LoginSchema,
  RedefinirSenhaSchema,
  RegistrarSchema,
  ReenviarCodigoSchema,
  SolicitarRecuperacaoSenhaSchema,
  VerificarCodigoCadastroSchema,
} from '@metalsider/shared'
import {
  ativarContaController,
  finalizarCadastroController,
  loginController,
  redefinirSenhaController,
  registrarController,
  reenviarCodigoController,
  solicitarRecuperacaoSenhaController,
  verificarCodigoCadastroController,
} from '../controllers/auth.controller.js'

function rl(max: number): RouteShorthandOptions {
  if (process.env['NODE_ENV'] === 'test') return {}
  return { config: { rateLimit: { max, timeWindow: '1 minute' } } }
}

export async function authRoutes(fastify: FastifyInstance) {
  // Login — 5 req/min por IP
  fastify.post('/auth/login', rl(5), async (request, reply) => {
    const body = LoginSchema.parse(request.body)
    return loginController(fastify, body, reply)
  })

  // Ativar conta (fluxo legado admin) — 5 req/min por IP
  fastify.post('/auth/ativar-conta', rl(5), async (request, reply) => {
    const body = AtivarContaSchema.parse(request.body)
    return ativarContaController(body, reply)
  })

  // Reenviar código (agora público, sem auth) — 3 req/min por IP
  fastify.post('/auth/reenviar-codigo', rl(3), async (request, reply) => {
    const body = ReenviarCodigoSchema.parse(request.body)
    return reenviarCodigoController(body, reply)
  })

  // Registrar (cadastro público) — 5 req/min por IP
  fastify.post('/auth/registrar', rl(5), async (request, reply) => {
    const body = RegistrarSchema.parse(request.body)
    return registrarController(body, reply)
  })

  // Verificar código de cadastro — 10 req/min por IP
  fastify.post('/auth/verificar-codigo-cadastro', rl(10), async (request, reply) => {
    const body = VerificarCodigoCadastroSchema.parse(request.body)
    return verificarCodigoCadastroController(body, reply)
  })

  // Finalizar cadastro — 5 req/min por IP
  fastify.post('/auth/finalizar-cadastro', rl(5), async (request, reply) => {
    const body = FinalizarCadastroSchema.parse(request.body)
    return finalizarCadastroController(body, reply)
  })

  // Solicitar recuperação de senha — 3 req/min por IP
  fastify.post('/auth/solicitar-recuperacao-senha', rl(3), async (request, reply) => {
    const body = SolicitarRecuperacaoSenhaSchema.parse(request.body)
    return solicitarRecuperacaoSenhaController(body, reply)
  })

  // Redefinir senha — 5 req/min por IP
  fastify.post('/auth/redefinir-senha', rl(5), async (request, reply) => {
    const body = RedefinirSenhaSchema.parse(request.body)
    return redefinirSenhaController(body, reply)
  })
}
