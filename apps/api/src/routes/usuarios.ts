import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { authenticate } from '../middlewares/authenticate.js'
import { roleGuard } from '../middlewares/role-guard.js'
import { PerfilUsuario, AcaoAuditoria, CriarUsuarioSchema, AlterarPerfilSchema } from '@metalsider/shared'
import {
  findTodosUsuarios,
  findUsuarioById,
  createUsuario,
  updatePerfil,
  softDeleteUsuario,
  registrarAuditoriaUsuario,
} from '../repositories/usuarios.repository.js'
import { gerarCodigo, hashCodigo, expiracaoCodigo } from '../lib/codigo_verificacao.js'
import { emailService } from '../lib/email.js'

const DOMAIN = '@metalsider.com.br'

const QuerySchema = z.object({
  perfil: z
    .enum([PerfilUsuario.SUPERVISOR, PerfilUsuario.MECANICO, PerfilUsuario.ADMIN])
    .optional(),
  ativo: z.coerce.boolean().optional(),
})

const ONLY_ADMIN = [authenticate, roleGuard([PerfilUsuario.ADMIN])]
const SUPERVISOR_ADMIN = [
  authenticate,
  roleGuard([PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN]),
]
const ALL_ROLES = [
  authenticate,
  roleGuard([PerfilUsuario.SUPERVISOR, PerfilUsuario.ADMIN, PerfilUsuario.MECANICO]),
]

export async function usuariosRoutes(fastify: FastifyInstance) {
  // GET /usuarios/eu — perfil do usuário autenticado
  fastify.get('/usuarios/eu', { preHandler: [authenticate] }, async (request, reply) => {
    const { sub } = request.user
    const usuario = await findUsuarioById(sub)
    if (!usuario) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Usuário não encontrado',
      })
    }
    return reply.send({ dados: usuario })
  })

  // GET /usuarios — listagem (todos os perfis autenticados; mecânicos usam para selecionar responsável ao fechar OS)
  fastify.get('/usuarios', { preHandler: ALL_ROLES }, async (request, reply) => {
    const { perfil, ativo } = QuerySchema.parse(request.query)
    const usuarios = await findTodosUsuarios({ perfil, ativo })
    return reply.send({ dados: usuarios })
  })

  // POST /usuarios — criar usuário (somente admin)
  fastify.post('/usuarios', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const body = CriarUsuarioSchema.parse(request.body)

    if (!body.email.endsWith(DOMAIN)) {
      return reply.code(400).send({
        type: 'https://metalsider.com.br/erros/dominio',
        title: 'Domínio inválido',
        status: 400,
        detail: `Acesso restrito a contas corporativas Metalsider (${DOMAIN})`,
      })
    }

    const codigo = gerarCodigo()
    const codigoHash = await hashCodigo(codigo)
    const expiraEm = expiracaoCodigo()

    const novo = await createUsuario({
      email: body.email,
      nome_completo: body.nome_completo,
      perfil: body.perfil,
      codigoHash,
      expiraEm,
    })

    await emailService.enviarCodigoVerificacao(body.email, body.nome_completo, codigo)

    await registrarAuditoriaUsuario({
      atorId: request.user.sub,
      acao: AcaoAuditoria.USUARIO_CRIADO,
      novosValores: { id: novo.id, email: novo.email, perfil: novo.perfil },
    })

    return reply.code(201).send({ dados: novo })
  })

  // GET /usuarios/:id — detalhe (supervisor e admin)
  fastify.get('/usuarios/:id', { preHandler: SUPERVISOR_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const usuario = await findUsuarioById(id)
    if (!usuario) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Usuário não encontrado',
      })
    }
    return reply.send({ dados: usuario })
  })

  // PATCH /usuarios/:id/perfil — alterar perfil (somente admin)
  fastify.patch('/usuarios/:id/perfil', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)
    const { perfil } = AlterarPerfilSchema.parse(request.body)

    const anterior = await findUsuarioById(id)
    if (!anterior) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Usuário não encontrado',
      })
    }

    const atualizado = await updatePerfil(id, perfil)

    await registrarAuditoriaUsuario({
      atorId: request.user.sub,
      acao: AcaoAuditoria.USUARIO_PERFIL_ALTERADO,
      valoresAnteriores: { perfil: anterior.perfil },
      novosValores: { id, perfil },
    })

    return reply.send({ dados: atualizado })
  })

  // PATCH /usuarios/:id/desativar — soft-delete (somente admin)
  fastify.patch('/usuarios/:id/desativar', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const usuario = await findUsuarioById(id)
    if (!usuario) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Usuário não encontrado',
      })
    }

    if (usuario.id === request.user.sub) {
      return reply.code(400).send({
        type: 'https://metalsider.com.br/erros/auto-desativacao',
        title: 'Operação inválida',
        status: 400,
        detail: 'Administrador não pode desativar a própria conta',
      })
    }

    await softDeleteUsuario(id)

    await registrarAuditoriaUsuario({
      atorId: request.user.sub,
      acao: AcaoAuditoria.USUARIO_DESATIVADO,
      valoresAnteriores: { id, email: usuario.email, ativo: true },
      novosValores: { id, ativo: false },
    })

    return reply.code(204).send()
  })

  // DELETE /usuarios/:id — exclusão permanente (somente admin)
  fastify.delete('/usuarios/:id', { preHandler: ONLY_ADMIN }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

    const usuario = await findUsuarioById(id)
    if (!usuario) {
      return reply.code(404).send({
        type: 'https://metalsider.com.br/erros/404',
        title: 'Não encontrado',
        status: 404,
        detail: 'Usuário não encontrado',
      })
    }

    if (usuario.id === request.user.sub) {
      return reply.code(400).send({
        type: 'https://metalsider.com.br/erros/auto-desativacao',
        title: 'Operação inválida',
        status: 400,
        detail: 'Administrador não pode excluir a própria conta',
      })
    }

    const [osSupervisor, osMecanico, fechamentos, logs] = await Promise.all([
      prisma.ordens_servico.count({ where: { supervisor_id: id } }),
      prisma.ordens_servico.count({ where: { mecanico_id: id } }),
      prisma.registros_fechamento.count({ where: { fechado_por_id: id } }),
      prisma.logs_auditoria.count({ where: { ator_id: id } }),
    ])

    const total = osSupervisor + osMecanico + fechamentos + logs
    if (total > 0) {
      return reply.code(409).send({
        type: 'https://metalsider.com.br/erros/409',
        title: 'Conflito',
        status: 409,
        detail: 'Este usuário possui registros vinculados (ordens de serviço, fechamentos ou logs de auditoria) e não pode ser excluído permanentemente. Desative-o em vez de excluir.',
      })
    }

    await prisma.usuarios.delete({ where: { id } })

    return reply.code(204).send()
  })
}
