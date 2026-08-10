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
    [globalFilter.periodo, globalFilter.de, globalFilter.ate],
  )
  const diffDays = Math.round((globalRange.ate.getTime() - globalRange.de.getTime()) / DAY_MS)
  const isLimited = diffDays > maxDays

  const [windowDe, setWindowDe] = useState<Date | null>(null)

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
