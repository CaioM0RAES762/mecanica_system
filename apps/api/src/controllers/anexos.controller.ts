import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '../middlewares/authenticate.js'
import { uploadAnexoService, removerAnexoService } from '../services/anexos.service.js'

interface AnexoParams { id: string; anexo_id: string }

export async function uploadAnexoController(
  request: FastifyRequest<{ Params: { id: string } }> & { user: JwtPayload },
  reply: FastifyReply,
) {
  const osId = parseInt(request.params.id, 10)
  if (isNaN(osId)) return reply.code(400).send({ message: 'ID inválido' })

  const data = await request.file()
  if (!data) return reply.code(400).send({ message: 'Nenhum arquivo enviado' })

  const result = await uploadAnexoService(
    osId,
    data.file,
    data.filename,
    data.mimetype,
    data.file.readableLength > 0 ? data.file.readableLength : undefined,
    request.user,
  )

  return reply.code(201).send(result)
}

export async function removerAnexoController(
  request: FastifyRequest<{ Params: AnexoParams }> & { user: JwtPayload },
  reply: FastifyReply,
) {
  const osId     = parseInt(request.params.id, 10)
  const anexoId  = parseInt(request.params.anexo_id, 10)
  if (isNaN(osId) || isNaN(anexoId)) return reply.code(400).send({ message: 'ID inválido' })

  const result = await removerAnexoService(
    osId,
    anexoId,
    request.user,
  )
  return reply.send(result)
}
