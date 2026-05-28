import bcrypt from 'bcrypt'
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
import { emailService } from '../lib/email.js'
import {
  expiracaoCodigo,
  gerarCodigo,
  hashCodigo,
  validarCodigo,
} from '../lib/codigo_verificacao.js'
import {
  ativarConta,
  atualizarCodigo,
  atualizarCodigoRecuperacao,
  atualizarUsuarioNaoVerificado,
  criarUsuarioPublico,
  finalizarCadastro,
  findUsuarioByEmail,
  redefinirSenha,
  registrarAuditoriaConta,
  registrarUltimoAcesso,
  type UsuarioAuth,
} from '../repositories/auth.repository.js'

const SALT_ROUNDS = Number(process.env['BCRYPT_SALT_ROUNDS'] ?? 12)

function httpError(statusCode: number, message: string, code?: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code?: string }
  err.statusCode = statusCode
  if (code) err.code = code
  return err
}

// ---- Login ----

export async function loginService(dto: LoginDTO): Promise<UsuarioAuth> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.ativo) {
    throw httpError(401, 'E-mail ou senha incorretos')
  }

  if (!usuario.verificado || !usuario.senha_hash) {
    throw httpError(403, 'Conta ainda não ativada. Verifique seu e-mail.', 'CONTA_NAO_VERIFICADA')
  }

  const senhaValida = await bcrypt.compare(dto.password, usuario.senha_hash)
  if (!senhaValida) {
    throw httpError(401, 'E-mail ou senha incorretos')
  }

  await registrarUltimoAcesso(usuario.id)
  return usuario
}

// ---- Ativar conta (fluxo legado admin) ----

export async function ativarContaService(dto: AtivarContaDTO): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.ativo) {
    throw httpError(404, 'E-mail não encontrado')
  }

  if (usuario.verificado) {
    throw httpError(409, 'Conta já está ativa')
  }

  if (!usuario.codigo_verificacao || !usuario.codigo_expira_em) {
    throw httpError(400, 'Código de verificação não disponível')
  }

  if (new Date() > usuario.codigo_expira_em) {
    throw httpError(410, 'Código de verificação expirado')
  }

  const codigoValido = await validarCodigo(dto.codigo, usuario.codigo_verificacao)
  if (!codigoValido) {
    throw httpError(400, 'Código de verificação inválido')
  }

  const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS)
  await ativarConta(usuario.id, senhaHash)
}

// ---- Reenviar código (legado admin, agora também público via /auth/reenviar-codigo) ----

export async function reenviarCodigoService(dto: ReenviarCodigoDTO): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.ativo || usuario.verificado) {
    throw httpError(400, 'Solicitação inválida')
  }

  const codigo = gerarCodigo()
  const codigoHash = await hashCodigo(codigo)
  const expiraEm = expiracaoCodigo()

  await atualizarCodigo(usuario.id, codigoHash, expiraEm)
  await emailService.enviarCodigoVerificacao(usuario.email, usuario.nome_completo, codigo)
}

// ---- Cadastro público (D-52, D-53) ----

export async function registrarService(dto: RegistrarDTO): Promise<{ criado: boolean }> {
  // dto.perfil é 'supervisor' | 'mecanico' — admin bloqueado pelo RegistrarSchema (Zod)
  const usuarioExistente = await findUsuarioByEmail(dto.email)

  if (usuarioExistente) {
    if (usuarioExistente.verificado) {
      throw httpError(409, 'Conta já cadastrada. Faça login ou recupere sua senha.')
    }

    const codigo = gerarCodigo()
    const codigoHash = await hashCodigo(codigo)
    const expiraEm = expiracaoCodigo()

    await atualizarUsuarioNaoVerificado(usuarioExistente.id, {
      nome_completo: dto.nome_completo,
      cargo: dto.cargo,
      perfil: dto.perfil,
      codigoHash,
      expiraEm,
    })

    await emailService.enviarCodigoVerificacao(dto.email, dto.nome_completo, codigo)
    return { criado: false }
  }

  const codigo = gerarCodigo()
  const codigoHash = await hashCodigo(codigo)
  const expiraEm = expiracaoCodigo()

  await criarUsuarioPublico({
    email: dto.email,
    nome_completo: dto.nome_completo,
    cargo: dto.cargo,
    perfil: dto.perfil,
    codigoHash,
    expiraEm,
  })

  await emailService.enviarCodigoVerificacao(dto.email, dto.nome_completo, codigo)
  return { criado: true }
}

export async function verificarCodigoCadastroService(
  dto: VerificarCodigoCadastroDTO,
): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.ativo || usuario.verificado) {
    throw httpError(400, 'Solicitação inválida')
  }

  if (!usuario.codigo_verificacao || !usuario.codigo_expira_em) {
    throw httpError(400, 'Solicitação inválida')
  }

  if (new Date() > usuario.codigo_expira_em) {
    throw httpError(400, 'Código expirado. Solicite um novo código.')
  }

  const codigoValido = await validarCodigo(dto.codigo, usuario.codigo_verificacao)
  if (!codigoValido) {
    throw httpError(400, 'Código incorreto.')
  }
}

export async function finalizarCadastroService(dto: FinalizarCadastroDTO): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.ativo || usuario.verificado) {
    throw httpError(400, 'Solicitação inválida')
  }

  if (!usuario.codigo_verificacao || !usuario.codigo_expira_em) {
    throw httpError(400, 'Código de verificação não disponível')
  }

  if (new Date() > usuario.codigo_expira_em) {
    throw httpError(400, 'Código expirado. Solicite um novo código.')
  }

  const codigoValido = await validarCodigo(dto.codigo, usuario.codigo_verificacao)
  if (!codigoValido) {
    throw httpError(400, 'Código incorreto.')
  }

  const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS)
  await finalizarCadastro(usuario.id, senhaHash)
  await registrarAuditoriaConta(usuario.id, 'CONTA_ATIVADA')
}

// ---- Recuperação de senha (D-54) ----

export async function solicitarRecuperacaoSenhaService(
  dto: SolicitarRecuperacaoSenhaDTO,
): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (usuario && usuario.verificado && usuario.ativo) {
    const codigo = gerarCodigo()
    const codigoHash = await hashCodigo(codigo)
    const expiraEm = expiracaoCodigo()

    await atualizarCodigoRecuperacao(usuario.id, codigoHash, expiraEm)
    await emailService.enviarCodigoRecuperacaoSenha(usuario.email, codigo)
  }
  // Sempre retorna sem erro — resposta genérica para evitar enumeração de usuários (D-54)
}

export async function redefinirSenhaService(dto: RedefinirSenhaDTO): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.verificado || !usuario.ativo) {
    throw httpError(400, 'Solicitação inválida')
  }

  if (!usuario.codigo_verificacao || !usuario.codigo_expira_em) {
    throw httpError(400, 'Solicitação inválida')
  }

  if (new Date() > usuario.codigo_expira_em) {
    throw httpError(400, 'Código expirado. Solicite um novo código.')
  }

  const codigoValido = await validarCodigo(dto.codigo, usuario.codigo_verificacao)
  if (!codigoValido) {
    throw httpError(400, 'Código incorreto.')
  }

  const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS)
  await redefinirSenha(usuario.id, senhaHash)
  await registrarAuditoriaConta(usuario.id, 'SENHA_REDEFINIDA')
}
