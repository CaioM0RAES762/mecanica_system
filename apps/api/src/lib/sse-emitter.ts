export type TipoEventoOS = 'criado' | 'atualizado' | 'fechado' | 'excluido'

export interface EventoOS {
  tipo: TipoEventoOS
  id: number
}

type Handler = (e: EventoOS) => void
const handlers = new Set<Handler>()

export function registrarClienteSSE(h: Handler): () => void {
  handlers.add(h)
  return () => handlers.delete(h)
}

export function emitirEventoOS(e: EventoOS): void {
  for (const h of handlers) {
    try { h(e) } catch { /* cliente desconectado ou com erro — ignorar */ }
  }
}
