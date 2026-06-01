'use client'

import { useCallback, useEffect, useReducer, useState } from 'react'
import {
  IconSearch,
  IconFileTypeCsv,
  IconFileTypePdf,
  IconFilter,
} from '@tabler/icons-react'
import { PRIORIDADE_LABEL, PrioridadeOS, StatusOS } from '@metalsider/shared'
import type { OrdemServicoDetalhe, RespostaPaginada, CategoriaResumo } from '@metalsider/shared'
import { listarOS, buscarOS } from '@/lib/api/ordens-servico'
import { TabelaHistorico } from './TabelaHistorico'
import { DrawerDetalhes } from './DrawerDetalhes'
import { FILTROS_PADRAO } from './types'
import type { FiltrosHistorico } from './types'
import styles from './HistoricoClient.module.css'

interface Props {
  token: string
  perfil: string
  categorias: CategoriaResumo[]
}

type Action =
  | { type: 'set'; parcial: Partial<FiltrosHistorico> }
  | { type: 'reset' }
  | { type: 'pagina'; pagina: number }

function filtrosReducer(state: FiltrosHistorico, action: Action): FiltrosHistorico {
  switch (action.type) {
    case 'set':    return { ...state, ...action.parcial, pagina: 1 }
    case 'reset':  return { ...FILTROS_PADRAO }
    case 'pagina': return { ...state, pagina: action.pagina }
  }
}

function filtrosAtivos(f: FiltrosHistorico): boolean {
  return !!(f.busca || f.status || f.prioridade || f.categoria_id || f.de || f.ate)
}

function exportarCSV(dados: OrdemServicoDetalhe[]) {
  const header = ['ID', 'Título', 'Categoria', 'Prioridade', 'Status', 'Veículo', 'Mecânico', 'Data Abertura', 'Fechado em']
  const rows = dados.map((os) => [
    String(os.id),
    `"${os.titulo.replace(/"/g, '""')}"`,
    os.categoria_nome,
    os.prioridade,
    os.status,
    os.veiculo_placa,
    os.mecanico_nome ?? '',
    os.criado_em,
    os.fechado_em ?? '',
  ])
  const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `historico-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportarPDF(dados: OrdemServicoDetalhe[]) {
  const linhas = dados.map((os) => `
    <tr>
      <td>#${os.id}</td>
      <td>${os.titulo}</td>
      <td>${os.categoria_nome}</td>
      <td>${os.prioridade}</td>
      <td>${os.status}</td>
      <td>${os.veiculo_placa}</td>
      <td>${os.mecanico_nome ?? '—'}</td>
      <td>${new Date(os.criado_em).toLocaleDateString('pt-BR')}</td>
      <td>${os.fechado_em ? new Date(os.fechado_em).toLocaleDateString('pt-BR') : '—'}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html><html lang="pt-BR">
  <head><meta charset="utf-8"><title>Histórico de Chamados</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; }
    h1 { font-size: 14px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; }
    th { background: #f4f4f4; font-weight: bold; }
    @media print { @page { margin: 1cm; } }
  </style></head>
  <body>
    <h1>Histórico de Chamados — ${new Date().toLocaleDateString('pt-BR')}</h1>
    <table>
      <thead><tr>
        <th>ID</th><th>Título</th><th>Categoria</th><th>Prioridade</th>
        <th>Status</th><th>Veículo</th><th>Mecânico</th><th>Data Abertura</th><th>Fechado em</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
  </body></html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
  win.close()
}

const STATUS_OPTS = [
  { value: '',                    label: 'Todos os status' },
  { value: StatusOS.FECHADO,      label: 'Fechados' },
  { value: StatusOS.ATRASADO,     label: 'Atrasados' },
  { value: StatusOS.ABERTO,       label: 'Abertos' },
]

const PRIORIDADE_OPTS = [
  { value: '', label: 'Todas as prioridades' },
  ...Object.values(PrioridadeOS).map((p) => ({ value: p, label: PRIORIDADE_LABEL[p] })),
]

