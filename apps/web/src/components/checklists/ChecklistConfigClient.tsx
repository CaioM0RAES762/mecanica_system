'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconChevronDown, IconRefresh } from '@tabler/icons-react'
import type { CampoComPeso, TemplateComCampos, RecalcularResult } from '@/lib/api/checklists'
import { listarCamposPorTemplate, salvarPesoCampo, recalcularPontuacoes } from '@/lib/api/checklists'
import styles from './ChecklistConfigClient.module.css'

// ─── Constantes ───────────────────────────────────────────────────────────────

const PESO_LABELS: Record<number, string> = {
  1: 'Mínimo',
  2: 'Baixo',
  3: 'Médio',
  4: 'Alto',
  5: 'Crítico',
}

const TIPO_LABELS: Record<string, string> = {
  SINGLE_SELECT: 'Seleção única',
  MULTI_SELECT:  'Seleção múltipla',
  CHECK:         'Checagem',
  TEXT:          'Texto',
}

function pesoColorClass(peso: number): string {
  if (peso >= 5) return styles.peso5 ?? ''
  if (peso >= 4) return styles.peso4 ?? ''
  if (peso >= 3) return styles.peso3 ?? ''
  if (peso >= 2) return styles.peso2 ?? ''
  return styles.peso1 ?? ''
}

// ─── CampoRow ─────────────────────────────────────────────────────────────────

interface CampoRowProps {
  campo: CampoComPeso
  token: string
  cobliTemplateId: string
  nomeChecklist: string
  onUpdate: (fieldId: string, novoPesoId: string | null, novoPeso: number) => void
  onEdit: () => void
}

function CampoRow({ campo, token, cobliTemplateId, nomeChecklist, onUpdate, onEdit }: CampoRowProps) {
  const [pesoLocal, setPesoLocal]   = useState(campo.peso)
  const [pesoIdLocal, setPesoIdLocal] = useState(campo.peso_id)
  const [salvando, setSalvando]     = useState(false)
  const [savedAck, setSavedAck]     = useState(false)

  async function handlePeso(novoPeso: number) {
    if (novoPeso === pesoLocal || salvando) return
    setSalvando(true)
    setSavedAck(false)
    try {
      const res = await salvarPesoCampo(campo.field_id, token, {
        peso:               novoPeso,
        peso_id:            pesoIdLocal,
        field_title:        campo.field_title,
        field_type:         campo.field_type,
        cobli_template_id:  cobliTemplateId,
        nome_checklist:     nomeChecklist,
      })
      setPesoLocal(novoPeso)
      setPesoIdLocal(res.id)
      onUpdate(campo.field_id, res.id, novoPeso)
      onEdit()
      setSavedAck(true)
      setTimeout(() => setSavedAck(false), 2000)
    } catch {
      // mantém valor anterior em caso de erro
    } finally {
      setSalvando(false)
    }
  }

  const tipoExtraClass: Record<string, string> = {
    SINGLE_SELECT: styles.tipoSingleSelect ?? '',
    MULTI_SELECT:  styles.tipoMultiSelect  ?? '',
    CHECK:         styles.tipoCheck        ?? '',
    TEXT:          styles.tipoText         ?? '',
  }

  return (
    <tr className={`${styles.row}${salvando ? ` ${styles.rowSaving}` : ''}`}>
      <td className={styles.tdTitle}>
        <span className={styles.fieldName}>{campo.field_title}</span>
      </td>

      <td className={styles.tdType}>
        <span className={`${styles.tipoBadge} ${tipoExtraClass[campo.field_type] ?? ''}`}>
          {TIPO_LABELS[campo.field_type] ?? campo.field_type}
        </span>
      </td>

      <td className={styles.tdPeso}>
        <div className={styles.pesoButtons} aria-label={`Peso do campo ${campo.field_title}`}>
          {([1, 2, 3, 4, 5] as const).map(n => (
            <button
              key={n}
              type="button"
              className={`${styles.pesoBtn} ${pesoColorClass(n)} ${pesoLocal === n ? styles.pesoBtnActive : ''}`}
              onClick={() => void handlePeso(n)}
              disabled={salvando}
              aria-pressed={pesoLocal === n}
              title={PESO_LABELS[n]}
            >
              {n}
            </button>
          ))}
        </div>
      </td>

      <td className={styles.tdNivel}>
        <span className={`${styles.nivelBadge} ${pesoColorClass(pesoLocal)}`}>
          {salvando ? '…' : savedAck ? '✓ salvo' : PESO_LABELS[pesoLocal]}
        </span>
      </td>
    </tr>
  )
}

