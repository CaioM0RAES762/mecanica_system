'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Debounce hook ─────────────────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
import Link from 'next/link'
import {
  IconRefresh,
  IconEye,
  IconChevronLeft,
  IconChevronRight,
  IconClipboardCheck,
} from '@tabler/icons-react'
import { EmptyState } from '@/components/ui'
import type {
  ChecklistResumo,
  PaginacaoChecklists,
  SyncStatus,
  TemplateDisponivel,
} from '@/lib/api/checklists'
import {
  listarChecklists,
  listarTemplatesDisponiveis,
  dispararSync,
  buscarSyncStatus,
} from '@/lib/api/checklists'
import styles from './ChecklistsClient.module.css'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type TabAtiva = 'NAO_CONFORME' | 'CONFORME' | 'RECUSADO'

interface Filtros {
  veiculoPlaca: string
  motoristaNome: string
  nomeChecklist: string
  prioridade: string
  templateId: string
  startDate: string
  endDate: string
}

const FILTROS_INICIAIS: Filtros = {
  veiculoPlaca: '',
  motoristaNome: '',
  nomeChecklist: '',
  prioridade: '',
  templateId: '',
  startDate: '',
  endDate: '',
}

function formatarSyncAge(syncAt: string): {
  texto: string
  variante: 'green' | 'yellow' | 'red'
} {
  const diff = Date.now() - new Date(syncAt).getTime()
  const mins = Math.floor(diff / 60_000)
  const horas = Math.floor(diff / 3_600_000)
  const dias = Math.floor(diff / 86_400_000)

  if (dias >= 1) return { texto: `há ${dias} dia${dias > 1 ? 's' : ''}`, variante: 'red' }
  if (horas >= 4) return { texto: `há ${horas}h`, variante: 'red' }
  if (mins >= 30) return { texto: `há ${horas > 0 ? `${horas}h` : `${mins}min`}`, variante: 'yellow' }
  if (mins < 1) return { texto: 'agora mesmo', variante: 'green' }
  return { texto: `há ${mins}min`, variante: 'green' }
}

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
    case 'NAO_CONFORME': return 'Não conforme'
    case 'CONFORME':     return 'Conforme'
    case 'APROVADO':     return 'Aprovado'
    case 'RECUSADO':     return 'Recusado'
    case 'OS_GERADA':    return 'OS Gerada'
    default:             return status
  }
}

function prioBadgeClass(prioridade: string | null): string {
  switch (prioridade) {
    case 'CRITICA': return styles.badgePrioCritica ?? ''
    case 'ALTA':    return styles.badgePrioAlta ?? ''
    case 'MEDIA':   return styles.badgePrioMedia ?? ''
    case 'BAIXA':   return styles.badgePrioBaixa ?? ''
    default:        return styles.badgePrioBaixa ?? ''
  }
}

function prioLabel(prioridade: string | null): string {
  switch (prioridade) {
    case 'CRITICA': return 'Crítica'
    case 'ALTA':    return 'Alta'
    case 'MEDIA':   return 'Média'
    case 'BAIXA':   return 'Baixa'
    default:        return '—'
  }
}

function scoreClass(pontuacao: number): string {
  if (pontuacao >= 20) return styles.scoreHigh ?? ''
  if (pontuacao >= 10) return styles.scoreMedHigh ?? ''
  if (pontuacao >= 4)  return styles.scoreMedLow ?? ''
  return styles.scoreLow ?? ''
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Não informada'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface ChecklistsClientProps {
  token: string
  initialSyncStatus: SyncStatus | null
  initialDados: PaginacaoChecklists | null
  initialTab?: TabAtiva
  initialPagina?: number
}