export function HistoricoClient({ token, perfil, categorias }: Props) {
  const [filtros, dispatch]           = useReducer(filtrosReducer, { ...FILTROS_PADRAO })
  const [resultado, setResultado]     = useState<RespostaPaginada<OrdemServicoDetalhe> | null>(null)
  const [loading, setLoading]         = useState(true)
  const [erro, setErro]               = useState<string | null>(null)
  const [osSelecionada, setOSSelecionada] = useState<OrdemServicoDetalhe | null>(null)
  const [mobileAberto, setMobileAberto]   = useState(false)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  const buscar = useCallback(async (f: FiltrosHistorico, signal?: AbortSignal) => {
    setLoading(true)
    setErro(null)
    try {
      const params: Record<string, string | number | undefined> = {
        pagina:     f.pagina,
        por_pagina: f.por_pagina,
      }
      if (f.busca)        params['busca']        = f.busca
      if (f.status)       params['status']       = f.status
      if (f.prioridade)   params['prioridade']   = f.prioridade
      if (f.categoria_id) params['categoria_id'] = f.categoria_id
      if (f.de)           params['de']           = new Date(f.de).toISOString()
      if (f.ate) {
        const ate = new Date(f.ate)
        ate.setHours(23, 59, 59, 999)
        params['ate'] = ate.toISOString()
      }

      const res = await listarOS(params as Parameters<typeof listarOS>[0], token, signal)
      setResultado(res as RespostaPaginada<OrdemServicoDetalhe>)
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return
      setResultado(null)
      setErro(e instanceof Error ? e.message : 'Erro ao carregar chamados. Verifique a conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    const controller = new AbortController()
    void buscar(filtros, controller.signal)
    return () => controller.abort()
  }, [filtros, buscar])

  async function handleSelecionar(os: OrdemServicoDetalhe) {
    if (osSelecionada?.id === os.id) {
      setOSSelecionada(null)
      return
    }
    if (os.anexos !== undefined) {
      setOSSelecionada(os)
      return
    }
    setCarregandoDetalhe(true)
    try {
      const detalhe = await buscarOS(os.id, token)
      setOSSelecionada(detalhe)
    } catch {
      setOSSelecionada(os)
    } finally {
      setCarregandoDetalhe(false)
    }
  }

  const dados      = (resultado?.dados as OrdemServicoDetalhe[]) ?? []
  const total      = resultado?.paginacao.total ?? 0
  const hasFiltros = filtrosAtivos(filtros)

  const categoriaOpts = [
    { value: '', label: 'Todas as categorias' },
    ...categorias.map((c) => ({ value: String(c.id), label: c.nome })),
  ]

  return (
    <div className={styles.layout}>
      {/* ---- Zona de controles ---- */}
      <div className={styles.controles}>
        {/* Linha 1: título + contador + exportações */}
        <div className={styles.controlesLinha1}>
          <div className={styles.controlesEsquerda}>
            <h1 className={styles.titulo}>Histórico de Chamados</h1>
            <span className={styles.contador}>
              {total} chamado{total !== 1 ? 's' : ''}
            </span>
          </div>

          {dados.length > 0 && (
            <div className={styles.exportacoes}>
              <button
                type="button"
                className={styles.btnExport}
                onClick={() => exportarCSV(dados)}
                aria-label="Exportar CSV"
              >
                <IconFileTypeCsv size={16} />
                CSV
              </button>
              <button
                type="button"
                className={styles.btnExport}
                onClick={() => exportarPDF(dados)}
                aria-label="Exportar PDF"
              >
                <IconFileTypePdf size={16} />
                PDF
              </button>
            </div>
          )}
        </div>

        {/* Linha 2: filtros */}
        <div className={styles.filtrosLinha}>
          {/* Controles visíveis somente em desktop */}
          <div className={styles.filtrosDesktop}>
            <div className={styles.campoBusca}>
              <IconSearch size={14} className={styles.iconeInput} aria-hidden="true" />
              <input
                type="text"
                className={styles.inputBusca}
                placeholder="ID ou título..."
                value={filtros.busca ?? ''}
                onChange={(e) => dispatch({ type: 'set', parcial: { busca: e.target.value || undefined } })}
                aria-label="Buscar por ID ou título"
              />
            </div>

            <select
              className={styles.select}
              value={filtros.status ?? ''}
              onChange={(e) => dispatch({ type: 'set', parcial: { status: e.target.value as FiltrosHistorico['status'] } })}
              aria-label="Filtrar por status"
            >
              {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className={styles.select}
              value={filtros.prioridade ?? ''}
              onChange={(e) => dispatch({ type: 'set', parcial: { prioridade: e.target.value as FiltrosHistorico['prioridade'] } })}
              aria-label="Filtrar por prioridade"
            >
              {PRIORIDADE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select
              className={styles.select}
              value={filtros.categoria_id ? String(filtros.categoria_id) : ''}
              onChange={(e) => dispatch({ type: 'set', parcial: { categoria_id: e.target.value ? Number(e.target.value) : undefined } })}
              aria-label="Filtrar por categoria"
            >
              {categoriaOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <input
              type="date"
              className={styles.inputData}
              value={filtros.de ?? ''}
              onChange={(e) => dispatch({ type: 'set', parcial: { de: e.target.value || undefined } })}
              aria-label="Data inicial"
              title="De"
            />

            <input
              type="date"
              className={styles.inputData}
              value={filtros.ate ?? ''}
              onChange={(e) => dispatch({ type: 'set', parcial: { ate: e.target.value || undefined } })}
              aria-label="Data final"
              title="Até"
            />

            {hasFiltros && (
              <button
                type="button"
                className={styles.btnLimpar}
                onClick={() => dispatch({ type: 'reset' })}
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Botão de filtros somente em mobile */}
          <button
            type="button"
            className={styles.btnFiltrosMobile}
            onClick={() => setMobileAberto(true)}
            aria-label="Abrir filtros"
          >
            <IconFilter size={16} />
            Filtros
            {hasFiltros && <span className={styles.filtrosAtivoBadge} />}
          </button>
        </div>
      </div>

      {/* ---- Zona de conteúdo ---- */}
      <div className={styles.conteudo}>
        {erro && (
          <div role="alert" className={styles.erro}>
            {erro}
            <button
              type="button"
              className={styles.btnTentar}
              onClick={() => buscar(filtros)}
            >
              Tentar novamente
            </button>
          </div>
        )}

        <TabelaHistorico
          dados={dados}
          paginacao={resultado?.paginacao ?? { pagina: 1, por_pagina: 20, total: 0, paginas: 0 }}
          loading={loading || carregandoDetalhe}
          onSelecionar={handleSelecionar}
          onPagina={(p) => dispatch({ type: 'pagina', pagina: p })}
        />
      </div>

      {/* ---- Drawer de detalhes ---- */}
      <DrawerDetalhes
        os={osSelecionada}
        onClose={() => setOSSelecionada(null)}
        token={token}
        perfil={perfil}
      />

      {/* ---- Bottom sheet de filtros — mobile ---- */}
      {mobileAberto && (
        <>
          <div
            className={styles.bsOverlay}
            onClick={() => setMobileAberto(false)}
            aria-hidden="true"
          />
          <div
            className={styles.bottomSheet}
            role="dialog"
            aria-label="Filtros"
          >
            <div className={styles.bsHandle} aria-hidden="true" />
            <div className={styles.bsHeader}>
              <h2 className={styles.bsTitulo}>Filtros</h2>
              <button
                type="button"
                className={styles.bsBtnFechar}
                onClick={() => setMobileAberto(false)}
                aria-label="Fechar filtros"
              >
                ✕
              </button>
            </div>
            <div className={styles.bsBody}>
              <div className={styles.bsCampos}>
                <label className={styles.bsLabel}>Buscar</label>
                <input
                  type="text"
                  className={styles.inputMobile}
                  placeholder="ID ou título..."
                  value={filtros.busca ?? ''}
                  onChange={(e) => dispatch({ type: 'set', parcial: { busca: e.target.value || undefined } })}
                />

                <label className={styles.bsLabel}>Status</label>
                <select
                  className={styles.inputMobile}
                  value={filtros.status ?? ''}
                  onChange={(e) => dispatch({ type: 'set', parcial: { status: e.target.value as FiltrosHistorico['status'] } })}
                >
                  {STATUS_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <label className={styles.bsLabel}>Prioridade</label>
                <select
                  className={styles.inputMobile}
                  value={filtros.prioridade ?? ''}
                  onChange={(e) => dispatch({ type: 'set', parcial: { prioridade: e.target.value as FiltrosHistorico['prioridade'] } })}
                >
                  {PRIORIDADE_OPTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <label className={styles.bsLabel}>Categoria</label>
                <select
                  className={styles.inputMobile}
                  value={filtros.categoria_id ? String(filtros.categoria_id) : ''}
                  onChange={(e) => dispatch({ type: 'set', parcial: { categoria_id: e.target.value ? Number(e.target.value) : undefined } })}
                >
                  {categoriaOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>

                <label className={styles.bsLabel}>De</label>
                <input
                  type="date"
                  className={styles.inputMobile}
                  value={filtros.de ?? ''}
                  onChange={(e) => dispatch({ type: 'set', parcial: { de: e.target.value || undefined } })}
                />

                <label className={styles.bsLabel}>Até</label>
                <input
                  type="date"
                  className={styles.inputMobile}
                  value={filtros.ate ?? ''}
                  onChange={(e) => dispatch({ type: 'set', parcial: { ate: e.target.value || undefined } })}
                />
              </div>
            </div>
            <div className={styles.bsFooter}>
              <button
                type="button"
                className={styles.btnLimparMobile}
                onClick={() => dispatch({ type: 'reset' })}
              >
                Limpar filtros
              </button>
              <button
                type="button"
                className={styles.btnAplicar}
                onClick={() => setMobileAberto(false)}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
