import type { PerfilUsuario } from '@metalsider/shared'
import type { FastifyReply, FastifyRequest } from 'fastify'

export function roleGuard(roles: PerfilUsuario[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const perfil = request.user?.perfil
    if (!perfil || !roles.includes(perfil)) {
      return reply.code(403).send({
        type: 'https://metalsider.com.br/erros/403',
        title: 'Acesso negado',
        status: 403,
        detail: `Esta ação requer o perfil: ${roles.join(' ou ')}`,
      })
    }
  }
}
