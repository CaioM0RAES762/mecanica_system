import { fetchCompletedChecklists } from './cobli-checklist.service.js'
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
}

// ─── Sincronização principal ──────────────────────────────────────────────────

export async function sincronizarChecklists(
  params: CobliSyncParams & { periodStart?: Date; periodEnd?: Date },
): Promise<SyncResult> {
  // Guard: não rodar se já houver um sync em andamento
  const syncEmAndamento = await findSyncInProgress()
  if (syncEmAndamento) {
    console.warn('[checklist-sync] Sync já em andamento, pulando execução do cron')
    return { total_imported: 0, total_skipped: 0, total_failed: 0, status: 'SUCCESS' }
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

  // Para o registro de sync: epoch (0) significa "histórico completo"
  const periodStart = new Date(startMillis ?? 0)
  const periodEnd   = new Date(endMillis ?? Date.now())

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
    console.error('[checklist-sync] Falha ao buscar checklists da Cobli:', fetchError)

    await updateSyncRecord(syncRecord.id, { status: 'FAILED', error_message: fetchError })

    return {
      total_imported: 0,
      total_skipped:  0,
      total_failed:   0,
      status:        'FAILED',
      error_message: fetchError,
    }
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
    console.error('[checklist-sync] Aviso: falha ao buscar regras de peso — usando padrões:', err)
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
        console.error(`[checklist-sync] Falha ao processar checklist ${checklist.id}:`, err)
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
}

// ─── Status do último sync ────────────────────────────────────────────────────

export async function getSyncStatus() {
  return findLastSync()
}

