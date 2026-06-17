'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { IconDots, IconAlertTriangle } from '@tabler/icons-react'
import { Skeleton } from '@/components/ui'
import { useLocalPeriodFilter } from '@/hooks/useLocalPeriodFilter'
import { buscarTendencia } from '@/lib/api/analytics'
import type { AnalyticsParams } from '@/lib/api/analytics'
import type { TendenciaDTO } from '@metalsider/shared'
import { LocalPeriodControls } from './LocalPeriodControls'
import styles from './AberturasVsFechamentosChart.module.css'

interface Props {
  params:          AnalyticsParams
  tendenciaGlobal: TendenciaDTO[]
  token:           string
}

function periodoLabel(params: AnalyticsParams): string {
  if (params.periodo === 'personalizado') return 'Evolução diária — período personalizado'
  const dias = params.periodo === '7d' ? '7' : params.periodo === '90d' ? '90' : '30'
  return `Evolução diária — últimos ${dias} dias`
}

export function AberturasVsFechamentosChart({ params, tendenciaGlobal, token }: Props) {
  const {
    localFilter, setWindowStart, shiftWindow, isLimited,
    windowDe, windowAte, globalRange,
  } = useLocalPeriodFilter(params, 30)

  const [localData,    setLocalData]    = useState<TendenciaDTO[] | null>(null)
  const [loadingLocal, setLoadingLocal] = useState(false)
  const [errorLocal,   setErrorLocal]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchLocal = useCallback(async (p: AnalyticsParams) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoadingLocal(true)
    setErrorLocal(null)
    try {
      const result = await buscarTendencia(p, token, ctrl.signal)
      if (ctrl.signal.aborted) return
      setLocalData(result)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!ctrl.signal.aborted) setErrorLocal('Falha ao carregar evolução diária.')
    } finally {
      if (!ctrl.signal.aborted) setLoadingLocal(false)
    }
  }, [token])

  useEffect(() => {
    if (isLimited) void fetchLocal(localFilter)
  }, [isLimited, localFilter, fetchLocal])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  const tendencia = isLimited ? (localData ?? []) : tendenciaGlobal
  const loading   = isLimited && loadingLocal
  const error     = isLimited ? errorLocal : null

  const tendenciaFormatted = tendencia.map(t => ({ ...t, data: t.data.slice(5) }))

  const canShiftBack    = !!windowDe  && windowDe.getTime()  > globalRange.de.getTime()
  const canShiftForward = !!windowAte && windowAte.getTime() < globalRange.ate.getTime()

  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHead}>
        <div>
          <h3 className={styles.chartTitle}>Aberturas vs fechamentos</h3>
          <p className={styles.chartSub}>{isLimited ? 'Evolução diária — janela de 30 dias' : periodoLabel(params)}</p>
        </div>
        <div className={styles.headRight}>
          {windowDe && windowAte && (
            <LocalPeriodControls
              windowDe={windowDe}
              windowAte={windowAte}
              globalMinDe={globalRange.de}
              globalMaxAte={globalRange.ate}
              canShiftBack={canShiftBack}
              canShiftForward={canShiftForward}
              onShiftBack={() => shiftWindow(-30)}
              onShiftForward={() => shiftWindow(30)}
              onChangeStart={v => setWindowStart(new Date(`${v}T00:00:00`))}
            />
          )}
          <button type="button" className={styles.iconBtn}>
            <IconDots size={16} />
          </button>
        </div>
      </div>

      <div className={styles.chartBody}>
        {loading ? (
          <Skeleton className={styles.skeletonChart} />
        ) : error ? (
          <div className={styles.errorBox}>
            <IconAlertTriangle size={24} />
            <p>{error}</p>
          </div>
        ) : tendenciaFormatted.length === 0 ? (
          <p className={styles.empty}>Sem dados no período.</p>
        ) : (
          <>
            <div className={styles.lineLegend}>
              <span><span className={styles.dotBlue} />Abertos</span>
              <span><span className={styles.dotGreen} />Fechados</span>
            </div>
            <ResponsiveContainer width="100%" height={234}>
              <AreaChart data={tendenciaFormatted} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAberto" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0078d4" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#0078d4" stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="gradFechado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#107c10" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#107c10" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                <XAxis
                  dataKey="data" tick={{ fontSize: 10, fill: '#605e5c' }}
                  axisLine={false} tickLine={false} interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#605e5c' }}
                  axisLine={false} tickLine={false} allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 4, fontSize: 12 }}
                />
                <Area
                  type="monotone" dataKey="aberto" name="Abertos"
                  stroke="#0078d4" strokeWidth={2} fill="url(#gradAberto)"
                  dot={{ r: 3, fill: '#fff', stroke: '#0078d4', strokeWidth: 2 }}
                />
                <Area
                  type="monotone" dataKey="fechado" name="Fechados"
                  stroke="#107c10" strokeWidth={2} fill="url(#gradFechado)"
                  dot={{ r: 3, fill: '#fff', stroke: '#107c10', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  )
}
