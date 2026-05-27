import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'

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
    detail: status < 500 ? err.message : 'Erro interno do servidor',
  })
}