export function ChecklistsClient({
  token,
  initialSyncStatus,
  initialDados,
  initialTab = 'NAO_CONFORME',
  initialPagina = 1,
}: ChecklistsClientProps) {
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>(initialTab)
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS)
  const [filtrosAplicados, setFiltrosAplicados] = useState<Filtros>(FILTROS_INICIAIS)
  const [pagina, setPagina] = useState(initialPagina)

  // Debounce para campos de texto (400 ms)
  const debouncedPlaca = useDebounce(filtros.veiculoPlaca, 400)
  const debouncedMotorista = useDebounce(filtros.motoristaNome, 400)
  const debounceInitRef = useRef({ placa: debouncedPlaca, motorista: debouncedMotorista })

  const [dados, setDados] = useState<PaginacaoChecklists | null>(initialDados)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(initialSyncStatus)
  const [syncando, setSyncando] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState<{
    tipo: 'success' | 'error'
    msg: string
  } | null>(null)

  const [templates, setTemplates] = useState<TemplateDisponivel[]>([])

  // Totais por tab (para exibir contagem nos labels)
  const [totais, setTotais] = useState({
    NAO_CONFORME: initialTab === 'NAO_CONFORME' ? (initialDados?.paginacao.total ?? 0) : 0,
    CONFORME:     initialTab === 'CONFORME'     ? (initialDados?.paginacao.total ?? 0) : 0,
    RECUSADO:     initialTab === 'RECUSADO'     ? (initialDados?.paginacao.total ?? 0) : 0,
  })

  // Auto-aplica campos de texto após debounce (pula execuções sem mudança real de valor)
  useEffect(() => {
    if (
      debounceInitRef.current.placa === debouncedPlaca &&
      debounceInitRef.current.motorista === debouncedMotorista
    ) return
    debounceInitRef.current = { placa: debouncedPlaca, motorista: debouncedMotorista }
    setFiltrosAplicados(prev => ({
      ...prev,
      veiculoPlaca: debouncedPlaca,
      motoristaNome: debouncedMotorista,
    }))
    setPagina(1)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedPlaca, debouncedMotorista])

  const fetchAbortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(
    async (tab: TabAtiva, f: Filtros, pg: number) => {
      fetchAbortRef.current?.abort()
      const ctrl = new AbortController()
      fetchAbortRef.current = ctrl

      setLoading(true)
      setErro(null)
      try {
        const params: Parameters<typeof listarChecklists>[0] = {
          status: tab,
          pagina: pg,
          porPagina: 20,
        }
        if (f.veiculoPlaca)  params.veiculoPlaca    = f.veiculoPlaca
        if (f.motoristaNome) params.motoristaNome   = f.motoristaNome
        if (f.nomeChecklist) params.nomeChecklist   = f.nomeChecklist
        if (f.prioridade)    params.prioridade      = f.prioridade
        if (f.templateId)    params.cobliTemplateId = f.templateId
        if (f.startDate)     params.startDate       = f.startDate
        if (f.endDate)       params.endDate         = f.endDate

        const res = await listarChecklists(params, token, ctrl.signal)
        setDados(res)
        setTotais(prev => ({ ...prev, [tab]: res.paginacao.total }))
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return
        setErro(e instanceof Error ? e.message : 'Erro ao carregar checklists')
      } finally {
        if (!ctrl.signal.aborted) setLoading(false)
      }
    },
    [token],
  )

  useEffect(() => {
    return () => { fetchAbortRef.current?.abort() }
  }, [])

  useEffect(() => {
    void fetchData(tabAtiva, filtrosAplicados, pagina)
  }, [tabAtiva, filtrosAplicados, pagina, fetchData])

  // Buscar totais das outras tabs na montagem
  useEffect(() => {
    async function fetchTotals() {
      try {
        const [conf, rec] = await Promise.all([
          listarChecklists({ status: 'CONFORME', pagina: 1, porPagina: 1 }, token),
          listarChecklists({ status: 'RECUSADO', pagina: 1, porPagina: 1 }, token),
        ])
        setTotais(prev => ({
          ...prev,
          CONFORME: conf.paginacao.total,
          RECUSADO: rec.paginacao.total,
        }))
      } catch { /* silencioso */ }
    }
    void fetchTotals()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Carregar lista de templates disponíveis para o filtro
  useEffect(() => {
    listarTemplatesDisponiveis(token)
      .then(res => setTemplates(res.dados))
      .catch(() => { /* silencioso — filtro funciona sem templates */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleTabChange(tab: TabAtiva) {
    setTabAtiva(tab)
    setPagina(1)
    setDados(null)
  }

  function handleFiltrar(e: React.FormEvent) {
    e.preventDefault()
    setPagina(1)
    setFiltrosAplicados({ ...filtros })
  }

  function handleLimpar() {
    setFiltros(FILTROS_INICIAIS)
    setFiltrosAplicados(FILTROS_INICIAIS)
    setPagina(1)
  }

  // Selects e datas aplicam imediatamente (sem debounce)
  function handleInstantChange(key: 'prioridade' | 'templateId' | 'startDate' | 'endDate', value: string) {
    setFiltros(f => ({ ...f, [key]: value }))
    setFiltrosAplicados(prev => ({ ...prev, [key]: value }))
    setPagina(1)
  }

  async function handleSync() {
    setSyncando(true)
    setSyncFeedback(null)
    try {
      const res = await dispararSync(token)
      setSyncFeedback({
        tipo: 'success',
        msg: `${res.total_imported} importados, ${res.total_skipped} ignorados`,
      })
      const status = await buscarSyncStatus(token)
      setSyncStatus(status)
      // Recarregar dados da aba atual
      void fetchData(tabAtiva, filtrosAplicados, pagina)
    } catch (e) {
      setSyncFeedback({
        tipo: 'error',
        msg: e instanceof Error ? e.message : 'Erro ao sincronizar',
      })
    } finally {
      setSyncando(false)
    }
  }

  const [pageEditing, setPageEditing] = useState(false)
  const [pageInput, setPageInput] = useState('')

  function handlePageInfoClick() {
    setPageInput(String(pagina))
    setPageEditing(true)
  }

  function commitPageInput() {
    const n = parseInt(pageInput, 10)
    if (!isNaN(n)) setPagina(Math.max(1, Math.min(totalPaginas, n)))
    setPageEditing(false)
  }

  function handlePageKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitPageInput()
    if (e.key === 'Escape') setPageEditing(false)
  }

  const lista = dados?.dados ?? []
  const totalPaginas = dados?.paginacao.paginas ?? 1
  const mostraNaoConformes = tabAtiva === 'NAO_CONFORME' || tabAtiva === 'RECUSADO'

  // Sync indicator
  let syncIndicator: { texto: string; variante: 'green' | 'yellow' | 'red' | 'gray' } = {
    texto: 'Nunca sincronizado',
    variante: 'gray',
  }
  if (syncStatus?.ultimo_sync) {
    const { texto, variante } = formatarSyncAge(syncStatus.ultimo_sync.synced_at)
    syncIndicator = { texto: `Sincronizado ${texto}`, variante }
  }

  return (
    <div className={styles.wrapper}>
      {/* ── Barra de controles ── */}
      <div className={styles.bar}>
        {/* Título + sync */}
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Checklists</h1>

          {/* Indicador de sync */}
          <span className={styles.syncIndicator}>
            <span
              className={`${styles.syncDot} ${
                syncIndicator.variante === 'green'  ? styles.syncDotGreen  :
                syncIndicator.variante === 'yellow' ? styles.syncDotYellow :
                syncIndicator.variante === 'red'    ? styles.syncDotRed    :
                styles.syncDotGray
              }`}
            />
            <span
              className={
                syncIndicator.variante === 'green'  ? styles.syncTextGreen  :
                syncIndicator.variante === 'yellow' ? styles.syncTextYellow :
                syncIndicator.variante === 'red'    ? styles.syncTextRed    :
                styles.syncTextGray
              }
            >
              {syncIndicator.texto}
            </span>
          </span>

          <div className={styles.titleSpacer} />

          <button
            type="button"
            className={styles.syncBtn}
            onClick={() => void handleSync()}
            disabled={syncando}
            aria-label="Sincronizar checklists"
          >
            <IconRefresh
              size={14}
              aria-hidden="true"
              className={syncando ? styles.syncSpinner : undefined}
            />
            {syncando ? 'Sincronizando…' : 'Sincronizar agora'}
          </button>
        </div>

        {/* Feedback de sync */}
        {syncFeedback && (
          <div
            className={`${styles.syncFeedback} ${
              syncFeedback.tipo === 'success'
                ? styles.syncFeedbackSuccess
                : styles.syncFeedbackError
            }`}
            role="status"
          >
            {syncFeedback.msg}
          </div>
        )}

        {/* Tabs */}
        <div className={styles.tabRow} role="tablist" aria-label="Status dos checklists">
          {(
            [
              { key: 'NAO_CONFORME', label: 'Não Conformes' },
              { key: 'CONFORME',     label: 'Conformes' },
              { key: 'RECUSADO',     label: 'Recusados' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tabAtiva === key}
              className={`${styles.tab} ${tabAtiva === key ? styles.tabActive : ''}`}
              onClick={() => handleTabChange(key)}
            >
              {label}
              <span className={styles.tabCount}>{totais[key]}</span>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <form onSubmit={handleFiltrar}>
          <div className={styles.filterRow}>
            <input
              className={styles.filterInput}
              placeholder="Placa do veículo"
              value={filtros.veiculoPlaca}
              onChange={e => setFiltros(f => ({ ...f, veiculoPlaca: e.target.value }))}
              aria-label="Filtrar por placa"
              autoComplete="off"
            />
            <input
              className={styles.filterInput}
              placeholder="Nome do motorista"
              value={filtros.motoristaNome}
              onChange={e => setFiltros(f => ({ ...f, motoristaNome: e.target.value }))}
              aria-label="Filtrar por motorista"
              autoComplete="off"
            />
            <select
              className={styles.filterSelect}
              value={filtros.prioridade}
              onChange={e => handleInstantChange('prioridade', e.target.value)}
              aria-label="Filtrar por prioridade"
            >
              <option value="">Todas as prioridades</option>
              <option value="CRITICA">Crítica</option>
              <option value="ALTA">Alta</option>
              <option value="MEDIA">Média</option>
              <option value="BAIXA">Baixa</option>
            </select>
            <select
              className={styles.filterSelect}
              value={filtros.templateId}
              onChange={e => handleInstantChange('templateId', e.target.value)}
              aria-label="Filtrar por template de checklist"
            >
              <option value="">Todos os templates</option>
              {templates.map(t => (
                <option key={t.template_id} value={t.template_id}>
                  {t.template_nome}
                </option>
              ))}
            </select>
            <div className={styles.filterDateRow}>
              <input
                type="date"
                className={styles.filterInput}
                value={filtros.startDate}
                onChange={e => handleInstantChange('startDate', e.target.value)}
                aria-label="Data inicial"
                title="De"
              />
              <input
                type="date"
                className={styles.filterInput}
                value={filtros.endDate}
                onChange={e => handleInstantChange('endDate', e.target.value)}
                aria-label="Data final"
                title="Até"
              />
            </div>
            <button type="submit" className={`${styles.filterBtn} ${styles.filterBtnPrimary}`}>
              Filtrar
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${styles.filterBtnSecondary}`}
              onClick={handleLimpar}
            >
              Limpar
            </button>
          </div>
        </form>
      </div>

      {/* ── Conteúdo ── */}
      <div className={styles.content}>
        {erro && (
          <div className={styles.erro} role="alert">
            {erro}
            <button
              className={styles.erroRetry}
              onClick={() => void fetchData(tabAtiva, filtrosAplicados, pagina)}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading && (
          <div className={styles.skeletonWrap} aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCell} style={{ width: '25%' }} />
                <div className={styles.skeletonCell} style={{ width: '15%' }} />
                <div className={styles.skeletonCell} style={{ width: '15%' }} />
                <div className={styles.skeletonCell} style={{ width: '12%' }} />
                <div className={styles.skeletonCell} style={{ width: '8%' }} />
                <div className={styles.skeletonCell} style={{ width: '10%' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && !erro && lista.length === 0 && (
          <EmptyState
            icon={<IconClipboardCheck size={40} />}
            title={
              tabAtiva === 'NAO_CONFORME'
                ? 'Nenhum checklist não conforme encontrado'
                : tabAtiva === 'CONFORME'
                ? 'Nenhum checklist conforme encontrado'
                : 'Nenhum checklist recusado'
            }
            description={
              tabAtiva === 'NAO_CONFORME'
                ? 'Execute uma sincronização para importar checklists da Cobli.'
                : tabAtiva === 'CONFORME'
                ? 'Nenhum checklist conforme no período selecionado.'
                : 'Nenhum checklist foi recusado.'
            }
          />
        )}

        {!loading && !erro && lista.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Checklist</th>
                    <th>Veículo / Placa</th>
                    <th className={styles.colMotorista}>Motorista</th>
                    <th>Preenchido em</th>
                    {mostraNaoConformes && (
                      <>
                        <th className={styles.colScore}>Pontuação</th>
                        <th>Prioridade</th>
                      </>
                    )}
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lista.map(cl => (
                    <ChecklistRow
                      key={cl.id}
                      checklist={cl}
                      mostraNaoConformes={mostraNaoConformes}
                      backTab={tabAtiva}
                      backPagina={pagina}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            {totalPaginas > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={pagina <= 1}
                  onClick={() => { setPageEditing(false); setPagina(p => p - 1) }}
                  aria-label="Página anterior"
                >
                  <IconChevronLeft size={14} aria-hidden="true" />
                  Anterior
                </button>

                {pageEditing ? (
                  <span className={styles.pageInputWrap}>
                    <span className={styles.pageInputLabel}>Página</span>
                    <input
                      className={styles.pageInput}
                      type="number"
                      min={1}
                      max={totalPaginas}
                      value={pageInput}
                      onChange={e => setPageInput(e.target.value)}
                      onBlur={commitPageInput}
                      onKeyDown={handlePageKeyDown}
                      autoFocus
                      aria-label={`Ir para página (1 a ${totalPaginas})`}
                    />
                    <span className={styles.pageInputOf}>de {totalPaginas}</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    className={styles.pageInfo}
                    onClick={handlePageInfoClick}
                    title={`Clique para ir direto a uma página (1 a ${totalPaginas})`}
                    aria-label={`Página ${pagina} de ${totalPaginas}. Clique para navegar diretamente.`}
                  >
                    Página {pagina} de {totalPaginas}
                  </button>
                )}

                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={pagina >= totalPaginas}
                  onClick={() => { setPageEditing(false); setPagina(p => p + 1) }}
                  aria-label="Próxima página"
                >
                  Próxima
                  <IconChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Linha da tabela ──────────────────────────────────────────────────────────

function ChecklistRow({
  checklist: cl,
  mostraNaoConformes,
  backTab,
  backPagina,
}: {
  checklist: ChecklistResumo
  mostraNaoConformes: boolean
  backTab: string
  backPagina: number
}) {
  const veiculoPartes = [cl.veiculo_marca, cl.veiculo_modelo].filter(Boolean).join(' ')

  return (
    <tr>
      <td>
        <div className={styles.cellPrimary}>{cl.nome_checklist}</div>
      </td>
      <td>
        {cl.veiculo_placa ? (
          <>
            <div className={styles.cellPrimary}>{cl.veiculo_placa}</div>
            {veiculoPartes && (
              <div className={`${styles.cellSecondary} ${styles.colMarcaModelo}`}>
                {veiculoPartes}
              </div>
            )}
          </>
        ) : (
          <span className={styles.cellMuted}>—</span>
        )}
      </td>
      <td className={styles.colMotorista}>
        {cl.motorista_nome ?? <span className={styles.cellMuted}>—</span>}
      </td>
      <td>
        <span style={{ fontSize: 'var(--text-xs)', color: '#605e5c' }}>
          {fmtDate(cl.preenchido_em)}
        </span>
      </td>
      {mostraNaoConformes && (
        <>
          <td className={`${styles.scoreCell} ${styles.colScore} ${scoreClass(cl.pontuacao_criticidade)}`}>
            {cl.pontuacao_criticidade}
          </td>
          <td>
            {cl.prioridade ? (
              <span className={`${styles.badge} ${prioBadgeClass(cl.prioridade)}`}>
                {prioLabel(cl.prioridade)}
              </span>
            ) : (
              <span className={styles.cellMuted}>—</span>
            )}
          </td>
        </>
      )}
      <td>
        <span className={`${styles.badge} ${statusBadgeClass(cl.status)}`}>
          {statusLabel(cl.status)}
        </span>
      </td>
      <td>
        <Link href={`/checklists/${cl.id}?tab=${backTab}&pagina=${backPagina}`} className={styles.actionBtn}>
          <IconEye size={13} aria-hidden="true" />
          Ver detalhes
        </Link>
      </td>
    </tr>
  )
}