// ─── TemplateSection ──────────────────────────────────────────────────────────

interface TemplateSectionProps {
  template: TemplateComCampos
  expanded: boolean
  onToggle: () => void
  token: string
  onUpdate: (fieldId: string, novoPesoId: string | null, novoPeso: number) => void
  onEditTemplate: (templateId: string) => void
}

function TemplateSection({ template, expanded, onToggle, token, onUpdate, onEditTemplate }: TemplateSectionProps) {
  const configurados = template.campos.filter(c => c.peso_id !== null).length
  const total        = template.campos.length

  // template_id = "cobli_template_id@@nome_checklist"
  const sep             = template.template_id.indexOf('@@')
  const cobliTemplateId = sep !== -1 ? template.template_id.slice(0, sep) : template.template_id
  const nomeChecklist   = sep !== -1 ? template.template_id.slice(sep + 2) : template.template_nome

  return (
    <div className={styles.templateSection}>
      <button
        type="button"
        className={styles.templateHeader}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className={styles.templateHeaderLeft}>
          <span className={styles.templateNome}>{template.template_nome}</span>
          <span className={styles.templateMeta}>
            {total} campo{total !== 1 ? 's' : ''}
            {' · '}
            {configurados} configurado{configurados !== 1 ? 's' : ''}
          </span>
        </div>
        <IconChevronDown
          className={`${styles.chevron}${expanded ? ` ${styles.chevronExpanded}` : ''}`}
          size={18}
          stroke={2}
        />
      </button>

      {expanded && (
        <div className={styles.templateBody}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thTitle}>Campo</th>
                <th className={styles.thType}>Tipo</th>
                <th className={styles.thPeso}>
                  Peso de criticidade
                  <span className={styles.thHint}> — clique para ajustar</span>
                </th>
                <th className={styles.thNivel}>Nível</th>
              </tr>
            </thead>
            <tbody>
              {template.campos.map(campo => (
                <CampoRow
                  key={campo.field_id}
                  campo={campo}
                  token={token}
                  cobliTemplateId={cobliTemplateId}
                  nomeChecklist={nomeChecklist}
                  onUpdate={onUpdate}
                  onEdit={() => onEditTemplate(template.template_id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className={styles.skeletonWrap}>
      {[0, 1].map(i => (
        <div key={i} className={styles.skeletonSection}>
          <div className={styles.skeletonHeader} />
          <div className={styles.skeletonBody}>
            {[0, 1, 2, 3, 4].map(j => (
              <div key={j} className={styles.skeletonRow} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ChecklistConfigClient ────────────────────────────────────────────────────

interface Props {
  token: string
  initialTemplates: TemplateComCampos[]
}

export function ChecklistConfigClient({ token, initialTemplates }: Props) {
  const [templates, setTemplates] = useState<TemplateComCampos[]>(initialTemplates)
  const [loading, setLoading]     = useState(false)
  const [erro, setErro]           = useState<string | null>(null)

  const [recalcState, setRecalcState] = useState<
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; result: RecalcularResult }
    | { status: 'error'; msg: string }
  >({ status: 'idle' })

  const [editedTemplateIds, setEditedTemplateIds] = useState<Set<string>>(new Set())

  function markTemplateEdited(templateId: string) {
    setEditedTemplateIds(prev => {
      if (prev.has(templateId)) return prev
      return new Set([...prev, templateId])
    })
  }

  async function handleRecalcular() {
    if (recalcState.status === 'loading') return
    setRecalcState({ status: 'loading' })
    const ids = editedTemplateIds.size > 0 ? Array.from(editedTemplateIds) : undefined
    try {
      const result = await recalcularPontuacoes(token, ids)
      setRecalcState({ status: 'success', result })
      setEditedTemplateIds(new Set())
      setTimeout(() => setRecalcState({ status: 'idle' }), 6000)
    } catch (e) {
      setRecalcState({ status: 'error', msg: e instanceof Error ? e.message : 'Erro ao recalcular' })
      setTimeout(() => setRecalcState({ status: 'idle' }), 5000)
    }
  }

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => {
      const first = initialTemplates.at(0)
      return new Set(first ? [first.template_id] : [])
    },
  )

  const fetchTemplates = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setErro(null)
    try {
      const res = await listarCamposPorTemplate(token)
      setTemplates(res.dados)
      setExpandedIds(prev => {
        const first = res.dados.at(0)
        if (prev.size === 0 && first) {
          return new Set([first.template_id])
        }
        return prev
      })
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar campos')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token])

  useEffect(() => {
    // Always fetch fresh data on mount; silent (no skeleton) if SSR already gave us data
    void fetchTemplates(initialTemplates.length > 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function toggleTemplate(templateId: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(templateId)) next.delete(templateId)
      else next.add(templateId)
      return next
    })
  }

  function handleUpdate(fieldId: string, novoPesoId: string | null, novoPeso: number) {
    setTemplates(prev =>
      prev.map(t => ({
        ...t,
        campos: t.campos.map(c =>
          c.field_id === fieldId ? { ...c, peso_id: novoPesoId, peso: novoPeso } : c,
        ),
      })),
    )
  }

  const recalcBtnLabel = (() => {
    if (recalcState.status === 'loading') return 'Recalculando…'
    if (recalcState.status === 'success') return `✓ ${recalcState.result.atualizados} recalculados`
    if (recalcState.status === 'error') return 'Erro ao recalcular'
    if (editedTemplateIds.size > 0) {
      return `Recalcular ${editedTemplateIds.size} template${editedTemplateIds.size > 1 ? 's' : ''}`
    }
    return 'Recalcular pontuações'
  })()

  const { totalCampos, configurados } = useMemo(() => {
    const todos = templates.flatMap(t => t.campos)
    return {
      totalCampos:  todos.length,
      configurados: todos.filter(c => c.peso_id !== null).length,
    }
  }, [templates])

  const progressPct = totalCampos > 0 ? Math.round((configurados / totalCampos) * 100) : 0

  return (
    <div className={styles.wrapper}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Pesos de Criticidade</h1>
          <button
            type="button"
            className={`${styles.recalcBtn} ${recalcState.status === 'loading' ? styles.recalcBtnLoading : ''} ${recalcState.status === 'success' ? styles.recalcBtnSuccess : ''} ${recalcState.status === 'error' ? styles.recalcBtnError : ''}`}
            onClick={() => void handleRecalcular()}
            disabled={recalcState.status === 'loading'}
            title="Recalcula pontuação e prioridade de todos os checklists não conformes com os pesos configurados atualmente"
          >
            <IconRefresh
              size={16}
              stroke={2}
              className={recalcState.status === 'loading' ? styles.recalcSpinner : undefined}
            />
            {recalcBtnLabel}
          </button>
        </div>
        <p className={styles.subtitle}>
          Defina a relevância de cada campo do checklist Cobli para o cálculo automático de prioridade de chamados.
          {' '}Após ajustar os pesos, clique em <strong>Recalcular pontuações</strong> para atualizar os checklists existentes.
        </p>
      </div>

      {/* ── Legenda ── */}
      <div className={styles.legend}>
        <span className={styles.legendLabel}>Pontuação total do checklist:</span>
        <span className={`${styles.legendItem} ${styles.legendBaixa}`}>1–3 pts = BAIXA</span>
        <span className={`${styles.legendItem} ${styles.legendMedia}`}>4–9 pts = MÉDIA</span>
        <span className={`${styles.legendItem} ${styles.legendAlta}`}>10–19 pts = ALTA</span>
        <span className={`${styles.legendItem} ${styles.legendCritica}`}>≥ 20 pts = CRÍTICA</span>
      </div>

      {/* ── Progresso ── */}
      {!loading && templates.length > 0 && (
        <div className={styles.progressArea}>
          <span className={styles.progressLabel}>
            {configurados} de {totalCampos} campo{totalCampos !== 1 ? 's' : ''} configurado{configurados !== 1 ? 's' : ''}
          </span>
          <div
            className={styles.progressBar}
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* ── Conteúdo ── */}
      <div className={styles.content}>
        {erro && (
          <div className={styles.erroBox} role="alert">
            {erro}
            <button type="button" className={styles.reloadBtn} onClick={() => void fetchTemplates(false)}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading && <Skeleton />}

        {!loading && !erro && templates.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyTitle}>Nenhum campo Cobli encontrado</p>
            <p className={styles.emptyDesc}>
              Realize um sync de checklists para que os campos apareçam aqui e possam ter seus pesos configurados.
            </p>
          </div>
        )}

        {!loading && templates.length > 0 && (
          <div className={styles.templateList}>
            {templates.map(template => (
              <TemplateSection
                key={template.template_id}
                template={template}
                expanded={expandedIds.has(template.template_id)}
                onToggle={() => toggleTemplate(template.template_id)}
                token={token}
                onUpdate={handleUpdate}
                onEditTemplate={markTemplateEdited}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
