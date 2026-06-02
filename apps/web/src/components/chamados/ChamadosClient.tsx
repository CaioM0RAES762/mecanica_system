'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { CategoriaResumo, OrdemServicoDetalhe, OrdemServicoResumo, RespostaPaginada } from '@metalsider/shared'
import type { FecharOSDTO } from '@metalsider/shared'
import { IconClipboardList, IconArchive } from '@tabler/icons-react'
import { EmptyState, Skeleton } from '@/components/ui'
import { listarOS, fecharOS } from '@/lib/api/ordens-servico'
import { FilterBar, FILTRO_INICIAL } from './FilterBar'
import type { FiltroState, TabAtiva, PeriodoFechados } from './FilterBar'
import { OSCard } from './OSCard'
import { FecharModal } from './FecharModal'
import { EditarOSModal } from './EditarOSModal'
import { ExcluirOSModal } from './ExcluirOSModal'
import styles from './ChamadosClient.module.css'

interface ChamadosClientProps {
  accessToken: string
  perfil: string
  userId: string
  categorias: CategoriaResumo[]
}

type FiltroAction = { type: 'set'; payload: Partial<FiltroState> } | { type: 'reset' }

function filtroReducer(state: FiltroState, action: FiltroAction): FiltroState {
  if (action.type === 'reset') return FILTRO_INICIAL
  return { ...state, ...action.payload }
}

// ---- Helpers de período ----

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
}

function endOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function periodoParaDatas(
  periodo: PeriodoFechados,
  dataInicio: string,
  dataFim: string,
): { fechado_de: string; fechado_ate: string } | null {
  const hoje = new Date()

  switch (periodo) {
    case 'hoje':
      return {
        fechado_de: startOfDay(hoje).toISOString(),
        fechado_ate: endOfDay(hoje).toISOString(),
      }
    case 'ontem': {
      const ontem = daysAgo(1)
      return {
        fechado_de: startOfDay(ontem).toISOString(),
        fechado_ate: endOfDay(ontem).toISOString(),
      }
    }
    case '3d':
      return {
        fechado_de: startOfDay(daysAgo(2)).toISOString(),
        fechado_ate: endOfDay(hoje).toISOString(),
      }
    case '5d':
      return {
        fechado_de: startOfDay(daysAgo(4)).toISOString(),
        fechado_ate: endOfDay(hoje).toISOString(),
      }
    case '7d':
      return {
        fechado_de: startOfDay(daysAgo(6)).toISOString(),
        fechado_ate: endOfDay(hoje).toISOString(),
      }
    case 'personalizado': {
      if (!dataInicio || !dataFim) return null
      const de = new Date(dataInicio + 'T00:00:00')
      const ate = new Date(dataFim + 'T23:59:59')
      if (isNaN(de.getTime()) || isNaN(ate.getTime())) return null
      return {
        fechado_de: de.toISOString(),
        fechado_ate: ate.toISOString(),
      }
    }
  }
}

// ---- Builders de parâmetros da API ----

function buildParamsAbertos(
  filtros: FiltroState,
  perfil: string,
  userId: string,
): Record<string, string> {
  const p: Record<string, string> = { excluir_fechados: 'true' }

  if (filtros.busca) p['busca'] = filtros.busca
  if (filtros.prioridade) p['prioridade'] = filtros.prioridade
  if (filtros.categoria_id) p['categoria_id'] = filtros.categoria_id

  if (filtros.atribuidos_a_mim) {
    if (perfil === 'mecanico') {
      p['mecanico_id'] = userId
    } else {
      p['supervisor_id'] = userId
    }
  }

  const [orderField, orderDir] = filtros.ordenacao.split('_')
  if (orderField === 'prazo') {
    p['orderBy'] = 'prazo'
    p['order'] = orderDir === 'asc' ? 'asc' : 'desc'
  } else if (orderField === 'criado') {
    p['orderBy'] = 'criado_em'
    p['order'] = orderDir === 'desc' ? 'desc' : 'asc'
  } else if (orderField === 'prioridade') {
    p['orderBy'] = 'prioridade'
    p['order'] = 'desc'
  }

  return p
}

