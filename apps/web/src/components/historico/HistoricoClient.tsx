'use client'

import { useCallback, useEffect, useReducer, useState } from 'react'
import {
  IconFilter,
  IconDownload,
  IconFileTypeCsv,
  IconFileTypePdf,
} from '@tabler/icons-react'
import type { OrdemServicoDetalhe, RespostaPaginada } from '@metalsider/shared'
import type { CategoriaResumo } from '@metalsider/shared'
import { listarOS } from '@/lib/api/ordens-servico'
import { buscarOS } from '@/lib/api/ordens-servico'
import { FiltrosPainel } from './FiltrosPainel'
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

// ---- Exportação CSV ----
function exportarCSV(dados: OrdemServicoDetalhe[]) {
  const header = ['ID', 'Título', 'Categoria', 'Prioridade', 'Status', 'Veículo', 'Mecânico', 'Prazo', 'Fechado em']
  const rows = dados.map((os) => [
    String(os.id),
    `"${os.titulo.replace(/"/g, '""')}"`,
    os.categoria_nome,
    os.prioridade,
    os.status,
    os.veiculo_placa,
    os.mecanico_nome ?? '',
    os.prazo,
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

// ---- Exportação PDF via print ----
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
      <td>${new Date(os.prazo).toLocaleDateString('pt-BR')}</td>
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
        <th>Status</th><th>Veículo</th><th>Mecânico</th><th>Prazo</th><th>Fechado em</th>
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

// ---- Componente principal ----
export function HistoricoClient({ token, perfil, categorias }: Props) {
  const [filtros, dispatch] = useReducer(filtrosReducer, { ...FILTROS_PADRAO })
  const [resultado, setResultado] = useState<RespostaPaginada<OrdemServicoDetalhe> | null>(null)
  const [loading, setLoading] = useState(true)
  const [osSelecionada, setOSSelecionada] = useState<OrdemServicoDetalhe | null>(null)
  const [filtrosMobileAberto, setFiltrosMobileAberto] = useState(false)
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false)

  const buscar = useCallback(async (f: FiltrosHistorico) => {
    setLoading(true)
    try {
      const params: Record<string, string | number | undefined> = {
        pagina:     f.pagina,
        por_pagina: f.por_pagina,
      }
      if (f.busca)       params['busca']       = f.busca
      if (f.status)      params['status']      = f.status
      if (f.prioridade)  params['prioridade']  = f.prioridade
      if (f.categoria_id) params['categoria_id'] = f.categoria_id
      if (f.de)          params['de']          = new Date(f.de).toISOString()
      if (f.ate) {
        const ate = new Date(f.ate)
        ate.setHours(23, 59, 59, 999)
        params['ate'] = ate.toISOString()
      }

      const res = await listarOS(params as Parameters<typeof listarOS>[0], token)
      setResultado(res as RespostaPaginada<OrdemServicoDetalhe>)
    } catch {
      setResultado(null)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    buscar(filtros)
  }, [filtros, buscar])

  async function handleSelecionar(os: OrdemServicoDetalhe) {
    if (osSelecionada?.id === os.id) {
      setOSSelecionada(null)
      return
    }
    // Se o item da lista já tem dados completos (anexos), usa direto
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

  const dados = (resultado?.dados as OrdemServicoDetalhe[]) ?? []

  return (
    <div className={styles.layout}>
      {/* ---- Filtros — lateral desktop ---- */}
      <div className={styles.filtrosDesktop}>
        <FiltrosPainel
          filtros={filtros}
          categorias={categorias}
          onChange={(parcial) => dispatch({ type: 'set', parcial })}
          onReset={() => dispatch({ type: 'reset' })}
        />
      </div>

      {/* ---- Conteúdo principal ---- */}
      <div className={styles.main}>
        {/* Header da área de conteúdo */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button
              type="button"
              className={styles.btnFiltrosMobile}
              onClick={() => setFiltrosMobileAberto(true)}
              aria-label="Abrir filtros"
            >
              <IconFilter size={18} />
              Filtros
            </button>

            {resultado && (
              <span className={styles.total}>
                {resultado.paginacao.total} chamado{resultado.paginacao.total !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Exportações */}
          {dados.length > 0 && (
            <div className={styles.exportacoes}>
              <button
                type="button"
                className={styles.btnExport}
                onClick={() => exportarCSV(dados)}
                aria-label="Exportar CSV"
                title="Exportar CSV"
              >
                <IconFileTypeCsv size={16} />
                <span className={styles.btnExportLabel}>CSV</span>
              </button>
              <button
                type="button"
                className={styles.btnExport}
                onClick={() => exportarPDF(dados)}
                aria-label="Exportar PDF"
                title="Exportar PDF"
              >
                <IconFileTypePdf size={16} />
                <span className={styles.btnExportLabel}>PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* Tabela */}
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
      {filtrosMobileAberto && (
        <>
          <div
            className={styles.bsOverlay}
            onClick={() => setFiltrosMobileAberto(false)}
            aria-hidden="true"
          />
          <div
            className={styles.bottomSheet}
            role="dialog"
            aria-label="Filtros"
            data-testid="bottom-sheet-filtros"
          >
            <div className={styles.bsHandle} aria-hidden="true" />
            <div className={styles.bsHeader}>
              <h2 className={styles.bsTitulo}>Filtros</h2>
              <button
                type="button"
                className={styles.bsBtnFechar}
                onClick={() => setFiltrosMobileAberto(false)}
                aria-label="Fechar filtros"
              >
                ✕
              </button>
            </div>
            <div className={styles.bsBody}>
              <FiltrosPainel
                filtros={filtros}
                categorias={categorias}
                onChange={(parcial) => {
                  dispatch({ type: 'set', parcial })
                }}
                onReset={() => {
                  dispatch({ type: 'reset' })
                  setFiltrosMobileAberto(false)
                }}
              />
            </div>
            <div className={styles.bsFooter}>
              <button
                type="button"
                className={styles.btnAplicar}
                onClick={() => setFiltrosMobileAberto(false)}
              >
                <IconDownload size={16} />
                Aplicar filtros
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
