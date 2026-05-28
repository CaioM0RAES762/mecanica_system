import { prisma } from '../lib/prisma.js'

export interface UsuarioAuth {
  id: string
  email: string
  nome_completo: string
  senha_hash: string | null
  perfil: string
  verificado: boolean
  ativo: boolean
  codigo_verificacao: string | null
  codigo_expira_em: Date | null
}

export async function findUsuarioByEmail(email: string): Promise<UsuarioAuth | null> {
  return prisma.usuarios.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      nome_completo: true,
      senha_hash: true,
      perfil: true,
      verificado: true,
      ativo: true,
      codigo_verificacao: true,
      codigo_expira_em: true,
    },
  })
}

export async function ativarConta(id: string, senhaHash: string): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: {
      senha_hash: senhaHash,
      verificado: true,
      codigo_verificacao: null,
      codigo_expira_em: null,
    },
  })
}

export async function atualizarCodigo(
  id: string,
  codigoHash: string,
  expiraEm: Date,
): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: {
      codigo_verificacao: codigoHash,
      codigo_expira_em: expiraEm,
      verificado: false,
    },
  })
}

export async function registrarUltimoAcesso(id: string): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: { ultimo_acesso_em: new Date() },
  })
}

// ---- Cadastro público (D-52, D-53) ----

export async function criarUsuarioPublico(data: {
  email: string
  nome_completo: string
  cargo: string
  perfil: string
  codigoHash: string
  expiraEm: Date
}): Promise<string> {
  const usuario = await prisma.usuarios.create({
    data: {
      email: data.email,
      nome_completo: data.nome_completo,
      cargo: data.cargo,
      perfil: data.perfil,
      verificado: false,
      ativo: true,
      codigo_verificacao: data.codigoHash,
      codigo_expira_em: data.expiraEm,
    },
    select: { id: true },
  })
  return usuario.id
}

export async function atualizarUsuarioNaoVerificado(
  id: string,
  data: {
    nome_completo: string
    cargo: string
    perfil: string
    codigoHash: string
    expiraEm: Date
  },
): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: {
      nome_completo: data.nome_completo,
      cargo: data.cargo,
      perfil: data.perfil,
      codigo_verificacao: data.codigoHash,
      codigo_expira_em: data.expiraEm,
    },
  })
}

export async function finalizarCadastro(id: string, senhaHash: string): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: {
      senha_hash: senhaHash,
      verificado: true,
      codigo_verificacao: null,
      codigo_expira_em: null,
    },
  })
}

// ---- Recuperação de senha (D-54) ----

export async function atualizarCodigoRecuperacao(
  id: string,
  codigoHash: string,
  expiraEm: Date,
): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: {
      codigo_verificacao: codigoHash,
      codigo_expira_em: expiraEm,
    },
  })
}

export async function redefinirSenha(id: string, senhaHash: string): Promise<void> {
  await prisma.usuarios.update({
    where: { id },
    data: {
      senha_hash: senhaHash,
      codigo_verificacao: null,
      codigo_expira_em: null,
    },
  })
}

export async function registrarAuditoriaConta(
  atorId: string,
  acao: string,
): Promise<void> {
  await prisma.logs_auditoria.create({
    data: {
      ator_id: atorId,
      acao,
      ordem_servico_id: null,
    },
  })
}
