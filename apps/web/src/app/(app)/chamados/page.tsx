import type { Metadata } from 'next'
import { EmptyState } from '@/components/ui'
import { IconClipboardList } from '@tabler/icons-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Chamados Abertos',
}

export default function ChamadosPage() {
  return (
    <div className={styles.page}>
      <EmptyState
        icon={<IconClipboardList size={40} />}
        title="Chamados Abertos"
        description="Grade de chamados com filtros, busca e ações de fechamento serão implementados na Sprint 7."
      />
    </div>
  )
}
