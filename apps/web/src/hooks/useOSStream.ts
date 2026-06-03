'use client'

import { useEffect, useRef } from 'react'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'
const RECONNECT_DELAY  = 5_000
const POLL_INTERVAL    = 30_000
const DEBOUNCE_REFRESH = 500

/**
 * Conecta ao endpoint SSE /ordens-servico/stream para receber atualizações em tempo real.
 * Se a conexão SSE falhar, cai automaticamente em polling de 30s.
 * Pausa quando a aba está oculta e retoma quando fica visível.
 * Faz cleanup completo (sem memory leak) ao desmontar.
 */
export function useOSStream({
  accessToken,
  ativo,
  onNecessitaAtualizar,
}: {
  accessToken: string
  /** false quando a aba ativa é "fechados" — desativa completamente a conexão */
  ativo: boolean
  onNecessitaAtualizar: () => void
}) {
  const cbRef = useRef(onNecessitaAtualizar)
  cbRef.current = onNecessitaAtualizar

  useEffect(() => {
    if (!ativo || !accessToken) return

    let abort: AbortController | null = null
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    let hideTimer: ReturnType<typeof setTimeout> | null = null
    let usandoPolling = false

    function triggerRefresh() {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => cbRef.current(), DEBOUNCE_REFRESH)
    }

    function stopAll() {
      abort?.abort()
      abort = null
      if (hideTimer)      { clearTimeout(hideTimer);      hideTimer      = null }
      if (pollTimer)      { clearTimeout(pollTimer);      pollTimer      = null }
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
      if (debounceTimer)  { clearTimeout(debounceTimer);  debounceTimer  = null }
    }

    function schedulePoll() {
      if (pollTimer) clearTimeout(pollTimer)
      if (document.hidden || !navigator.onLine) return
      pollTimer = setTimeout(() => {
        triggerRefresh()
        schedulePoll()
      }, POLL_INTERVAL)
    }

    async function connectSSE() {
      if (document.hidden || !navigator.onLine) return

      const ctrl = new AbortController()
      abort = ctrl
      const { signal } = ctrl

      try {
        const res = await fetch(`${API_URL}/ordens-servico/stream`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal,
        })

        if (!res.ok || !res.body) throw new Error('SSE indisponível')

        // Conexão SSE estabelecida — cancela polling se estava ativo
        usandoPolling = false
        if (pollTimer) { clearTimeout(pollTimer); pollTimer = null }

        const reader  = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        for (;;) {
          const { done, value } = await reader.read()
          if (done || signal.aborted) break

          buf += decoder.decode(value, { stream: true })
          // SSE usa \n\n como separador de blocos
          const blocos = buf.split('\n\n')
          buf = blocos.pop() ?? ''

          for (const bloco of blocos) {
            for (const linha of bloco.split('\n')) {
              if (linha.startsWith('data: ')) {
                try {
                  JSON.parse(linha.slice(6)) // valida que é JSON
                  triggerRefresh()
                } catch { /* linha mal-formada — ignorar */ }
              }
            }
          }
        }

        // Servidor encerrou a conexão normalmente — reconectar após delay
        if (!signal.aborted) {
          reconnectTimer = setTimeout(() => void connectSSE(), RECONNECT_DELAY)
        }
      } catch {
        if (signal.aborted) return // abort intencional no cleanup, não reconectar

        // Falha real — ativar polling e tentar reconectar SSE em background
        if (!usandoPolling) {
          usandoPolling = true
          schedulePoll()
        }
        reconnectTimer = setTimeout(() => void connectSSE(), RECONNECT_DELAY)
      }
    }

    function handleVisibility() {
      if (!document.hidden && navigator.onLine) {
        // Aba ficou visível: cancela timer de hide pendente.
        // Só reconecta se a conexão foi realmente encerrada enquanto oculta.
        if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
        else if (!abort) void connectSSE()
      } else {
        // Aba ficou oculta: debounce de 500ms antes de parar, evitando flickeres
        // rápidos (abertura de DevTools, notificações do SO, clique em menu).
        if (hideTimer) clearTimeout(hideTimer)
        hideTimer = setTimeout(() => { hideTimer = null; stopAll() }, 500)
      }
    }

    function handleOnline()  { if (!document.hidden) { stopAll(); void connectSSE() } }
    function handleOffline() { stopAll() }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)

    if (!document.hidden && navigator.onLine) void connectSSE()

    return () => {
      stopAll()
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [accessToken, ativo])
}
