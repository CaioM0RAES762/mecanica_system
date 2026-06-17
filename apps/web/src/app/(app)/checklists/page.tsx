import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { ChecklistsClient } from '@/components/checklists/ChecklistsClient'
import { listarChecklists, buscarSyncStatus } from '@/lib/api/checklists'
import type { PaginacaoChecklists, SyncStatus } from '@/lib/api/checklists'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Checklists | MetalSider',
}

const TABS_VALIDAS = ['NAO_CONFORME', 'CONFORME', 'RECUSADO'] as const
type TabValida = (typeof TABS_VALIDAS)[number]

export default async function ChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    pagina?: string
    placa?: string
    motorista?: string
    checklist?: string
    prioridade?: string
    template?: string
    statusFiltro?: string
    de?: string
    ate?: string
    rapida?: string
  }>
}) {
  const session = await auth()
  const token = session?.accessToken ?? ''

  const {
    tab, pagina,
    placa, motorista, checklist, prioridade, template, statusFiltro, de, ate, rapida,
  } = await searchParams

  const initialTab: TabValida = (TABS_VALIDAS as readonly string[]).includes(tab ?? '')
    ? (tab as TabValida)
    : 'NAO_CONFORME'
  const initialPagina = pagina && /^\d+$/.test(pagina) ? Math.max(1, parseInt(pagina, 10)) : 1

  const initialFiltros = {
    veiculoPlaca:  placa       ?? '',
    motoristaNome: motorista   ?? '',
    nomeChecklist: checklist   ?? '',
    prioridade:    prioridade  ?? '',
    templateId:    template    ?? '',
    statusFiltro:  statusFiltro ?? '',
    startDate:     de          ?? '',
    endDate:       ate         ?? '',
  }

  const temFiltros = Object.values(initialFiltros).some(v => v !== '')

  let initialDados: PaginacaoChecklists | null = null
  let initialSyncStatus: SyncStatus | null = null

  try {
    ;[initialDados, initialSyncStatus] = await Promise.all([
      listarChecklists({
        status: initialTab === 'NAO_CONFORME'
          ? (initialFiltros.statusFiltro || 'NAO_CONFORME,APROVADO,OS_GERADA')
          : initialTab,
        pagina: initialPagina,
        porPagina: 20,
        ...(temFiltros ? {
          veiculoPlaca:    initialFiltros.veiculoPlaca  || undefined,
          motoristaNome:   initialFiltros.motoristaNome || undefined,
          nomeChecklist:   initialFiltros.nomeChecklist || undefined,
          prioridade:      initialFiltros.prioridade    || undefined,
          cobliTemplateId: initialFiltros.templateId    || undefined,
          startDate:       initialFiltros.startDate     || undefined,
          endDate:         initialFiltros.endDate       || undefined,
        } : {}),
      }, token),
      buscarSyncStatus(token),
    ])
  } catch { /* fallback to null — client will fetch */ }

  return (
    <div className={styles.page}>
      <ChecklistsClient
        token={token}
        initialDados={initialDados}
        initialSyncStatus={initialSyncStatus}
        initialTab={initialTab}
        initialPagina={initialPagina}
        initialFiltros={initialFiltros}
        initialDataRapida={rapida ?? ''}
      />
    </div>
  )
}
