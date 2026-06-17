import { getRedis } from '../lib/redis.js'
import {
  queryKpis,
  queryPorCategoria,
  queryTendencia,
  queryPorPrioridade,
  queryMecanicos,
  queryHeatmap,
  queryMaisLongos,
  queryAtrasadosPorCategoria,
  resolvePeriod,
} from '../repositories/analytics.repository.js'
import type { AnalyticsPeriodoDTO } from '@metalsider/shared'

const CACHE_TTL_SECONDS = 300 // 5 minutos para períodos fixos
const CACHE_TTL_CUSTOM = 120  // 2 minutos para período personalizado

function cacheKey(endpoint: string, dto: AnalyticsPeriodoDTO): string {
  return `analytics:${endpoint}:${dto.periodo}:${dto.de ?? ''}:${dto.ate ?? ''}`
}

async function withCache<T>(
  key: string,
  ttl: number,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    const redis = getRedis()
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
  return periodo === 'personalizado' ? CACHE_TTL_CUSTOM : CACHE_TTL_SECONDS
}

export async function kpisService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('kpis', dto)
  return withCache(key, getTtl(dto.periodo), () => queryKpis(period))
}

export async function porCategoriaService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('por-categoria', dto)
  return withCache(key, getTtl(dto.periodo), () => queryPorCategoria(period))
}

export async function tendenciaService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('tendencia', dto)
  return withCache(key, getTtl(dto.periodo), () => queryTendencia(period))
}

export async function porPrioridadeService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('por-prioridade', dto)
  return withCache(key, getTtl(dto.periodo), () => queryPorPrioridade(period))
}

export async function mecanicosService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('mecanicos', dto)
  return withCache(key, getTtl(dto.periodo), () => queryMecanicos(period))
}

export async function heatmapService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('heatmap', dto)
  return withCache(key, getTtl(dto.periodo), () => queryHeatmap(period))
}

export async function maisLongosService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('mais-longos', dto)
  return withCache(key, getTtl(dto.periodo), () => queryMaisLongos(period))
}

export async function atrasadosPorCategoriaService(dto: AnalyticsPeriodoDTO) {
  const period = resolvePeriod(dto.periodo, dto.de, dto.ate)
  const key = cacheKey('atrasados-por-categoria', dto)
  return withCache(key, getTtl(dto.periodo), () => queryAtrasadosPorCategoria(period))
}

async function scanKeys(pattern: string): Promise<string[]> {
  const redis = getRedis()
  const keys: string[] = []
  let cursor = '0'
  do {
    const [nextCursor, batch] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
    cursor = nextCursor
    keys.push(...batch)
  } while (cursor !== '0')
  return keys
}

export async function invalidarCacheAnalytics(): Promise<void> {
  try {
    const keys = await scanKeys('analytics:*')
    if (keys.length > 0) {
      await getRedis().del(keys)
    }
  } catch {
    // Redis failure is non-critical
  }
}
