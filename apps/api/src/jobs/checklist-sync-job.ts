import { sincronizarChecklists } from '../services/checklist-sync.service.js'
import { findLastSync } from '../repositories/checklists.repository.js'
import { logger } from '../lib/logger.js'

const INTERVALO_MS = Number(process.env['COBLI_CHECKLIST_SYNC_INTERVAL_MINUTES'] ?? 2) * 60 * 1000

export function iniciarChecklistSyncJob(): void {
  const enabled = process.env['COBLI_CHECKLIST_SYNC_ENABLED'] === 'true'
  if (!enabled) {
    logger.info({ mensagem: 'Sync automático de checklists desabilitado (COBLI_CHECKLIST_SYNC_ENABLED != true)' })
    return
  }

  logger.info({ mensagem: `Job de sync de checklists iniciado`, intervalo_minutos: INTERVALO_MS / 60000 })

  // Rodada periódica: janela curta (padrão 30 min) para manter sincronização contínua
  function runSync() {
    const hours = Number(process.env['COBLI_CHECKLIST_SYNC_LOOKBACK_HOURS'] ?? 0.5)
    const lookbackMs = hours * 60 * 60 * 1000
    void sincronizarChecklists({
      startMillis: Date.now() - lookbackMs,
      endMillis:   Date.now(),
    }).catch((err) => {
      logger.error({ mensagem: 'Erro inesperado no sync automático de checklists', detalhe: err instanceof Error ? err.message : String(err) })
    })
  }

  // Primeira execução: verifica o último sync e faz catch-up desde então se necessário
  setImmediate(() => {
    const hours = Number(process.env['COBLI_CHECKLIST_SYNC_LOOKBACK_HOURS'] ?? 0.5)
    const lookbackMs = hours * 60 * 60 * 1000

    findLastSync()
      .then(lastSync => {
        const lastSyncAt = lastSync?.synced_at?.getTime() ?? null
        const now = Date.now()

        if (!lastSyncAt) {
          // Primeiro uso — sem startMillis busca todo o histórico disponível na Cobli
          logger.info({ mensagem: 'Primeiro sync detectado — importando histórico completo da Cobli' })
          return sincronizarChecklists({ endMillis: now })
        }

        if (now - lastSyncAt > lookbackMs) {
          // Há gap maior que a janela normal — catch-up desde o último sync conhecido
          logger.info({ mensagem: 'Catch-up de checklists detectado', desde: new Date(lastSyncAt).toISOString() })
          return sincronizarChecklists({ startMillis: lastSyncAt, endMillis: now })
        }

        // Dentro da janela normal — execução padrão
        return sincronizarChecklists({ startMillis: now - lookbackMs, endMillis: now })
      })
      .catch((err) => {
        logger.error({ mensagem: 'Erro no sync inicial de checklists', detalhe: err instanceof Error ? err.message : String(err) })
      })
  })

  setInterval(runSync, INTERVALO_MS)
}
