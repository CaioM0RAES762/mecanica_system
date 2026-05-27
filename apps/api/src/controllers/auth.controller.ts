import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type { AtivarContaDTO, LoginDTO, ReenviarCodigoDTO } from '@metalsider/shared'
import type { PerfilUsuario } from '@metalsider/shared'
import {
  ativarContaService,
  loginService,
  reenviarCodigoService,
} from '../services/auth.service.js'

export async function loginController(
  fastify: FastifyInstance,
  body: LoginDTO,
  reply: FastifyReply,
) {
  const usuario = await loginService(body)

  const token = fastify.jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      perfil: usuario.perfil as PerfilUsuario,
      nome_completo: usuario.nome_completo,
    },
    { expiresIn: '8h' },
  )

  return reply.code(200).send({
    token,
    user: {
      id: usuario.id,
      email: usuario.email,
      nome_completo: usuario.nome_completo,
      perfil: usuario.perfil,
    },
  })
}

export async function ativarContaController(
  body: AtivarContaDTO,
  reply: FastifyReply,
) {
  await ativarContaService(body)
  return reply.code(200).send({ message: 'Conta ativada com sucesso' })
}

export async function reenviarCodigoController(
  body: ReenviarCodigoDTO,
  reply: FastifyReply,
) {
  await reenviarCodigoService(body)
  return reply.code(200).send({ message: 'Código reenviado com sucesso' })
}

// re-export for tests
export type { FastifyRequest }
