import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { ChamadosClient } from '@/components/chamados/ChamadosClient'
import { listarCategorias } from '@/lib/api/recursos'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Chamados Abertos',
}

export default async function ChamadosPage() {
  const session = await auth()
  const token = session?.accessToken ?? ''
  const categorias = await listarCategorias(token)

  return (
    <div className={styles.page}>
      <ChamadosClient
        accessToken={token}
        perfil={session?.user?.perfil ?? 'mecanico'}
        userId={session?.user?.id ?? ''}
        categorias={categorias}
      />
    </div>
  )
}
