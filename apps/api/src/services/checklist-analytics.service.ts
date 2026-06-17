import { getRedis } from '../lib/redis.js'
import {
  queryNcPorItem,
  queryConformidadePorVeiculo,
  queryFunilNc,
} from '../repositories/checklist-analytics.repository.js'
import { resolvePeriod } from '../repositories/analytics.repository.js'
import type { AnalyticsPeriodoDTO } from '@metalsider/shared'

const CACHE_TTL        = 300  // 5 min para períodos fixos
const CACHE_TTL_CUSTOM = 120  // 2 min para período personalizado

function cacheKey(endpoint: string, dto: AnalyticsPeriodoDTO, extra?: string): string {
  return `chk-analytics:${endpoint}:${dto.periodo}:${dto.de ?? ''}:${dto.ate ?? ''}${extra ? `:${extra}` : ''}`
}

async function withCache<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  try {
    const redis  = getRedis()
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached) as T
    const result = await fn()
    await redis.setex(key, ttl, JSON.stringify(result))
    return result
  } catch {
    return fn()
  }
}

function getTtl(periodo: string): number {
  return periodo === 'personalizado' ? CACHE_TTL_CUSTOM : CACHE_TTL
}

export async function ncPorItemService(dto: AnalyticsPeriodoDTO, veiculoPlaca?: string) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key    = cacheKey('nc-por-item', dto, veiculoPlaca)
  return withCache(key, getTtl(dto.periodo), () => queryNcPorItem(period, veiculoPlaca))
}

export async function conformidadePorVeiculoService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key    = cacheKey('conformidade-por-veiculo', dto)
  return withCache(key, getTtl(dto.periodo), () => queryConformidadePorVeiculo(period))
}

export async function funilNcService(dto: AnalyticsPeriodoDTO, veiculoPlaca?: string) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key    = cacheKey('funil-nc', dto, veiculoPlaca)
  return withCache(key, getTtl(dto.periodo), () => queryFunilNc(period, veiculoPlaca))
}

// Chamado ao salvar a configuração de turnos — sem isso, o gráfico "Itens com
// mais não conformidades" continuaria mostrando dados agrupados pelos
// horários antigos até o cache expirar (até 5 min).
export async function invalidateNcPorItemCache(): Promise<void> {
  try {
    const redis = getRedis()
    const keys = await redis.keys('chk-analytics:nc-por-item:*')
    if (keys.length > 0) await redis.del(...keys)
  } catch {
    // Cache Redis não é fonte de verdade (D-12) — segue sem bloquear o save.
  }
}
