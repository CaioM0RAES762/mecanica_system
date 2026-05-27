import bcrypt from 'bcrypt'
import crypto from 'crypto'

const SALT_ROUNDS = Number(process.env['BCRYPT_SALT_ROUNDS'] ?? 12)

export function gerarCodigo(): string {
  return crypto.randomInt(100000, 999999).toString()
}

export async function hashCodigo(codigo: string): Promise<string> {
  return bcrypt.hash(codigo, SALT_ROUNDS)
}

export async function validarCodigo(codigo: string, hash: string): Promise<boolean> {
  return bcrypt.compare(codigo, hash)
}

export function expiracaoCodigo(): Date {
  const minutos = Number(process.env['CODE_EXPIRY_MINUTES'] ?? 30)
  return new Date(Date.now() + minutos * 60 * 1000)
}
