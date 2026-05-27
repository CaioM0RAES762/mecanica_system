import type { Metadata } from 'next'
import { EmptyState } from '@/components/ui'
import { IconSettings } from '@tabler/icons-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Configurações',
}

export default function ConfiguracoesPage() {
  return (
    <div className={styles.page}>
      <EmptyState
        icon={<IconSettings size={40} />}
        title="Configurações"
        description="Gestão de usuários, veículos, categorias e configurações de SLA serão implementados na Sprint 10."
      />
    </div>
  )
}
