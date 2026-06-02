export type AuditBadgeVariant =
  | 'aberto'
  | 'fechado'
  | 'atrasado'
  | 'baixa'
  | 'media'
  | 'alta'
  | 'critica'
  | 'neutro'

export interface AuditDetail {
  label: string
  value: string
  variant: AuditBadgeVariant
}

const STATUS_MAP: Record<string, { value: string; variant: AuditBadgeVariant }> = {
  aberto:       { value: 'Aberto',       variant: 'aberto' },
  fechado:      { value: 'Fechado',      variant: 'fechado' },
  em_andamento: { value: 'Em andamento', variant: 'aberto' },
  atrasado:     { value: 'Atrasado',     variant: 'atrasado' },
}

const RESULTADO_MAP: Record<string, { value: string; variant: AuditBadgeVariant }> = {
  concluido:     { value: 'Concluído',              variant: 'fechado' },
  resolvido:     { value: 'Resolvido',              variant: 'fechado' },
  nao_resolvido: { value: 'Não resolvido',          variant: 'atrasado' },
  parcial:       { value: 'Parcialmente resolvido', variant: 'media' },
}

const PRIORIDADE_MAP: Record<string, { value: string; variant: AuditBadgeVariant }> = {
  critica: { value: 'Crítica', variant: 'critica' },
  alta:    { value: 'Alta',    variant: 'alta' },
  media:   { value: 'Média',   variant: 'media' },
  baixa:   { value: 'Baixa',   variant: 'baixa' },
}

const SKIP_KEYS = new Set(['id', 'ordem_servico_id', 'atualizado_em', 'criado_em'])

function snakeToTitleCase(s: string): string {
  return s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function parseAuditDetails(
  input: Record<string, unknown> | string | null,
): AuditDetail[] {
  if (!input) return []

  let values: Record<string, unknown>
  if (typeof input === 'string') {
    try {
      values = JSON.parse(input) as Record<string, unknown>
    } catch {
      return []
    }
  } else {
    values = input
  }

  const details: AuditDetail[] = []

  for (const [key, raw] of Object.entries(values)) {
    if (SKIP_KEYS.has(key)) continue
    const val = String(raw ?? '')

    if (key === 'status') {
      const m = STATUS_MAP[val]
      details.push(m ? { label: 'Status', ...m } : { label: 'Status', value: val, variant: 'neutro' })
    } else if (key === 'resultado') {
      const m = RESULTADO_MAP[val]
      details.push(m ? { label: 'Resultado', ...m } : { label: 'Resultado', value: val, variant: 'neutro' })
    } else if (key === 'prioridade') {
      const m = PRIORIDADE_MAP[val]
      details.push(m ? { label: 'Prioridade', ...m } : { label: 'Prioridade', value: val, variant: 'neutro' })
    } else if (key === 'mecanico_id') {
      const truncated = val.length > 8 ? `${val.slice(0, 8)}…` : val
      details.push({ label: 'Mecânico', value: truncated, variant: 'neutro' })
    } else if (key === 'titulo') {
      const capitalized = val ? val.charAt(0).toUpperCase() + val.slice(1) : val
      details.push({ label: 'Título', value: capitalized, variant: 'neutro' })
    } else {
      details.push({ label: snakeToTitleCase(key), value: val, variant: 'neutro' })
    }
  }

  return details
}

export function formatTempoTotal(criadoEm: string, fechadoEm: string | null): string {
  if (!fechadoEm) return '—'
  const ms = new Date(fechadoEm).getTime() - new Date(criadoEm).getTime()
  if (ms <= 0) return '—'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  if (h === 0) return `${m}min`
  return `${h}h ${m}min`
}
