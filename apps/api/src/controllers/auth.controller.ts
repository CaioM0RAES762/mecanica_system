import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import type {
  AtivarContaDTO,
  FinalizarCadastroDTO,
  LoginDTO,
  RedefinirSenhaDTO,
  RegistrarDTO,
  ReenviarCodigoDTO,
  SolicitarRecuperacaoSenhaDTO,
  VerificarCodigoCadastroDTO,
} from '@metalsider/shared'
import type { PerfilUsuario } from '@metalsider/shared'
import {
  ativarContaService,
  finalizarCadastroService,
  loginService,
  redefinirSenhaService,
  registrarService,
  reenviarCodigoService,
  solicitarRecuperacaoSenhaService,
  verificarCodigoCadastroService,
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

export async function ativarContaController(body: AtivarContaDTO, reply: FastifyReply) {
  await ativarContaService(body)
  return reply.code(200).send({ message: 'Conta ativada com sucesso' })
}

export async function reenviarCodigoController(body: ReenviarCodigoDTO, reply: FastifyReply) {
  await reenviarCodigoService(body)
  return reply.code(200).send({ mensagem: 'Novo código enviado.' })
}

export async function registrarController(body: RegistrarDTO, reply: FastifyReply) {
  const { criado } = await registrarService(body)
  return reply.code(criado ? 201 : 200).send(
    criado
      ? { mensagem: 'Cadastro iniciado. Verifique seu e-mail.' }
      : { mensagem: 'Novo código de verificação enviado para seu e-mail.' },
  )
}

export async function verificarCodigoCadastroController(
  body: VerificarCodigoCadastroDTO,
  reply: FastifyReply,
) {
  await verificarCodigoCadastroService(body)
  return reply.code(200).send({ valido: true })
}

export async function finalizarCadastroController(body: FinalizarCadastroDTO, reply: FastifyReply) {
  await finalizarCadastroService(body)
  return reply.code(200).send({ mensagem: 'Conta ativada com sucesso.' })
}

export async function solicitarRecuperacaoSenhaController(
  body: SolicitarRecuperacaoSenhaDTO,
  reply: FastifyReply,
) {
  await solicitarRecuperacaoSenhaService(body)
  return reply.code(200).send({
    mensagem: 'Se o e-mail estiver cadastrado, você receberá um código de recuperação.',
  })
}

export async function redefinirSenhaController(body: RedefinirSenhaDTO, reply: FastifyReply) {
  await redefinirSenhaService(body)
  return reply.code(200).send({ mensagem: 'Senha redefinida com sucesso.' })
}

// re-export for tests
export type { FastifyRequest }
