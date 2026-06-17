import { fetchCompletedChecklists } from './cobli-checklist.service.js'
import { logger } from '../lib/logger.js'
import { getRedis } from '../lib/redis.js'
import {
  classifyChecklist,
  type ChecklistWeightRule,
} from '../lib/checklist-classifier.js'
import {
  existsChecklistByCobliId,
  createChecklistResultado,
  createItensNaoConformes,
  createSyncRecord,
  updateSyncRecord,
  findLastSync,
  findSyncInProgress,
  findActiveWeightRules,
} from '../repositories/checklists.repository.js'
import type { CobliCompletedChecklist, CobliSyncParams } from '../types/cobli.js'

const SYNC_LOCK_KEY = 'cobli:sync:lock'
const SYNC_LOCK_TTL_SECS = 3600 // 1 hora — garante que lock expire mesmo se o processo morrer

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cobliMillisToDate(millis?: number | null): Date | null {
  if (!millis) return null
  return new Date(millis)
}

function resolvePreenchidoEm(checklist: CobliCompletedChecklist): Date | null {
  // Preferir context.completed_at se existir
  const completedAt = checklist.context?.completed_at
  if (completedAt) return cobliMillisToDate(completedAt)
  return cobliMillisToDate(checklist.created_at)
}

function resolveDeviceId(checklist: CobliCompletedChecklist): string | null {
  const deviceId = checklist.context?.vehicle?.device_id
  if (!deviceId) return null
  return String(deviceId)
}

// ─── Resultado do sync ────────────────────────────────────────────────────────

export interface SyncResult {
  total_imported: number
  total_skipped: number
  total_failed: number
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  error_message?: string | null
  already_running?: boolean
}

// ─── Sincronização principal ──────────────────────────────────────────────────

