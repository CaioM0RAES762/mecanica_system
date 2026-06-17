'use client'

import { useState, useMemo, useCallback } from 'react'
import type { AnalyticsParams } from '@/lib/api/analytics'

const DAY_MS = 24 * 60 * 60 * 1000

function resolveGlobalRange(filter: AnalyticsParams): { de: Date; ate: Date } {
  if (filter.periodo === 'personalizado' && filter.de && filter.ate) {
    return { de: new Date(filter.de), ate: new Date(filter.ate) }
  }
  const dias = filter.periodo === '7d' ? 7 : filter.periodo === '90d' ? 90 : 30
  const ate = new Date()
  ate.setHours(23, 59, 59, 999)
  const de = new Date(ate)
  de.setDate(de.getDate() - dias)
  de.setHours(0, 0, 0, 0)
  return { de, ate }
}

// Formata a data usando os componentes locais (ano/mês/dia), nunca toISOString —
// toISOString converte para UTC, e em fusos negativos (ex.: Brasil, UTC-3) um
// horário local como 23:59:59 "vira o dia" ao converter, deslocando a data
// exibida/enviada em +1 dia e quebrando as comparações de limite (min/max).
export function toLocalDateInput(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function clampToGlobalRange(de: Date, globalRange: { de: Date; ate: Date }): Date {
  if (de < globalRange.de)  return new Date(globalRange.de)
  if (de > globalRange.ate) return new Date(globalRange.ate)
  return new Date(de)
}

// Só a data de início é editável pelo usuário — a data de fim é sempre
// derivada (início + maxDays, sem passar do período global). Isso evita o
// problema de dois campos que se "auto-corrigem" um ao outro, que confundia
// e fazia parecer que o filtro estava bugado.
function deriveWindowAte(de: Date, globalRange: { de: Date; ate: Date }, maxDays: number): Date {
  const ate = new Date(de)
  ate.setDate(ate.getDate() + maxDays)
  return ate > globalRange.ate ? new Date(globalRange.ate) : ate
}

export interface UseLocalPeriodFilterReturn {
  localFilter:    AnalyticsParams
  setWindowStart: (de: Date) => void
  shiftWindow:    (days: number) => void
  isLimited:      boolean
  windowDe:       Date | null
  windowAte:      Date | null
  globalRange:    { de: Date; ate: Date }
  maxDays:        number
}

export function useLocalPeriodFilter(
  globalFilter: AnalyticsParams,
  maxDays = 30,
): UseLocalPeriodFilterReturn {
  const globalRange = useMemo(
    () => resolveGlobalRange(globalFilter),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalFilter.periodo, globalFilter.de, globalFilter.ate],
  )
  const diffDays = Math.round((globalRange.ate.getTime() - globalRange.de.getTime()) / DAY_MS)
  const isLimited = diffDays > maxDays

  const [windowDe, setWindowDe] = useState<Date | null>(null)

  // A janela é sempre calculada, mesmo quando o período global já é ≤ maxDays
  // (nesse caso ela acaba sendo o próprio período global, e as duas setas
  // ficam desabilitadas) — isso garante que os controles fiquem sempre
  // visíveis, mostrando claramente o limite atual em vez de simplesmente
  // não aparecer nada quando o usuário tenta ver datas fora do período
  // selecionado no topo do dashboard.
  // Reinicia a janela (para os 30 dias mais recentes do período global) sempre
  // que o período global mudar. Ajustado durante a renderização (em vez de em
  // um useEffect) para que `localFilter` já reflita a janela correta no mesmo
  // ciclo de render — evita um fetch transitório com o período global inteiro
  // (ex.: 90 dias) no instante em que isLimited passa a ser true.
  const [trackedRangeKey, setTrackedRangeKey] = useState('')
  const rangeKey = `${globalRange.de.getTime()}:${globalRange.ate.getTime()}:${maxDays}`
  if (rangeKey !== trackedRangeKey) {
    setTrackedRangeKey(rangeKey)
    const de = new Date(globalRange.ate)
    de.setDate(de.getDate() - maxDays)
    setWindowDe(clampToGlobalRange(de, globalRange))
  }

  const setWindowStart = useCallback((de: Date) => {
    setWindowDe(clampToGlobalRange(de, globalRange))
  }, [globalRange])

  const shiftWindow = useCallback((days: number) => {
    setWindowDe(prev => {
      if (!prev) return prev
      const next = new Date(prev)
      next.setDate(next.getDate() + days)
      return clampToGlobalRange(next, globalRange)
    })
  }, [globalRange])

  const windowAte = useMemo(
    () => windowDe ? deriveWindowAte(windowDe, globalRange, maxDays) : null,
    [windowDe, globalRange, maxDays],
  )

  const localFilter: AnalyticsParams = useMemo(() => {
    if (!isLimited || !windowDe || !windowAte) return globalFilter
    return {
      periodo: 'personalizado',
      de:  `${toLocalDateInput(windowDe)}T00:00:00Z`,
      ate: `${toLocalDateInput(windowAte)}T23:59:59Z`,
    }
  }, [isLimited, windowDe, windowAte, globalFilter])

  return {
    localFilter,
    setWindowStart,
    shiftWindow,
    isLimited,
    windowDe,
    windowAte,
    globalRange,
    maxDays,
  }
}
