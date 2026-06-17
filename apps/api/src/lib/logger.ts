// Logger estruturado compartilhado para serviços e jobs que não têm acesso à instância Fastify.
// Produz JSON no mesmo formato que o Pino (campo "level" como string, campo "time" em ms).
const NIVEIS = { trace: 10, debug: 20, info: 30, warn: 40, error: 50, fatal: 60 } as const
type Nivel = keyof typeof NIVEIS

function escrever(nivel: Nivel, dados: Record<string, unknown> | string): void {
  const corpo = typeof dados === 'string' ? { mensagem: dados } : dados
  const linha = JSON.stringify({
    level: nivel,
    time: Date.now(),
    ...corpo,
  })
  if (nivel === 'error' || nivel === 'fatal') {
    process.stderr.write(linha + '\n')
  } else {
    process.stdout.write(linha + '\n')
  }
}

export const logger = {
  trace: (dados: Record<string, unknown> | string) => escrever('trace', dados),
  debug: (dados: Record<string, unknown> | string) => escrever('debug', dados),
  info:  (dados: Record<string, unknown> | string) => escrever('info',  dados),
  warn:  (dados: Record<string, unknown> | string) => escrever('warn',  dados),
  error: (dados: Record<string, unknown> | string) => escrever('error', dados),
  fatal: (dados: Record<string, unknown> | string) => escrever('fatal', dados),
}