export async function sincronizarChecklists(
  params: CobliSyncParams & { periodStart?: Date; periodEnd?: Date },
): Promise<SyncResult> {
  // Guard atômico via Redis SET NX — evita execuções concorrentes (job + manual)
  let redisLockAcquired = false
  try {
    const redis = getRedis()
    const acquired = await redis.set(SYNC_LOCK_KEY, '1', 'EX', SYNC_LOCK_TTL_SECS, 'NX')
    if (!acquired) {
      logger.warn({ mensagem: 'Sync de checklists já em andamento (lock Redis) — execução ignorada' })
      return { total_imported: 0, total_skipped: 0, total_failed: 0, status: 'SUCCESS', already_running: true }
    }
    redisLockAcquired = true
  } catch {
    // Redis indisponível — fallback para guard não-atômico do banco
    const syncEmAndamento = await findSyncInProgress()
    if (syncEmAndamento) {
      logger.warn({ mensagem: 'Sync de checklists já em andamento (guard DB) — execução ignorada' })
      return { total_imported: 0, total_skipped: 0, total_failed: 0, status: 'SUCCESS', already_running: true }
    }
  }

  const startMillis = params.startMillis
    ?? (params.periodStart ? params.periodStart.getTime() : undefined)

  const endMillis = params.endMillis
    ?? (params.periodEnd ? params.periodEnd.getTime() : undefined)

  const syncParams: CobliSyncParams = {
    startMillis,
    endMillis,
    nameFilter:      params.nameFilter,
    createdByFilter: params.createdByFilter,
  }

  // Para o registro de sync: epoch (0) significa "histórico completo".
  // ATENÇÃO: sem startMillis, o sistema buscará todo o histórico na API Cobli.
  if (!startMillis) {
    logger.warn({ mensagem: 'Sync iniciado sem startMillis — buscando todo o histórico desde epoch. Isso pode importar um volume muito grande de dados.' })
  }
  const periodStart = new Date(startMillis ?? 0)
  const periodEnd   = new Date(endMillis ?? Date.now())

  try {
    // Criar registro PROCESSING antes de começar
    const syncRecord = await createSyncRecord({
      period_start:   periodStart,
      period_end:     periodEnd,
      total_imported: 0,
      total_skipped:  0,
      total_failed:   0,
      status:         'PROCESSING',
    })

    let checklists: CobliCompletedChecklist[] = []

    try {
      checklists = await fetchCompletedChecklists(syncParams)
    } catch (err) {
      const fetchError = err instanceof Error ? err.message : String(err)
      logger.error({ mensagem: 'Falha ao buscar checklists da Cobli', detalhe: fetchError })
      await updateSyncRecord(syncRecord.id, { status: 'FAILED', error_message: fetchError })
      return { total_imported: 0, total_skipped: 0, total_failed: 0, status: 'FAILED', error_message: fetchError }
    }

    // Buscar regras de peso configuradas no banco
    let weightRules: ChecklistWeightRule[] = []
    try {
      const dbRules = await findActiveWeightRules()
      weightRules = dbRules.map((r: { field_title_pattern: string; peso: number; ativo: boolean }) => ({
        field_title_pattern: r.field_title_pattern,
        peso:                r.peso,
        ativo:               r.ativo,
      }))
    } catch (err) {
      logger.warn({ mensagem: 'Falha ao buscar regras de peso do banco — usando valores padrão', detalhe: err instanceof Error ? err.message : String(err) })
    }

    let totalImported = 0
    let totalSkipped  = 0
    let totalFailed   = 0

    for (const checklist of checklists) {
      if (!checklist.id) {
        totalFailed++
        continue
      }

      try {
        // Deduplicação — índice único garante no banco, mas verificamos antes para contar
        const exists = await existsChecklistByCobliId(checklist.id)
        if (exists) {
          totalSkipped++
          continue
        }

        const fields = checklist.fields ?? []
        const { status, nonCompliantItems, pontuacao, prioridade } = classifyChecklist(fields, weightRules)

        const resultado = await createChecklistResultado({
          cobli_checklist_id:     checklist.id,
          cobli_template_id:      checklist.template_id ?? null,
          nome_checklist:         checklist.name,
          versao:                 checklist.version ?? null,
          veiculo_device_id:      resolveDeviceId(checklist),
          veiculo_placa:          checklist.context?.vehicle?.license_plate ?? null,
          veiculo_marca:          checklist.context?.vehicle?.brand ?? null,
          veiculo_modelo:         checklist.context?.vehicle?.model ?? null,
          veiculo_group_id:       checklist.context?.vehicle?.group_id ?? null,
          motorista_nome:         checklist.created_by ?? null,
          endereco_preenchimento: checklist.context?.address ?? null,
          preenchido_em:          resolvePreenchidoEm(checklist),
          criado_em_cobli:        cobliMillisToDate(checklist.created_at),
          status,
          pontuacao_criticidade:  pontuacao,
          prioridade,
          payload_original:       JSON.stringify(checklist),
        })

        if (nonCompliantItems.length > 0) {
          await createItensNaoConformes(resultado.id, nonCompliantItems)
        }

        totalImported++
      } catch (err) {
        // Tratar duplicate key como skip (race condition de sync paralelo)
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('Unique constraint') || msg.includes('duplicate key') || msg.includes('UNIQUE')) {
          totalSkipped++
        } else {
          totalFailed++
          logger.error({ mensagem: `Falha ao processar checklist Cobli`, cobli_checklist_id: checklist.id, detalhe: err instanceof Error ? err.message : String(err) })
        }
      }
    }

    const syncStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' =
      totalFailed > 0 && totalImported === 0 ? 'FAILED'
      : totalFailed > 0 ? 'PARTIAL'
      : 'SUCCESS'

    await updateSyncRecord(syncRecord.id, {
      total_imported: totalImported,
      total_skipped:  totalSkipped,
      total_failed:   totalFailed,
      status:         syncStatus,
      error_message:  null,
    })

    return {
      total_imported: totalImported,
      total_skipped:  totalSkipped,
      total_failed:   totalFailed,
      status:         syncStatus,
    }
  } finally {
    // Liberar lock Redis sempre — mesmo em caso de exceção inesperada
    if (redisLockAcquired) {
      try { await getRedis().del(SYNC_LOCK_KEY) } catch { /* não crítico */ }
    }
  }
}

// ─── Status do último sync ────────────────────────────────────────────────────

export async function getSyncStatus() {
  return findLastSync()
}

