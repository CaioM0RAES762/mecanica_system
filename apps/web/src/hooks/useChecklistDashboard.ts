'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { AnalyticsParams } from '@/lib/api/analytics'
import {
  buscarNcPorItem,
  buscarConformidadePorVeiculo,
  buscarFunilNc,
} from '@/lib/api/checklist-analytics'
import type {
  NcPorItemResponse,
  ConformidadePorVeiculoResponse,
  FunilNcResponse,
} from '@/lib/api/checklist-analytics'

interface HookReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  retry: () => void
}

// ─── useNcPorItem ─────────────────────────────────────────────────────────────

export function useNcPorItem(
  params: AnalyticsParams,
  token: string,
  veiculoPlaca?: string,
): HookReturn<NcPorItemResponse> {
  const [data,    setData]    = useState<NcPorItemResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async (p: AnalyticsParams, placa?: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    try {
      const result = await buscarNcPorItem(p, token, placa, ctrl.signal)
      if (ctrl.signal.aborted) return
      setData(result)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!ctrl.signal.aborted) setError('Falha ao carregar NC por item.')
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (params.periodo !== 'personalizado' || (params.de && params.ate)) {
      void fetch_(params, veiculoPlaca)
    }
  }, [params, veiculoPlaca, fetch_])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { data, loading, error, retry: () => void fetch_(params, veiculoPlaca) }
}

// ─── useConformidadePorVeiculo ────────────────────────────────────────────────

export function useConformidadePorVeiculo(
  params: AnalyticsParams,
  token: string,
): HookReturn<ConformidadePorVeiculoResponse> {
  const [data,    setData]    = useState<ConformidadePorVeiculoResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async (p: AnalyticsParams) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    try {
      const result = await buscarConformidadePorVeiculo(p, token, ctrl.signal)
      if (ctrl.signal.aborted) return
      setData(result)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!ctrl.signal.aborted) setError('Falha ao carregar conformidade por veículo.')
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (params.periodo !== 'personalizado' || (params.de && params.ate)) {
      void fetch_(params)
    }
  }, [params, fetch_])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { data, loading, error, retry: () => void fetch_(params) }
}

// ─── useFunilNc ───────────────────────────────────────────────────────────────

export function useFunilNc(
  params: AnalyticsParams,
  token: string,
  veiculoPlaca?: string,
): HookReturn<FunilNcResponse> {
  const [data,    setData]    = useState<FunilNcResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetch_ = useCallback(async (p: AnalyticsParams, placa?: string) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setLoading(true)
    setError(null)
    try {
      const result = await buscarFunilNc(p, token, placa, ctrl.signal)
      if (ctrl.signal.aborted) return
      setData(result)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      if (!ctrl.signal.aborted) setError('Falha ao carregar funil NC.')
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (params.periodo !== 'personalizado' || (params.de && params.ate)) {
      void fetch_(params, veiculoPlaca)
    }
  }, [params, veiculoPlaca, fetch_])

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { data, loading, error, retry: () => void fetch_(params, veiculoPlaca) }
}
