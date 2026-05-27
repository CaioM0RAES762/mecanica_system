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

export async function ativarConta(
  id: string,
  senhaHash: string,
): Promise<void> {
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
