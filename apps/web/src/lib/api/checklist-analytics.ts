import type { AnalyticsParams } from './analytics'
import type { TurnoConfigDTO } from '@metalsider/shared'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

function buildParams(p: AnalyticsParams, extra?: Record<string, string>): string {
  const params = new URLSearchParams()
  if (p.periodo) params.set('periodo', p.periodo)
  if (p.de)      params.set('de', p.de)
  if (p.ate)     params.set('ate', p.ate)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) params.set(k, v)
    }
  }
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NcPorItemDTO {
  field_title: string
  manha: number
  tarde: number
  noite: number
  total: number
}

export interface NcPorItemResponse {
  itens: NcPorItemDTO[]
  veiculosDisponiveis: string[]
  turnos: TurnoConfigDTO[]
}

export interface VeiculoResumoDTO {
  veiculo_placa: string
  total_checklists: number
  total_nc: number
  taxa_conformidade: number
}

export interface ConformidadePorVeiculoResponse {
  granularidade: 'dia' | 'semana'
  veiculos: string[]
  series: Array<Record<string, string | number | null>>
  resumo: VeiculoResumoDTO[]
}

export interface FunilNcDTO {
  ncs_detectadas: number
  aprovadas: number
  os_gerada: number
  recusadas: number
  sem_acao: number
  taxa_conversao: number
}

export interface RecenteNcDTO {
  id: string
  veiculo_placa: string | null
  primeiro_item_nc: string | null
  motorista_nome: string | null
  preenchido_em: string | null
  prioridade: string | null
  status: string
}

export interface FunilNcResponse {
  funil: FunilNcDTO
  recentes: RecenteNcDTO[]
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function buscarNcPorItem(
  params: AnalyticsParams,
  token: string,
  veiculoPlaca?: string,
  signal?: AbortSignal,
): Promise<NcPorItemResponse> {
  const extra = veiculoPlaca ? { veiculoPlaca } : undefined
  const res = await fetch(
    `${API_URL}/checklists/analytics/nc-por-item${buildParams(params, extra)}`,
    { headers: authHeaders(token), cache: 'no-store', signal },
  )
  if (!res.ok) throw new Error('Falha ao buscar NC por item')
  return res.json() as Promise<NcPorItemResponse>
}

export async function buscarConformidadePorVeiculo(
  params: AnalyticsParams,
  token: string,
  signal?: AbortSignal,
): Promise<ConformidadePorVeiculoResponse> {
  const res = await fetch(
    `${API_URL}/checklists/analytics/conformidade-por-veiculo${buildParams(params)}`,
    { headers: authHeaders(token), cache: 'no-store', signal },
  )
  if (!res.ok) throw new Error('Falha ao buscar conformidade por veículo')
  return res.json() as Promise<ConformidadePorVeiculoResponse>
}

export async function buscarFunilNc(
  params: AnalyticsParams,
  token: string,
  veiculoPlaca?: string,
  signal?: AbortSignal,
): Promise<FunilNcResponse> {
  const extra = veiculoPlaca ? { veiculoPlaca } : undefined
  const res = await fetch(
    `${API_URL}/checklists/analytics/funil-nc${buildParams(params, extra)}`,
    { headers: authHeaders(token), cache: 'no-store', signal },
  )
  if (!res.ok) throw new Error('Falha ao buscar funil NC')
  return res.json() as Promise<FunilNcResponse>
}
