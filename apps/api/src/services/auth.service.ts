import bcrypt from 'bcrypt'
import type { AtivarContaDTO, LoginDTO, ReenviarCodigoDTO } from '@metalsider/shared'
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
  findUsuarioByEmail,
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

export async function reenviarCodigoService(dto: ReenviarCodigoDTO): Promise<void> {
  const usuario = await findUsuarioByEmail(dto.email)

  if (!usuario || !usuario.ativo) {
    throw httpError(404, 'Usuário não encontrado')
  }

  if (usuario.verificado) {
    throw httpError(409, 'Conta já está ativa')
  }

  const codigo = gerarCodigo()
  const codigoHash = await hashCodigo(codigo)
  const expiraEm = expiracaoCodigo()

  await atualizarCodigo(usuario.id, codigoHash, expiraEm)
  await emailService.enviarCodigoVerificacao(usuario.email, usuario.nome_completo, codigo)
}
