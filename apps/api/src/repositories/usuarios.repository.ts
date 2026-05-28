import { prisma } from '../lib/prisma.js'

export interface UsuarioPublico {
  id: string
  email: string
  nome_completo: string
  perfil: string
  verificado: boolean
  ativo: boolean
  criado_em: Date
  ultimo_acesso_em: Date | null
}

const SELECT_PUBLICO = {
  id: true,
  email: true,
  nome_completo: true,
  perfil: true,
  verificado: true,
  ativo: true,
  criado_em: true,
  ultimo_acesso_em: true,
} as const

export async function findTodosUsuarios(filtro?: {
  perfil?: string
  ativo?: boolean
}): Promise<UsuarioPublico[]> {
  return prisma.usuarios.findMany({
    where: {
      ...(filtro?.ativo !== undefined ? { ativo: filtro.ativo } : {}),
      ...(filtro?.perfil ? { perfil: filtro.perfil } : {}),
    },
    orderBy: { nome_completo: 'asc' },
    select: SELECT_PUBLICO,
  })
}

export async function findUsuarioById(id: string): Promise<UsuarioPublico | null> {
  return prisma.usuarios.findUnique({
    where: { id },
    select: SELECT_PUBLICO,
  })
}

export async function createUsuario(data: {
  email: string
  nome_completo: string
  perfil: string
  codigoHash: string
  expiraEm: Date
}): Promise<UsuarioPublico> {
  return prisma.usuarios.create({
    data: {
      email: data.email,
      nome_completo: data.nome_completo,
      perfil: data.perfil,
      codigo_verificacao: data.codigoHash,
      codigo_expira_em: data.expiraEm,
      verificado: false,
      ativo: true,
    },
    select: SELECT_PUBLICO,
  })
}

export async function updatePerfil(id: string, perfil: string): Promise<UsuarioPublico> {
  return prisma.usuarios.update({
    where: { id },
    data: { perfil },
    select: SELECT_PUBLICO,
  })
}

export async function softDeleteUsuario(id: string): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: { ativo: false },
  })
}

export async function registrarAuditoriaUsuario(params: {
  atorId: string
  acao: string
  novosValores?: Record<string, unknown>
  valoresAnteriores?: Record<string, unknown>
}): Promise<void> {
  await prisma.logs_auditoria.create({
    data: {
      ator_id: params.atorId,
      acao: params.acao,
      novos_valores: params.novosValores ? JSON.stringify(params.novosValores) : null,
      valores_anteriores: params.valoresAnteriores ? JSON.stringify(params.valoresAnteriores) : null,
    },
  })
}