function buildParamsFechados(
  periodo: PeriodoFechados,
  dataInicio: string,
  dataFim: string,
): Record<string, string> | null {
  const datas = periodoParaDatas(periodo, dataInicio, dataFim)
  if (!datas) return null
  return {
    status: 'fechado',
    fechado_de: datas.fechado_de,
    fechado_ate: datas.fechado_ate,
  }
}

// ---- Componente ----

export function ChamadosClient({
  accessToken,
  perfil,
  userId,
  categorias,
}: ChamadosClientProps) {
  const [filtros, dispatch] = useReducer(filtroReducer, FILTRO_INICIAL)
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('abertos')
  const [periodoFechados, setPeriodoFechados] = useState<PeriodoFechados>('hoje')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const [dados, setDados] = useState<RespostaPaginada<OrdemServicoResumo> | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Modais
  const [osParaFechar, setOsParaFechar] = useState<OrdemServicoResumo | null>(null)
  const [osParaEditar, setOsParaEditar] = useState<OrdemServicoResumo | null>(null)
  const [osParaExcluir, setOsParaExcluir] = useState<OrdemServicoResumo | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const categoriaCores = useMemo(() => {
    const m = new Map<number, string>()
    categorias.forEach(c => { if (c.cor) m.set(c.id, c.cor) })
    return m
  }, [categorias])

  const fetchOS = useCallback(
    async (
      tab: TabAtiva,
      f: FiltroState,
      periodo: PeriodoFechados,
      inicio: string,
      fim: string,
    ) => {
      setLoading(true)
      setErro(null)
      try {
        let params: Record<string, string> | null

        if (tab === 'abertos') {
          params = buildParamsAbertos(f, perfil, userId)
        } else {
          params = buildParamsFechados(periodo, inicio, fim)
          if (!params) {
            // Personalizado com datas incompletas: não busca
            setDados(null)
            setLoading(false)
            return
          }
        }

        const res = await listarOS(params, accessToken)
        setDados(res)
      } catch (e) {
        setErro(e instanceof Error ? e.message : 'Erro ao carregar chamados')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, perfil, userId],
  )

  // Debounce na busca; imediato nos outros filtros / mudanças de aba ou período
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const delay = tabAtiva === 'abertos' && filtros.busca ? 400 : 0
    debounceRef.current = setTimeout(() => {
      void fetchOS(tabAtiva, filtros, periodoFechados, dataInicio, dataFim)
    }, delay)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, tabAtiva, periodoFechados, dataInicio, dataFim, fetchOS])

  async function handleFechar(id: number, data: FecharOSDTO) {
    await fecharOS(id, data, accessToken)
    setDados(prev => {
      if (!prev) return prev
      const novosDados = prev.dados.filter(os => os.id !== id)
      return {
        ...prev,
        dados: novosDados,
        paginacao: { ...prev.paginacao, total: prev.paginacao.total - 1 },
      }
    })
  }

  function handleEditarSuccess(osAtualizada: OrdemServicoDetalhe) {
    setDados(prev => {
      if (!prev) return prev
      return {
        ...prev,
        dados: prev.dados.map(os =>
          os.id === osAtualizada.id
            ? {
                ...os,
                titulo:             osAtualizada.titulo,
                prioridade:         osAtualizada.prioridade,
                categoria_id:       osAtualizada.categoria_id,
                categoria_nome:     osAtualizada.categoria_nome,
                veiculo_id:         osAtualizada.veiculo_id,
                veiculo_placa:      osAtualizada.veiculo_placa,
                veiculo_nome:       osAtualizada.veiculo_nome,
                veiculo_descricao_tipo_aplicacao: osAtualizada.veiculo_descricao_tipo_aplicacao,
                mecanico_id:        osAtualizada.mecanico_id,
                mecanico_nome:      osAtualizada.mecanico_nome,
              }
            : os,
        ),
      }
    })
  }

  function handleExcluirSuccess(id: number) {
    setDados(prev => {
      if (!prev) return prev
      return {
        ...prev,
        dados: prev.dados.filter(os => os.id !== id),
        paginacao: { ...prev.paginacao, total: prev.paginacao.total - 1 },
      }
    })
  }

  function handleTabChange(t: TabAtiva) {
    setTabAtiva(t)
    setDados(null)
  }

  const lista = dados?.dados ?? []
  const total = dados?.paginacao.total ?? 0

  const emptyFechados =
    !loading && !erro && tabAtiva === 'fechados' && dados !== null && lista.length === 0

  return (
    <div className={styles.wrapper}>
      <FilterBar
        filtros={filtros}
        categorias={categorias}
        perfil={perfil}
        total={total}
        loading={loading}
        tabAtiva={tabAtiva}
        periodoFechados={periodoFechados}
        dataInicio={dataInicio}
        dataFim={dataFim}
        onTabChange={handleTabChange}
        onPeriodoChange={setPeriodoFechados}
        onDataInicioChange={setDataInicio}
        onDataFimChange={setDataFim}
        onAtualizar={() => void fetchOS(tabAtiva, filtros, periodoFechados, dataInicio, dataFim)}
        onChange={payload => dispatch({ type: 'set', payload })}
        onReset={() => dispatch({ type: 'reset' })}
      />

      <div className={styles.content}>
        {erro && (
          <div className={styles.erro} role="alert">
            {erro}
            <button
              onClick={() => void fetchOS(tabAtiva, filtros, periodoFechados, dataInicio, dataFim)}
              className={styles.erroRetry}
            >
              Tentar novamente
            </button>
          </div>
        )}

        {loading && (
          <div className={styles.grid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && !erro && tabAtiva === 'abertos' && lista.length === 0 && (
          <EmptyState
            icon={<IconClipboardList size={40} />}
            title="Nenhum chamado encontrado"
            description="Ajuste os filtros ou aguarde novos chamados."
          />
        )}

        {emptyFechados && (
          <EmptyState
            icon={<IconArchive size={40} />}
            title="Nenhum chamado fechado neste período"
            description="Tente ampliar o período ou selecione um intervalo diferente."
          />
        )}

        {!loading && !erro && lista.length > 0 && (
          <div className={styles.grid} data-testid="os-grid">
            {lista.map(os => (
              <OSCard
                key={os.id}
                os={os}
                categoriaCor={categoriaCores.get(os.categoria_id)}
                perfil={perfil}
                userId={userId}
                onFechar={setOsParaFechar}
                onEditar={setOsParaEditar}
                onExcluir={setOsParaExcluir}
              />
            ))}
          </div>
        )}
      </div>

      <FecharModal
        os={osParaFechar}
        onClose={() => setOsParaFechar(null)}
        onConfirm={handleFechar}
        accessToken={accessToken}
      />

      <EditarOSModal
        os={osParaEditar}
        categorias={categorias}
        accessToken={accessToken}
        onClose={() => setOsParaEditar(null)}
        onSuccess={handleEditarSuccess}
      />

      <ExcluirOSModal
        os={osParaExcluir}
        accessToken={accessToken}
        onClose={() => setOsParaExcluir(null)}
        onSuccess={handleExcluirSuccess}
      />
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard} aria-hidden="true">
      <Skeleton style={{ height: 18, width: '40%' }} />
      <Skeleton style={{ height: 20, width: '85%' }} />
      <Skeleton style={{ height: 14, width: '60%' }} />
      <Skeleton style={{ height: 14, width: '50%' }} />
      <Skeleton style={{ height: 14, width: '55%' }} />
      <Skeleton style={{ height: 4, width: '100%', borderRadius: 9999 }} />
    </div>
  )
}
