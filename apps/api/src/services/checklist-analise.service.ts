import { criarOSService } from './ordens-servico.service.js'
import type { PrioridadeOS } from '@metalsider/shared'
import {
  findChecklistParaAnalise,
  createChecklistAnalise,
  updateChecklistResultadoStatus,
  updateChecklistAnaliseOsGerada,
  deleteChecklistAnalise,
} from '../repositories/checklists.repository.js'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface DadosConversaoOS {
  veiculo_id: number
  categoria_id: number
  inicio_previsto: string
  mecanico_id?: string
  descricao?: string
}

type ChecklistParaAnalise = NonNullable<Awaited<ReturnType<typeof findChecklistParaAnalise>>>

// ─── Helpers ─────────────────────────────────────────────────────────────────

function httpError(statusCode: number, message: string): Error {
  const err = new Error(message) as Error & { statusCode: number }
  err.statusCode = statusCode
  return err
}

function mapPrioridade(prioridade: string | null | undefined): PrioridadeOS {
  switch (prioridade) {
    case 'CRITICA': return 'critica'
    case 'ALTA':    return 'alta'
    case 'MEDIA':   return 'media'
    default:        return 'baixa'
  }
}

function formatarData(date: Date | null | undefined): string {
  if (!date) return 'Não informada'
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function gerarDescricaoAutomatica(checklist: ChecklistParaAnalise): string {
  const veiculoPartes = [
    checklist.veiculo_placa ?? 'Não identificado',
    checklist.veiculo_marca ?? '',
    checklist.veiculo_modelo ?? '',
  ].filter(Boolean)

  const linhas: string[] = [
    'OS gerada automaticamente a partir de checklist Cobli.',
    '',
    `Checklist: ${checklist.nome_checklist}`,
    `Motorista: ${checklist.motorista_nome ?? 'Não informado'}`,
    `Veículo: ${veiculoPartes.join(' ')}`,
    `Data do preenchimento: ${formatarData(checklist.preenchido_em)}`,
    `Endereço: ${checklist.endereco_preenchimento ?? 'Não informado'}`,
    `Prioridade calculada: ${checklist.prioridade ?? 'BAIXA'}`,
    `Pontuação: ${checklist.pontuacao_criticidade}`,
  ]

  if (checklist.itens_nao_conformes.length > 0) {
    linhas.push('', 'Itens não conformes:')
    checklist.itens_nao_conformes.forEach((item, idx) => {
      linhas.push(`${idx + 1}. ${item.field_title}`)
      linhas.push(`   Resposta: ${item.valor_respondido}`)
      linhas.push(`   Peso: ${item.peso_criticidade}`)
    })

    const fotos: string[] = []
    for (const item of checklist.itens_nao_conformes) {
      if (item.photos_urls) {
        try {
          const urls = JSON.parse(item.photos_urls) as string[]
          fotos.push(...urls)
        } catch { /* photos_urls malformed — skip */ }
      }
    }
    if (fotos.length > 0) {
      linhas.push('', 'Fotos:')
      fotos.forEach((url) => linhas.push(`- ${url}`))
    }
  }

  return linhas.join('\n')
}

// ─── aprovarChecklist ─────────────────────────────────────────────────────────

export async function aprovarChecklist(
  checklistId: string,
  atorId: string,
  observacao?: string,
) {
  const checklist = await findChecklistParaAnalise(checklistId)
  if (!checklist) throw httpError(404, `Checklist ${checklistId} não encontrado`)

  if (checklist.status === 'CONFORME') {
    throw httpError(422, 'Checklist conforme não requer aprovação.')
  }
  if (checklist.status === 'RECUSADO') {
    throw httpError(422, 'Checklist já foi recusado. Não é possível aprovar.')
  }
  if (checklist.status === 'APROVADO' || checklist.status === 'OS_GERADA') {
    throw httpError(422, 'Checklist já foi aprovado.')
  }
  if (checklist.analise?.decisao === 'APROVADO') {
    throw httpError(422, 'Checklist já foi aprovado.')
  }

  await createChecklistAnalise({
    checklist_resultado_id: checklistId,
    analisado_por_id:       atorId,
    analisado_em:           new Date(),
    decisao:                'APROVADO',
    observacao:             observacao ?? null,
  })

  await updateChecklistResultadoStatus(checklistId, 'APROVADO')

  return findChecklistParaAnalise(checklistId)
}

// ─── recusarChecklist ─────────────────────────────────────────────────────────

export async function recusarChecklist(
  checklistId: string,
  atorId: string,
  observacao: string,
) {
  if (!observacao || observacao.trim() === '') {
    throw httpError(422, 'Observação é obrigatória ao recusar um checklist.')
  }

  const checklist = await findChecklistParaAnalise(checklistId)
  if (!checklist) throw httpError(404, `Checklist ${checklistId} não encontrado`)

  if (checklist.status === 'CONFORME') {
    throw httpError(422, 'Checklist conforme não requer análise.')
  }
  if (checklist.status === 'RECUSADO') {
    throw httpError(422, 'Checklist já foi recusado.')
  }
  if (checklist.status === 'APROVADO' || checklist.status === 'OS_GERADA') {
    throw httpError(422, 'Checklist já aprovado não pode ser recusado. Cancele a OS se necessário.')
  }

  await createChecklistAnalise({
    checklist_resultado_id: checklistId,
    analisado_por_id:       atorId,
    analisado_em:           new Date(),
    decisao:                'RECUSADO',
    observacao,
  })

  await updateChecklistResultadoStatus(checklistId, 'RECUSADO')

  return findChecklistParaAnalise(checklistId)
}

// ─── reverterRecusaChecklist ──────────────────────────────────────────────────

export async function reverterRecusaChecklist(checklistId: string) {
  const checklist = await findChecklistParaAnalise(checklistId)
  if (!checklist) throw httpError(404, `Checklist ${checklistId} não encontrado`)

  if (checklist.status !== 'RECUSADO') {
    throw httpError(422, 'Apenas checklists recusados podem ter a recusa revertida.')
  }

  await deleteChecklistAnalise(checklistId)
  await updateChecklistResultadoStatus(checklistId, 'NAO_CONFORME')

  return findChecklistParaAnalise(checklistId)
}

// ─── converterEmOS ────────────────────────────────────────────────────────────

export async function converterEmOS(
  checklistId: string,
  atorId: string,
  dadosOS: DadosConversaoOS,
) {
  const checklist = await findChecklistParaAnalise(checklistId)
  if (!checklist) throw httpError(404, `Checklist ${checklistId} não encontrado`)

  if (checklist.status !== 'APROVADO') {
    throw httpError(422, 'Apenas checklists aprovados podem ser convertidos em OS.')
  }
  if (checklist.analise?.os_gerada_id != null) {
    throw httpError(422, 'OS já foi gerada para este checklist.')
  }

  const dataStr = checklist.preenchido_em
    ? checklist.preenchido_em.toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR')
  const veiculoStr = checklist.veiculo_placa ?? 'Veículo não identificado'
  const tituloBase = `OS - ${checklist.nome_checklist} | ${veiculoStr} | ${dataStr}`

  const descricao = dadosOS.descricao ?? gerarDescricaoAutomatica(checklist)

  const os = await criarOSService(
    {
      titulo:          tituloBase.slice(0, 300),
      categoria_id:    dadosOS.categoria_id,
      prioridade:      mapPrioridade(checklist.prioridade),
      veiculo_id:      dadosOS.veiculo_id,
      inicio_previsto: dadosOS.inicio_previsto,
      mecanico_id:     dadosOS.mecanico_id ?? null,
      descricao,
    },
    atorId,
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const osId = (os as any).id as number
  await updateChecklistAnaliseOsGerada(checklistId, osId)
  await updateChecklistResultadoStatus(checklistId, 'OS_GERADA')

  const checklistAtualizado = await findChecklistParaAnalise(checklistId)
  return { os, checklist: checklistAtualizado }
}
