import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { listarCategorias } from '@/lib/api/recursos'
import { HistoricoClient } from '@/components/historico/HistoricoClient'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Histórico de Chamados',
}

export default async function HistoricoPage() {
  const session    = await auth()
  const token      = session?.accessToken ?? ''
  const categorias = await listarCategorias(token)

  return (
    <div className={styles.page}>
      <HistoricoClient
        token={token}
        perfil={session?.user?.perfil ?? 'mecanico'}
        categorias={categorias}
      />
    </div>
  )
}
