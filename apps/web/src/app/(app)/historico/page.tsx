import type { Metadata } from 'next'
import { EmptyState } from '@/components/ui'
import { IconArchive } from '@tabler/icons-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Histórico',
}

export default function HistoricoPage() {
  return (
    <div className={styles.page}>
      <EmptyState
        icon={<IconArchive size={40} />}
        title="Histórico de Chamados"
        description="Tabela com filtros, paginação, exportação CSV/PDF e drawer de detalhes serão implementados na Sprint 8."
      />
    </div>
  )
}
