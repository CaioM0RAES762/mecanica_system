import { AcaoAuditoria, PerfilUsuario } from '@metalsider/shared'
import type { JwtPayload } from '../middlewares/authenticate.js'
import { findOSById } from '../repositories/ordens-servico.repository.js'
import {
  createAnexo,
  findAnexoById,
  deleteAnexo,
} from '../repositories/anexos.repository.js'
import { criarAuditoria } from '../repositories/ordens-servico.repository.js'
import { getStorageAdapter } from '../lib/storage.js'
import type { Readable } from 'node:stream'

const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB (CLAUDE.md)

function httpError(statusCode: number, message: string): Error {
  const err = new Error(message) as Error & { statusCode: number }
  err.statusCode = statusCode
  return err
}

export async function uploadAnexoService(
  osId: number,
  stream: Readable,
  filename: string,
  mimetype: string,
  filesize: number | undefined,
  ator: JwtPayload,
) {
  const os = await findOSById(osId)
  if (!os) throw httpError(404, `OS #${osId} não encontrada`)

  if (filesize !== undefined && filesize > MAX_SIZE_BYTES) {
    throw httpError(413, 'Arquivo excede o limite de 10 MB')
  }

  const storage = getStorageAdapter()
  const uploaded = await storage.upload(stream, filename, mimetype)

  if (uploaded.tamanho_bytes > MAX_SIZE_BYTES) {
    await storage.delete(uploaded.url).catch(() => {})
    throw httpError(413, 'Arquivo excede o limite de 10 MB')
  }

  const anexo = await createAnexo({
    ordem_servico_id: osId,
    nome_arquivo:     uploaded.nome_arquivo,
    url:              uploaded.url,
    tipo:             uploaded.tipo,
    tamanho_bytes:    uploaded.tamanho_bytes,
    enviado_por_id:   ator.sub,
  })

  await criarAuditoria({
    ordem_servico_id:  osId,
    ator_id:           ator.sub,
    acao:              AcaoAuditoria.ANEXO_ENVIADO,
    novos_valores:     JSON.stringify({ nome_arquivo: filename, tamanho_bytes: uploaded.tamanho_bytes }),
  })

  return {
    ...anexo,
    url: storage.publicUrl(anexo.url),
  }
}

export async function removerAnexoService(
  osId: number,
  anexoId: number,
  ator: JwtPayload,
) {
  if (ator.perfil === PerfilUsuario.MECANICO) {
    throw httpError(403, 'Mecânico não pode remover anexos')
  }

  const os = await findOSById(osId)
  if (!os) throw httpError(404, `OS #${osId} não encontrada`)

  const anexo = await findAnexoById(anexoId)
  if (!anexo || anexo.ordem_servico_id !== osId) {
    throw httpError(404, `Anexo #${anexoId} não encontrado nesta OS`)
  }

  const storage = getStorageAdapter()
  await storage.delete(anexo.url).catch(() => {})

  await deleteAnexo(anexoId)

  await criarAuditoria({
    ordem_servico_id:  osId,
    ator_id:           ator.sub,
    acao:              AcaoAuditoria.ANEXO_REMOVIDO,
    valores_anteriores: JSON.stringify({ nome_arquivo: anexo.nome_arquivo }),
  })

  return { removido: true }
}
