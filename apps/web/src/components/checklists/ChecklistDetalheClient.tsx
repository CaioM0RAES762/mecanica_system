'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  IconArrowLeft,
  IconCheck,
  IconX,
  IconBolt,
  IconArrowRight,
  IconPhoto,
  IconDownload,
} from '@tabler/icons-react'
import { Modal } from '@/components/ui'
import type { CategoriaResumo, UsuarioResumo } from '@metalsider/shared'
import type { ChecklistDetalhe } from '@/lib/api/checklists'
import {
  aprovarChecklist,
  recusarChecklist,
  reverterRecusa,
  converterEmOS,
  buscarVeiculoPorPlaca,
} from '@/lib/api/checklists'
import styles from './ChecklistDetalheClient.module.css'

// ─── Tipos helpers ────────────────────────────────────────────────────────────

type Perfil = 'supervisor' | 'admin' | 'mecanico'

interface Props {
  checklist: ChecklistDetalhe
  token: string
  perfil: Perfil
  categorias: CategoriaResumo[]
  mecanicos: UsuarioResumo[]
  backHref?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'NAO_CONFORME': return styles.badgeNaoConforme ?? ''
    case 'CONFORME':     return styles.badgeConforme ?? ''
    case 'APROVADO':     return styles.badgeAprovado ?? ''
    case 'RECUSADO':     return styles.badgeRecusado ?? ''
    case 'OS_GERADA':    return styles.badgeOsGerada ?? ''
    default:             return ''
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'NAO_CONFORME': return 'Não Conforme'
    case 'CONFORME':     return 'Conforme'
    case 'APROVADO':     return 'Aprovado'
    case 'RECUSADO':     return 'Recusado'
    case 'OS_GERADA':    return 'OS Gerada'
    default:             return status
  }
}

function prioBadgeClass(p: string | null): string {
  switch (p) {
    case 'CRITICA': return styles.badgePrioCritica ?? ''
    case 'ALTA':    return styles.badgePrioAlta ?? ''
    case 'MEDIA':   return styles.badgePrioMedia ?? ''
    default:        return styles.badgePrioBaixa ?? ''
  }
}

function prioLabel(p: string | null): string {
  switch (p) {
    case 'CRITICA': return 'Crítica'
    case 'ALTA':    return 'Alta'
    case 'MEDIA':   return 'Média'
    case 'BAIXA':   return 'Baixa'
    default:        return p ?? '—'
  }
}

