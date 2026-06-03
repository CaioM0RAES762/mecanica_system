import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

const MENSAGENS_PT: Record<string, string> = {
  "Body cannot be empty when content-type is set to 'application/json'": 'O corpo da requisição não pode estar vazio',
  'Not Found': 'Rota não encontrada',
  'Method Not Allowed': 'Método não permitido',
  'Unauthorized': 'Não autorizado',
  'Forbidden': 'Acesso negado',
}

function traduzirMensagem(msg: string): string {
  return MENSAGENS_PT[msg] ?? msg
}

export function zodErrorHandler(
  err: FastifyError,
  _req: FastifyRequest,
  reply: FastifyReply,
) {
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {}
    for (const issue of err.issues) {
      const field = issue.path.join('.') || '_root'
      errors[field] ??= []
      errors[field]!.push(issue.message)
    }

    return reply.status(422).send({
      type: 'https://metalsider.com.br/erros/validacao',
      title: 'Falha de validação',
      status: 422,
      detail: err.issues[0]?.message,
      errors,
    })
  }

  const status = err.statusCode ?? 500

  if (status >= 500) {
    reply.log.error(err)
  }

  return reply.status(status).send({
    type: `https://metalsider.com.br/erros/${status}`,
    title: err.name ?? 'Erro interno',
    status,
    detail: status < 500 ? traduzirMensagem(err.message) : 'Erro interno do servidor',
  })
}
