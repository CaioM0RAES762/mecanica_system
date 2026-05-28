import type {
  KpiDTO,
  CategoriaVolumeDTO,
  TendenciaDTO,
  PrioridadeVolumeDTO,
  RankingMecanicoDTO,
  HeatmapDTO,
  OSMaisLongaDTO,
  AtrasadosPorCategoriaDTO,
} from '@metalsider/shared'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export interface AnalyticsParams {
  periodo?: '7d' | '30d' | '90d' | 'personalizado'
  de?: string
  ate?: string
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` }
}

function buildParams(p: AnalyticsParams): string {
  const params = new URLSearchParams()
  if (p.periodo) params.set('periodo', p.periodo)
  if (p.de)      params.set('de', p.de)
  if (p.ate)     params.set('ate', p.ate)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

async function get<T>(path: string, params: AnalyticsParams, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}${buildParams(params)}`, {
    headers: authHeaders(token),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Falha ao buscar ${path}`)
  return res.json() as Promise<T>
}

export function buscarKpis(params: AnalyticsParams, token: string) {
  return get<KpiDTO>('/analytics/kpis', params, token)
}

export function buscarPorCategoria(params: AnalyticsParams, token: string) {
  return get<CategoriaVolumeDTO[]>('/analytics/por-categoria', params, token)
}

export function buscarTendencia(params: AnalyticsParams, token: string) {
  return get<TendenciaDTO[]>('/analytics/tendencia', params, token)
}

export function buscarPorPrioridade(params: AnalyticsParams, token: string) {
  return get<PrioridadeVolumeDTO[]>('/analytics/por-prioridade', params, token)
}

export function buscarMecanicos(params: AnalyticsParams, token: string) {
  return get<RankingMecanicoDTO[]>('/analytics/mecanicos', params, token)
}

export function buscarHeatmap(params: AnalyticsParams, token: string) {
  return get<HeatmapDTO[]>('/analytics/heatmap', params, token)
}

export function buscarMaisLongos(params: AnalyticsParams, token: string) {
  return get<OSMaisLongaDTO[]>('/analytics/mais-longos', params, token)
}

export function buscarAtrasadosPorCategoria(params: AnalyticsParams, token: string) {
  return get<AtrasadosPorCategoriaDTO[]>('/analytics/atrasados-por-categoria', params, token)
}