function itemBorderClass(peso: number): string {
  if (peso >= 10) return styles.itemCardHigh ?? ''
  if (peso >= 7)  return styles.itemCardMedHigh ?? ''
  if (peso >= 4)  return styles.itemCardMedLow ?? ''
  return styles.itemCardLow ?? ''
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return 'Não informada'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDateOnly(iso: string | null | undefined): string {
  if (!iso) return 'Não informada'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function todayHM(): string {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

function calcPrazoDefault(prioridade: string | null): { data: string; hora: string } {
  const base = new Date()
  if (prioridade === 'CRITICA') {
    base.setHours(base.getHours() + 2)
  } else if (prioridade === 'ALTA') {
    base.setHours(base.getHours() + 8)
  } else if (prioridade === 'MEDIA') {
    let d = 2
    while (d > 0) { base.setDate(base.getDate() + 1); if (base.getDay() !== 0 && base.getDay() !== 6) d-- }
    base.setHours(18, 0, 0, 0)
  } else {
    let d = 5
    while (d > 0) { base.setDate(base.getDate() + 1); if (base.getDay() !== 0 && base.getDay() !== 6) d-- }
    base.setHours(18, 0, 0, 0)
  }
  return {
    data: base.toISOString().slice(0, 10),
    hora: `${String(base.getHours()).padStart(2, '0')}:${String(base.getMinutes()).padStart(2, '0')}`,
  }
}

function gerarDescricaoModal(checklist: ChecklistDetalhe): string {
  const veiculoPartes = [checklist.veiculo_placa, checklist.veiculo_marca, checklist.veiculo_modelo].filter(Boolean)
  const linhas: string[] = [
    'OS gerada a partir de checklist não conforme (Cobli).',
    '',
    `Checklist: ${checklist.nome_checklist}`,
    `Motorista: ${checklist.motorista_nome ?? 'Não informado'}`,
    `Veículo: ${veiculoPartes.join(' ') || 'Não identificado'}`,
    `Preenchido em: ${fmtDate(checklist.preenchido_em)}`,
    `Prioridade: ${prioLabel(checklist.prioridade)}`,
    `Pontuação de criticidade: ${checklist.pontuacao_criticidade} pt(s)`,
  ]
  if (checklist.itens_nao_conformes.length > 0) {
    linhas.push('', `Itens não conformes (${checklist.itens_nao_conformes.length}):`)
    checklist.itens_nao_conformes.forEach((item, idx) => {
      linhas.push(`  ${idx + 1}. [Peso ${item.peso_criticidade}] ${item.field_title}`)
      linhas.push(`     → Resposta: ${item.valor_respondido}`)
    })
  }
  return linhas.join('\n')
}

// ─── Parser do payload_original ───────────────────────────────────────────────

interface CobliField {
  id?: string
  title?: string
  type?: string
  photos_urls?: string[]
  content?: {
    value?: string
    checked?: boolean
    options?: { label?: string; checked?: boolean }[]
    photos?: string[]
  }
}

function parsePayload(payloadStr: string): CobliField[] | null {
  try {
    const data = JSON.parse(payloadStr) as {
      fields?: CobliField[]
      data?: { fields?: CobliField[] }
    }
    if (Array.isArray(data.fields)) return data.fields
    if (Array.isArray(data.data?.fields)) return data.data!.fields!
    return null
  } catch {
    return null
  }
}

function extractFieldPhotos(field: CobliField): string[] {
  const urls: string[] = []
  if (Array.isArray(field.photos_urls)) {
    for (const u of field.photos_urls) {
      if (typeof u === 'string' && u.startsWith('http')) urls.push(u)
    }
  }
  if (Array.isArray(field.content?.photos)) {
    for (const u of field.content!.photos!) {
      if (typeof u === 'string' && u.startsWith('http') && !urls.includes(u)) urls.push(u)
    }
  }
  return urls
}

function renderFieldValue(field: CobliField): { text: string; variant: 'ok' | 'nok' | 'neutral' } {
  const content = field.content
  if (!content) return { text: '—', variant: 'neutral' }

  const type = field.type?.toUpperCase()

  if (type === 'TEXT') {
    const v = content.value?.trim()
    return { text: v ? `"${v}"` : '—', variant: 'neutral' }
  }

  if (type === 'CHECK' || type === 'CHECKED') {
    return content.checked
      ? { text: '✅ Marcado', variant: 'ok' }
      : { text: '⬜ Não marcado', variant: 'neutral' }
  }

  const POSITIVAS = ['ok', 'sim', 'yes', 'bom', 'good', 'conforme', 'normal']

  if (type === 'SINGLE_SELECT') {
    const selected = content.options?.find(o => o.checked)
    if (!selected?.label) return { text: '—', variant: 'neutral' }
    const label = selected.label.toLowerCase()
    // Verifica negativos primeiro: "não" deve bater antes de "conforme" (que é substring de "não conforme")
    const hasNao = label.includes('não') || label.includes('nao')
    if (hasNao || ['nok', 'ruim', 'bad', 'defeito'].some(n => label.includes(n))) {
      return { text: selected.label, variant: 'nok' }
    }
    const variant = POSITIVAS.some(p => label.includes(p)) ? 'ok' : 'neutral'
    return { text: selected.label, variant }
  }

  if (type === 'MULTI_SELECT') {
    const selected = content.options?.filter(o => o.checked) ?? []
    if (selected.length === 0) return { text: '—', variant: 'neutral' }
    return { text: selected.map(o => o.label).join(', '), variant: 'neutral' }
  }

  return { text: content.value ?? '—', variant: 'neutral' }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ChecklistDetalheClient({ checklist: initial, token, perfil, categorias, mecanicos, backHref = '/checklists' }: Props) {
  const [checklist, setChecklist] = useState<ChecklistDetalhe>(initial)
  const [osId, setOsId] = useState<number | null>(checklist.analise?.os_gerada_id ?? null)
  const [osSuccessMsg, setOsSuccessMsg] = useState<string | null>(null)

  // Modais
  const [modalAprovar, setModalAprovar] = useState(false)
  const [modalRecusar, setModalRecusar] = useState(false)
  const [modalConverter, setModalConverter] = useState(false)

  // ── Modal aprovar ──
  const [obsAprovar, setObsAprovar] = useState('')
  const [loadingAprovar, setLoadingAprovar] = useState(false)
  const [erroAprovar, setErroAprovar] = useState<string | null>(null)

  // ── Modal recusar ──
  const [obsRecusar, setObsRecusar] = useState('')
  const [recusarTouched, setRecusarTouched] = useState(false)
  const [loadingRecusar, setLoadingRecusar] = useState(false)
  const [erroRecusar, setErroRecusar] = useState<string | null>(null)

  // ── Modal reverter recusa ──
  const [modalReverter, setModalReverter] = useState(false)
  const [loadingReverter, setLoadingReverter] = useState(false)
  const [erroReverter, setErroReverter] = useState<string | null>(null)

  // ── Modal converter ──
  const [veiculoQuery, setVeiculoQuery] = useState(checklist.veiculo_placa ?? '')
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<{ id: number; veiculo: string; placa: string } | null>(null)
  const [veiculoResultados, setVeiculoResultados] = useState<{ id: number; veiculo: string; placa: string }[]>([])
  const [buscandoVeiculo, setBuscandoVeiculo] = useState(false)
  const [veiculoNaoEncontrado, setVeiculoNaoEncontrado] = useState(false)
  const [categoriasSelecionadas, setCategoriasSelecionadas] = useState<string[]>([])
  const [mecanicoSelecionado, setMecanicoSelecionado] = useState('')
  const [mecanicoQuery, setMecanicoQuery] = useState('')
  const [mecanicoDropdownAberto, setMecanicoDropdownAberto] = useState(false)
  const [inicioPrevisto, setInicioPrevisto] = useState(todayISO())
  const [inicioHora, setInicioHora] = useState('08:00')
  const [prazoData, setPrazoData] = useState('')
  const [prazoHora, setPrazoHora] = useState('18:00')
  const [descricaoOS, setDescricaoOS] = useState('')
  const [loadingConverter, setLoadingConverter] = useState(false)
  const [erroConverter, setErroConverter] = useState<string | null>(null)

  const veiculoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Busca automática de veículo ao abrir modal
  const buscarVeiculo = useCallback(
    async (placa: string) => {
      if (!placa.trim()) { setVeiculoResultados([]); setVeiculoNaoEncontrado(false); return }
      setBuscandoVeiculo(true)
      setVeiculoNaoEncontrado(false)
      try {
        const res = await buscarVeiculoPorPlaca(placa, token)
        setVeiculoResultados(res.dados)
        if (res.dados.length === 1) {
          setVeiculoSelecionado(res.dados[0]!)
        } else if (res.dados.length === 0) {
          setVeiculoNaoEncontrado(true)
        }
      } catch { /* silencioso */ }
      finally { setBuscandoVeiculo(false) }
    },
    [token],
  )

  useEffect(() => {
    if (!modalConverter) return
    void buscarVeiculo(checklist.veiculo_placa ?? '')
    setInicioPrevisto(todayISO())
    setInicioHora(todayHM())
    const prazoDefault = calcPrazoDefault(checklist.prioridade)
    setPrazoData(prazoDefault.data)
    setPrazoHora(prazoDefault.hora)
    setDescricaoOS(gerarDescricaoModal(checklist))
    setMecanicoQuery('')
    setMecanicoSelecionado('')
    setMecanicoDropdownAberto(false)
    setVeiculoNaoEncontrado(false)
    setCategoriasSelecionadas([])
    setErroConverter(null)
    // buscarVeiculo é intencionalmente omitido das deps: a função muda de referência a cada
    // render, adicioná-la causaria loop infinito. O comportamento está correto — dispara
    // apenas quando o modal abre/fecha, que é o único momento em que a busca faz sentido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalConverter])

  function handleVeiculoQueryChange(v: string) {
    setVeiculoQuery(v)
    setVeiculoSelecionado(null)
    setVeiculoNaoEncontrado(false)
    if (veiculoDebounceRef.current) clearTimeout(veiculoDebounceRef.current)
    if (v.length >= 3) {
      veiculoDebounceRef.current = setTimeout(() => void buscarVeiculo(v), 350)
    } else {
      setVeiculoResultados([])
    }
  }

  async function handleAprovar() {
    setLoadingAprovar(true)
    setErroAprovar(null)
    try {
      const updated = await aprovarChecklist(checklist.id, token, obsAprovar || undefined)
      setChecklist(updated)
      setModalAprovar(false)
      setObsAprovar('')
    } catch (e) {
      setErroAprovar(e instanceof Error ? e.message : 'Erro ao aprovar')
    } finally {
      setLoadingAprovar(false)
    }
  }

  async function handleRecusar() {
    if (!obsRecusar.trim()) return
    setLoadingRecusar(true)
    setErroRecusar(null)
    try {
      const updated = await recusarChecklist(checklist.id, token, obsRecusar)
      setChecklist(updated)
      setModalRecusar(false)
      setObsRecusar('')
    } catch (e) {
      setErroRecusar(e instanceof Error ? e.message : 'Erro ao recusar')
    } finally {
      setLoadingRecusar(false)
    }
  }

  async function handleReverter() {
    setLoadingReverter(true)
    setErroReverter(null)
    try {
      const updated = await reverterRecusa(checklist.id, token)
      setChecklist(updated)
      setModalReverter(false)
    } catch (e) {
      setErroReverter(e instanceof Error ? e.message : 'Erro ao reverter recusa')
    } finally {
      setLoadingReverter(false)
    }
  }

  async function handleConverter() {
    if (!veiculoSelecionado || categoriasSelecionadas.length === 0 || !inicioPrevisto) return
    setLoadingConverter(true)
    setErroConverter(null)
    try {
      const inicioISO = `${inicioPrevisto}T${inicioHora}:00`
      const prazoISO  = prazoData ? `${prazoData}T${prazoHora}:00` : undefined

      // Coleta URLs de fotos dos itens NC e embute no final da descrição com marcador parseável
      const fotosNc: string[] = []
      for (const item of checklist.itens_nao_conformes) {
        if (item.photos_urls) {
          try {
            const urls = JSON.parse(item.photos_urls) as string[]
            fotosNc.push(...urls.filter(u => typeof u === 'string' && u.startsWith('http')))
          } catch { /* skip */ }
        }
      }
      const descBase = descricaoOS || undefined
      const descFinal = fotosNc.length > 0
        ? `${descBase ?? ''}\n[FOTOS_NC]\n${fotosNc.join('\n')}`
        : descBase

      const res = await converterEmOS(checklist.id, token, {
        veiculo_id: veiculoSelecionado.id,
        categoria_ids: categoriasSelecionadas.map(Number),
        inicio_previsto: inicioISO,
        prazo: prazoISO,
        mecanico_id: mecanicoSelecionado || undefined,
        descricao: descFinal,
      })
      const novoOsId = (res.os as { id?: number })?.id ?? null
      setOsId(novoOsId)
      setChecklist(res.checklist)
      setOsSuccessMsg(novoOsId ? `OS #${novoOsId} criada com sucesso` : 'OS criada com sucesso')
      setModalConverter(false)
    } catch (e) {
      setErroConverter(e instanceof Error ? e.message : 'Erro ao converter')
    } finally {
      setLoadingConverter(false)
    }
  }

  // Painel de análise — só para supervisor/admin
  const podeAnalisar = perfil === 'supervisor' || perfil === 'admin'

  const payload = parsePayload(checklist.payload_original)

  return (
    <div className={styles.page}>
      {/* Voltar */}
      <Link href={backHref} className={styles.backLink}>
        <IconArrowLeft size={15} aria-hidden="true" />
        Voltar para Checklists
      </Link>

      {/* Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={`${styles.badge} ${statusBadgeClass(checklist.status)}`}>
            {statusLabel(checklist.status)}
          </span>
          {checklist.prioridade && (
            <span className={`${styles.badge} ${prioBadgeClass(checklist.prioridade)}`}>
              {prioLabel(checklist.prioridade)}
            </span>
          )}
        </div>
        <h1 className={styles.headerTitulo}>{checklist.nome_checklist}</h1>
        {(checklist.status === 'NAO_CONFORME' || checklist.status === 'APROVADO') && (
          <p className={styles.headerScore}>
            Pontuação: <span className={styles.headerScoreNum}>{checklist.pontuacao_criticidade}</span> pontos
          </p>
        )}
      </div>

      {/* Grid de duas colunas */}
      <div className={styles.grid}>
        {/* Coluna principal */}
        <div className={styles.mainCol}>
          {/* Informações gerais */}
          <div className={styles.section}>
            <div className={styles.sectionHead}>Informações gerais</div>
            <div className={styles.sectionBody}>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Motorista</span>
                  <span className={styles.infoValue}>{checklist.motorista_nome ?? '—'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Placa</span>
                  <span className={styles.infoValue}>{checklist.veiculo_placa ?? '—'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Marca / Modelo</span>
                  <span className={styles.infoValue}>
                    {[checklist.veiculo_marca, checklist.veiculo_modelo].filter(Boolean).join(' ') || '—'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Preenchido em</span>
                  <span className={styles.infoValue}>{fmtDate(checklist.preenchido_em)}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Endereço</span>
                  <span className={styles.infoValue}>{checklist.endereco_preenchimento ?? '—'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Importado em</span>
                  <span className={styles.infoValue}>{fmtDate(checklist.importado_em)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Itens não conformes */}
          {checklist.itens_nao_conformes.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionHead}>
                Itens não conformes ({checklist.itens_nao_conformes.length})
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.itemCardItems}>
                  {checklist.itens_nao_conformes.map(item => {
                    let photos: string[] = []
                    if (item.photos_urls) {
                      try { photos = JSON.parse(item.photos_urls) as string[] } catch { /* skip */ }
                    }
                    return (
                      <div
                        key={item.id}
                        className={`${styles.itemCard} ${itemBorderClass(item.peso_criticidade)}`}
                      >
                        <div className={styles.itemTitle}>{item.field_title}</div>
                        <div className={styles.itemMeta}>
                          <span>Resposta: <strong>{item.valor_respondido}</strong></span>
                          <span>Peso: <span className={styles.itemPeso}>{item.peso_criticidade}</span></span>
                          {item.field_type && <span>Tipo: {item.field_type}</span>}
                        </div>
                        {photos.length > 0 && (
                          <InlinePhotoGallery photos={photos} titulo={item.field_title} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Todas as perguntas */}
          <div className={styles.section}>
            <div className={styles.sectionHead}>Perguntas e Respostas</div>
            <div className={styles.sectionBody}>
              {payload ? (
                <div className={styles.fieldList}>
                  {payload.map((field, idx) => {
                    const { text, variant } = renderFieldValue(field)
                    const fieldPhotos = extractFieldPhotos(field)
                    return (
                      <div key={field.id ?? idx} className={styles.fieldItem}>
                        <div className={styles.fieldTitle}>
                          {field.title ?? `Campo ${idx + 1}`}
                        </div>
                        <div
                          className={`${styles.fieldValue} ${
                            variant === 'ok'  ? styles.fieldValueOk  :
                            variant === 'nok' ? styles.fieldValueNok :
                            ''
                          }`}
                        >
                          {text}
                        </div>
                        {fieldPhotos.length > 0 && (
                          <InlinePhotoGallery photos={fieldPhotos} titulo={field.title ?? `Campo ${idx + 1}`} compact />
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className={styles.payloadError}>
                  Não foi possível renderizar o payload original deste checklist.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Painel de análise */}
        {podeAnalisar && (
          <div className={styles.analysisPanel}>
            <div className={styles.analysisPanelHead}>Painel de Análise</div>
            <div className={styles.analysisPanelBody}>
              <AnalysisPanelContent
                checklist={checklist}
                osId={osId}
                osSuccessMsg={osSuccessMsg}
                onAprovar={() => { setObsAprovar(''); setErroAprovar(null); setModalAprovar(true) }}
                onRecusar={() => { setObsRecusar(''); setRecusarTouched(false); setErroRecusar(null); setModalRecusar(true) }}
                onConverter={() => { setErroConverter(null); setModalConverter(true) }}
                onReverter={() => { setErroReverter(null); setModalReverter(true) }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Modal: Aprovar ── */}
      <Modal
        open={modalAprovar}
        onClose={() => setModalAprovar(false)}
        title="Aprovar checklist?"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setModalAprovar(false)}
              disabled={loadingAprovar}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.modalConfirmBtn}
              onClick={() => void handleAprovar()}
              disabled={loadingAprovar}
            >
              <IconCheck size={14} aria-hidden="true" />
              {loadingAprovar ? 'Aguarde…' : 'Confirmar aprovação'}
            </button>
          </div>
        }
      >
        {erroAprovar && <div className={styles.modalError} role="alert">{erroAprovar}</div>}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Observação <span className={styles.modalOptional}>(opcional)</span>
          </label>
          <textarea
            className={styles.modalTextarea}
            rows={3}
            value={obsAprovar}
            onChange={e => setObsAprovar(e.target.value)}
            placeholder="Adicione uma observação sobre a aprovação…"
          />
        </div>
      </Modal>

      {/* ── Modal: Recusar ── */}
      <Modal
        open={modalRecusar}
        onClose={() => setModalRecusar(false)}
        title="Recusar checklist"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setModalRecusar(false)}
              disabled={loadingRecusar}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`${styles.modalConfirmBtn} ${styles.modalConfirmDanger}`}
              onClick={() => {
                setRecusarTouched(true)
                void handleRecusar()
              }}
              disabled={loadingRecusar}
            >
              <IconX size={14} aria-hidden="true" />
              {loadingRecusar ? 'Aguarde…' : 'Recusar'}
            </button>
          </div>
        }
      >
        {erroRecusar && <div className={styles.modalError} role="alert">{erroRecusar}</div>}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Motivo da recusa <span className={styles.modalRequired}>*</span>
          </label>
          <textarea
            className={`${styles.modalTextarea} ${recusarTouched && !obsRecusar.trim() ? styles.modalTextareaError : ''}`}
            rows={4}
            value={obsRecusar}
            onChange={e => { setObsRecusar(e.target.value); if (recusarTouched) setRecusarTouched(true) }}
            onBlur={() => setRecusarTouched(true)}
            placeholder="Descreva o motivo da recusa…"
            autoFocus
          />
          {recusarTouched && !obsRecusar.trim() && (
            <span className={styles.modalFieldError} role="alert">
              Informe o motivo da recusa antes de continuar.
            </span>
          )}
        </div>
      </Modal>

      {/* ── Modal: Reverter Recusa ── */}
      <Modal
        open={modalReverter}
        onClose={() => setModalReverter(false)}
        title="Reverter recusa?"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setModalReverter(false)}
              disabled={loadingReverter}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.modalConfirmBtn}
              onClick={() => void handleReverter()}
              disabled={loadingReverter}
            >
              <IconCheck size={14} aria-hidden="true" />
              {loadingReverter ? 'Aguarde…' : 'Confirmar reversão'}
            </button>
          </div>
        }
      >
        {erroReverter && <div className={styles.modalError} role="alert">{erroReverter}</div>}
        <p className={styles.modalDesc}>
          O checklist voltará ao status <strong>Não Conforme</strong> e ficará disponível para uma nova análise. A decisão anterior de recusa será removida.
        </p>
      </Modal>

      {/* ── Modal: Converter em OS ── */}
      <Modal
        open={modalConverter}
        onClose={() => setModalConverter(false)}
        title="Converter em Ordem de Serviço"
        size="lg"
        footer={
          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.modalCancelBtn}
              onClick={() => setModalConverter(false)}
              disabled={loadingConverter}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={styles.modalConfirmBtn}
              onClick={() => void handleConverter()}
              disabled={loadingConverter || !veiculoSelecionado || categoriasSelecionadas.length === 0 || !inicioPrevisto}
            >
              <IconBolt size={14} aria-hidden="true" />
              {loadingConverter ? 'Criando OS…' : 'Criar OS'}
            </button>
          </div>
        }
      >
        {erroConverter && <div className={styles.modalError} role="alert">{erroConverter}</div>}

        {/* Preview NC items com fotos */}
        {checklist.itens_nao_conformes.length > 0 && (() => {
          const ncFotos: string[] = []
          for (const item of checklist.itens_nao_conformes) {
            if (item.photos_urls) {
              try {
                const urls = JSON.parse(item.photos_urls) as string[]
                ncFotos.push(...urls.filter(u => typeof u === 'string' && u.startsWith('http')))
              } catch { /* skip */ }
            }
          }
          return (
            <div className={styles.modalNcPreview}>
              <div className={styles.modalNcPreviewHead}>
                {checklist.itens_nao_conformes.length} item(ns) não conforme(s) identificado(s)
              </div>
              <div className={styles.modalNcList}>
                {checklist.itens_nao_conformes.map(item => (
                  <div key={item.id} className={styles.modalNcItem}>
                    <span className={styles.modalNcItemPeso}>{item.peso_criticidade}</span>
                    <span className={styles.modalNcItemText}>
                      <strong>{item.field_title}</strong>
                      {' → '}
                      <em>{item.valor_respondido}</em>
                    </span>
                  </div>
                ))}
              </div>
              {ncFotos.length > 0 && (
                <div className={styles.modalNcPhotoRow}>
                  <InlinePhotoGallery photos={ncFotos} titulo="Fotos dos itens não conformes" compact />
                </div>
              )}
            </div>
          )
        })()}

        {/* Veículo */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Veículo <span className={styles.modalRequired}>*</span>
          </label>
          <input
            className={styles.modalInput}
            placeholder="Buscar por placa…"
            value={veiculoQuery}
            onChange={e => handleVeiculoQueryChange(e.target.value)}
          />
          <span className={styles.fieldHint}>
            {buscandoVeiculo ? 'Buscando…' : 'Digite ≥ 3 caracteres para buscar'}
          </span>
          {veiculoNaoEncontrado && !buscandoVeiculo && (
            <div className={styles.veiculoWarning}>
              Veículo &quot;{checklist.veiculo_placa}&quot; não encontrado no cadastro. Busque manualmente pela placa ou nome do veículo.
            </div>
          )}
          {veiculoResultados.length > 0 && (
            <div className={styles.vehicleResults}>
              {veiculoResultados.map(v => (
                <button
                  key={v.id}
                  type="button"
                  className={`${styles.vehicleOption} ${veiculoSelecionado?.id === v.id ? styles.vehicleOptionSelected : ''}`}
                  onClick={() => { setVeiculoSelecionado(v); setVeiculoQuery(v.placa ?? v.veiculo) }}
                >
                  <div className={styles.vehiclePlaca}>{v.placa}</div>
                  <div className={styles.vehicleNome}>{v.veiculo}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Categoria */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Categoria <span className={styles.modalRequired}>*</span>
          </label>
          <div className={styles.multiCatWrap}>
            {categorias.map(c => {
              const sid = String(c.id)
              const ativo = categoriasSelecionadas.includes(sid)
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`${styles.catPill} ${ativo ? styles.catPillActive : ''}`}
                  style={ativo && c.cor ? { background: c.cor + '22', borderColor: c.cor, color: c.cor } : undefined}
                  onClick={() => setCategoriasSelecionadas(prev =>
                    prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
                  )}
                >
                  {ativo && <span className={styles.catPillCheck}>✓</span>}
                  {c.nome}
                </button>
              )
            })}
          </div>
        </div>

        {/* Início previsto (data + hora) */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Início previsto <span className={styles.modalRequired}>*</span>
          </label>
          <div className={styles.modalDateTimeRow}>
            <input
              type="date"
              className={styles.modalInput}
              value={inicioPrevisto}
              onChange={e => setInicioPrevisto(e.target.value)}
            />
            <input
              type="time"
              className={`${styles.modalInput} ${styles.modalTimeInput}`}
              value={inicioHora}
              onChange={e => setInicioHora(e.target.value)}
            />
          </div>
        </div>

        {/* Prazo (data + hora) */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Prazo final <span className={styles.modalOptional}>(opcional)</span>
          </label>
          <div className={styles.modalDateTimeRow}>
            <input
              type="date"
              className={styles.modalInput}
              value={prazoData}
              onChange={e => setPrazoData(e.target.value)}
              min={inicioPrevisto}
            />
            <input
              type="time"
              className={`${styles.modalInput} ${styles.modalTimeInput}`}
              value={prazoHora}
              onChange={e => setPrazoHora(e.target.value)}
            />
          </div>
          <span className={styles.fieldHint}>
            Pré-calculado pela prioridade ({prioLabel(checklist.prioridade)}). Ajuste se necessário.
          </span>
        </div>

        {/* Mecânico (searchable) */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Mecânico responsável <span className={styles.modalOptional}>(opcional)</span>
          </label>
          <div className={styles.mecanicoSearch}>
            <input
              className={styles.modalInput}
              placeholder="Buscar por nome…"
              value={mecanicoQuery}
              onChange={e => { setMecanicoQuery(e.target.value); setMecanicoSelecionado('') }}
              onFocus={() => setMecanicoDropdownAberto(true)}
              onBlur={() => setTimeout(() => setMecanicoDropdownAberto(false), 150)}
              autoComplete="off"
            />
            {mecanicoDropdownAberto && (
              <div className={styles.mecanicoDropdown}>
                <button
                  type="button"
                  className={`${styles.mecanicoOption} ${!mecanicoSelecionado ? styles.mecanicoOptionSelecionado : ''}`}
                  onMouseDown={() => { setMecanicoSelecionado(''); setMecanicoQuery(''); setMecanicoDropdownAberto(false) }}
                >
                  Sem mecânico atribuído
                </button>
                {mecanicos
                  .filter(m => !mecanicoQuery.trim() || normalizeText(m.nome_completo).includes(normalizeText(mecanicoQuery)))
                  .map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`${styles.mecanicoOption} ${mecanicoSelecionado === m.id ? styles.mecanicoOptionSelecionado : ''}`}
                      onMouseDown={() => { setMecanicoSelecionado(m.id); setMecanicoQuery(m.nome_completo); setMecanicoDropdownAberto(false) }}
                    >
                      {m.nome_completo}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
          {mecanicoSelecionado && (
            <span className={styles.fieldHint}>
              Selecionado: {mecanicos.find(m => m.id === mecanicoSelecionado)?.nome_completo}
            </span>
          )}
        </div>

        {/* Descrição (pré-preenchida, editável) */}
        <div className={styles.modalField}>
          <label className={styles.modalLabel}>
            Descrição <span className={styles.modalOptional}>(editável)</span>
          </label>
          <textarea
            className={`${styles.modalTextarea} ${styles.modalTextareaOS}`}
            rows={9}
            value={descricaoOS}
            onChange={e => setDescricaoOS(e.target.value)}
            placeholder="Descrição gerada automaticamente a partir do checklist…"
            spellCheck={false}
          />
          <span className={styles.fieldHint}>
            Gerada automaticamente. Edite antes de criar a OS se necessário.
          </span>
        </div>
      </Modal>
    </div>
  )
}

// ─── Galeria de fotos inline ──────────────────────────────────────────────────

function InlinePhotoGallery({
  photos,
  titulo,
  compact = false,
}: {
  photos: string[]
  titulo: string
  compact?: boolean
}) {
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null)

  useEffect(() => {
    if (!lightbox) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightbox])

  return (
    <>
      <div className={compact ? styles.photoGalleryCompact : styles.photoGallery}>
        {photos.map((url, idx) => {
          const label = `Foto ${idx + 1} — ${titulo}`
          return (
            <PhotoItem
              key={idx}
              url={url}
              label={label}
              onOpen={() => setLightbox({ url, label })}
            />
          )
        })}
      </div>
      {lightbox && (
        <Lightbox url={lightbox.url} label={lightbox.label} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}

function PhotoItem({
  url,
  label,
  onOpen,
}: {
  url: string
  label: string
  onOpen: () => void
}) {
  const [failed, setFailed] = useState(false)

  return (
    <button type="button" className={styles.photoItem} onClick={onOpen} title={label} aria-label={label}>
      {failed ? (
        <span className={styles.photoFallback}>
          <IconPhoto size={14} aria-hidden="true" />
          Ver foto
        </span>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={url}
          alt={label}
          className={styles.photo}
          onError={() => setFailed(true)}
          loading="lazy"
        />
      )}
    </button>
  )
}

function Lightbox({
  url,
  label,
  onClose,
}: {
  url: string
  label: string
  onClose: () => void
}) {
  return (
    <div
      className={styles.lightboxOverlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <div className={styles.lightboxInner} onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} className={styles.lightboxImg} />
        <div className={styles.lightboxActions}>
          <a
            href={url}
            download
            className={styles.lightboxBtn}
            title="Baixar imagem"
            aria-label="Baixar imagem"
            onClick={e => e.stopPropagation()}
          >
            <IconDownload size={16} aria-hidden="true" />
          </a>
          <button
            type="button"
            className={styles.lightboxBtn}
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar imagem"
          >
            <IconX size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Painel de análise — conteúdo por estado ─────────────────────────────────

function AnalysisPanelContent({
  checklist,
  osId,
  osSuccessMsg,
  onAprovar,
  onRecusar,
  onConverter,
  onReverter,
}: {
  checklist: ChecklistDetalhe
  osId: number | null
  osSuccessMsg: string | null
  onAprovar: () => void
  onRecusar: () => void
  onConverter: () => void
  onReverter: () => void
}) {
  const analise = checklist.analise

  // Sucesso após conversão
  if (osSuccessMsg) {
    return (
      <>
        <div className={styles.osSuccess}>
          <div className={styles.osSuccessTitle}>{osSuccessMsg}</div>
          {osId && (
            <Link href={`/chamados/${osId}`} className={styles.osLink}>
              Ver OS #{osId}
              <IconArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      </>
    )
  }

  if (checklist.status === 'CONFORME') {
    return (
      <div className={styles.analysisStatus}>
        <div className={styles.analysisStatusTitle}>✅ Checklist conforme</div>
        <div className={styles.analysisStatusMeta}>Nenhuma ação necessária.</div>
      </div>
    )
  }

  if (checklist.status === 'NAO_CONFORME') {
    return (
      <>
        <div className={styles.analysisStatus}>
          <div className={styles.analysisStatusTitle}>Aguardando análise</div>
          <div className={styles.analysisStatusMeta}>
            Revise os itens não conformes e decida se aprova ou recusa este checklist.
          </div>
        </div>
        <div className={styles.analysisActionsRow}>
          <button type="button" className={`${styles.btnPrimary} ${styles.btnSuccess}`} onClick={onAprovar}>
            <IconCheck size={14} aria-hidden="true" />
            Aprovar
          </button>
          <button type="button" className={`${styles.btnPrimary} ${styles.btnDanger}`} onClick={onRecusar}>
            <IconX size={14} aria-hidden="true" />
            Recusar
          </button>
        </div>
      </>
    )
  }

  if (checklist.status === 'APROVADO') {
    return (
      <>
        <div className={styles.analysisStatus}>
          <div className={styles.analysisStatusTitle}>✅ Aprovado</div>
          {analise && (
            <div className={styles.analysisStatusMeta}>
              por {analise.analisado_por?.nome_completo ?? 'usuário'}{analise.analisado_em ? ` em ${fmtDateOnly(analise.analisado_em)}` : ''}
            </div>
          )}
          {analise?.observacao && (
            <blockquote className={styles.analysisObs}>{analise.observacao}</blockquote>
          )}
        </div>
        <button type="button" className={`${styles.btnPrimary}`} onClick={onConverter}>
          <IconBolt size={14} aria-hidden="true" />
          Converter em OS
        </button>
      </>
    )
  }

  if (checklist.status === 'OS_GERADA') {
    const currentOsId = osId ?? analise?.os_gerada_id
    return (
      <div className={styles.analysisStatus}>
        <div className={styles.analysisStatusTitle}>✅ OS gerada</div>
        {currentOsId && (
          <Link href={`/chamados/${currentOsId}`} className={styles.osLink}>
            OS #{currentOsId} vinculada
            <IconArrowRight size={14} aria-hidden="true" />
          </Link>
        )}
      </div>
    )
  }

  if (checklist.status === 'RECUSADO') {
    return (
      <>
        <div className={styles.analysisStatus}>
          <div className={styles.analysisStatusTitle}>✗ Recusado</div>
          {analise && (
            <div className={styles.analysisStatusMeta}>
              por {analise.analisado_por?.nome_completo ?? 'usuário'}{analise.analisado_em ? ` em ${fmtDateOnly(analise.analisado_em)}` : ''}
            </div>
          )}
          {analise?.observacao && (
            <blockquote className={styles.analysisObs}>{analise.observacao}</blockquote>
          )}
        </div>
        <button type="button" className={`${styles.btnPrimary} ${styles.btnWarning}`} onClick={onReverter}>
          <IconArrowLeft size={14} aria-hidden="true" />
          Reverter recusa
        </button>
      </>
    )
  }

  return null
}
