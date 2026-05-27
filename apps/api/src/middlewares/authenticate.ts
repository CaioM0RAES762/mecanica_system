import '@fastify/jwt'
import type { PerfilUsuario } from '@metalsider/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JwtPayload
    user: JwtPayload
  }
}

export interface JwtPayload {
  sub: string
  email: string
  perfil: PerfilUsuario
  nome_completo: string
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify()
  } catch {
    reply.code(401).send({
      type: 'https://metalsider.com.br/erros/401',
      title: 'Não autorizado',
      status: 401,
      detail: 'Token de autenticação inválido ou ausente',
    })
  }
}
