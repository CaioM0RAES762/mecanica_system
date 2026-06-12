import { sincronizarChecklists } from '../services/checklist-sync.service.js'

const INTERVALO_MS = Number(process.env['COBLI_CHECKLIST_SYNC_INTERVAL_MINUTES'] ?? 15) * 60 * 1000

export function iniciarChecklistSyncJob(): void {
  const enabled = process.env['COBLI_CHECKLIST_SYNC_ENABLED'] === 'true'
  if (!enabled) {
    console.info('[checklist-sync-job] Sync automático desabilitado (COBLI_CHECKLIST_SYNC_ENABLED != true)')
    return
  }

  console.info(`[checklist-sync-job] Iniciado — intervalo ${INTERVALO_MS / 60000} min`)

  setInterval(() => {
    const hours = Number(process.env['COBLI_CHECKLIST_SYNC_LOOKBACK_HOURS'] ?? 2)
    const lookbackMs = hours * 60 * 60 * 1000
    void sincronizarChecklists({
      startMillis: Date.now() - lookbackMs,
      endMillis:   Date.now(),
    }).catch((err) => {
      console.error('[checklist-sync-job] Erro inesperado no sync automático:', err)
    })
  }, INTERVALO_MS)
}
