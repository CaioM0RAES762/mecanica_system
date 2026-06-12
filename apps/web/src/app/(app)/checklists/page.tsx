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
  searchParams: Promise<{ tab?: string; pagina?: string }>
}) {
  const session = await auth()
  const token = session?.accessToken ?? ''

  const { tab, pagina } = await searchParams
  const initialTab: TabValida = (TABS_VALIDAS as readonly string[]).includes(tab ?? '')
    ? (tab as TabValida)
    : 'NAO_CONFORME'
  const initialPagina = pagina && /^\d+$/.test(pagina) ? Math.max(1, parseInt(pagina, 10)) : 1

  let initialDados: PaginacaoChecklists | null = null
  let initialSyncStatus: SyncStatus | null = null

  try {
    ;[initialDados, initialSyncStatus] = await Promise.all([
      listarChecklists({ status: initialTab, pagina: initialPagina, porPagina: 20 }, token),
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
      />
    </div>
  )
}
