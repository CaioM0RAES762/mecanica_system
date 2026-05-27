import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui'
import { IconPlus } from '@tabler/icons-react'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Novo Chamado',
}

export default async function NovoChamadoPage() {
  const session = await auth()
  const perfil = session?.user?.perfil

  if (perfil === 'mecanico') {
    redirect('/chamados')
  }

  return (
    <div className={styles.page}>
      <EmptyState
        icon={<IconPlus size={40} />}
        title="Novo Chamado"
        description="Formulário de abertura de chamado com preview sticky em desktop será implementado na Sprint 7."
      />
    </div>
  )
}
