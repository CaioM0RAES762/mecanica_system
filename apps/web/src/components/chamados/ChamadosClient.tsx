'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { CategoriaResumo, OrdemServicoResumo, RespostaPaginada } from '@metalsider/shared'
import type { FecharOSDTO } from '@metalsider/shared'
import { IconClipboardList, IconRefresh } from '@tabler/icons-react'
import { Button, EmptyState, Skeleton } from '@/components/ui'
import { listarOS, fecharOS } from '@/lib/api/ordens-servico'
import { FilterBar, FILTRO_INICIAL } from './FilterBar'
import type { FiltroState } from './FilterBar'
import { OSCard } from './OSCard'
import { FecharModal } from './FecharModal'
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

function buildApiParams(
  filtros: FiltroState,
  perfil: string,
  userId: string,
): Record<string, string> {
  const p: Record<string, string> = {}

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

export function ChamadosClient({
  accessToken,
  perfil,
  userId,
  categorias,
}: ChamadosClientProps) {
  const [filtros, dispatch] = useReducer(filtroReducer, FILTRO_INICIAL)
  const [dados, setDados] = useState<RespostaPaginada<OrdemServicoResumo> | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [osParaFechar, setOsParaFechar] = useState<OrdemServicoResumo | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const categoriaCores = useMemo(() => {
    const m = new Map<number, string>()
    categorias.forEach(c => { if (c.cor) m.set(c.id, c.cor) })
    return m
  }, [categorias])

  const fetchOS = useCallback(
    async (f: FiltroState) => {
      setLoading(true)
      setErro(null)
      try {
        const params = buildApiParams(f, perfil, userId)
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

  // Debounce na busca; imediato nos outros filtros
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void fetchOS(filtros)
    }, filtros.busca ? 400 : 0)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [filtros, fetchOS])

  async function handleFechar(id: number, data: FecharOSDTO) {
    await fecharOS(id, data, accessToken)
    void fetchOS(filtros)
  }

  const lista = dados?.dados ?? []
  const total = dados?.paginacao.total ?? 0

  return (
    <div className={styles.wrapper}>
      <FilterBar
        filtros={filtros}
        categorias={categorias}
        perfil={perfil}
        onChange={payload => dispatch({ type: 'set', payload })}
        onReset={() => dispatch({ type: 'reset' })}
      />

      <div className={styles.content}>
        <div className={styles.headerRow}>
          <p className={styles.totalLabel}>
            {loading ? '…' : `${total} chamado${total !== 1 ? 's' : ''}`}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void fetchOS(filtros)}
            leftIcon={<IconRefresh size={14} />}
            aria-label="Atualizar lista"
            disabled={loading}
          >
            Atualizar
          </Button>
        </div>

        {erro && (
          <div className={styles.erro} role="alert">
            {erro}
            <button onClick={() => void fetchOS(filtros)} className={styles.erroRetry}>
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

        {!loading && !erro && lista.length === 0 && (
          <EmptyState
            icon={<IconClipboardList size={40} />}
            title="Nenhum chamado encontrado"
            description="Ajuste os filtros ou aguarde novos chamados."
          />
        )}

        {!loading && !erro && lista.length > 0 && (
          <div className={styles.grid} data-testid="os-grid">
            {lista.map(os => (
              <OSCard
                key={os.id}
                os={os}
                perfil={perfil}
                userId={userId}
                categoriaCor={categoriaCores.get(os.categoria_id)}
                onFechar={setOsParaFechar}
              />
            ))}
          </div>
        )}
      </div>

      <FecharModal
        os={osParaFechar}
        onClose={() => setOsParaFechar(null)}
        onConfirm={handleFechar}
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
      <Skeleton style={{ height: 4, width: '100%', borderRadius: 9999 }} />
    </div>
  )
}
