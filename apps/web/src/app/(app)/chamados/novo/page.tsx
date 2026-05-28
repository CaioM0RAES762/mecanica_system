import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { NovoChamadoForm } from '@/components/chamados/NovoChamadoForm'
import { listarCategorias, listarVeiculos, listarMecanicos } from '@/lib/api/recursos'
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

  const token = session?.accessToken ?? ''
  const [categorias, veiculos, mecanicos] = await Promise.all([
    listarCategorias(token),
    listarVeiculos(token),
    listarMecanicos(token),
  ])

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Novo Chamado</h1>
        <p className={styles.pageSubtitle}>Preencha os dados para abrir um novo chamado de manutenção.</p>
      </div>
      <NovoChamadoForm
        accessToken={token}
        perfil={perfil ?? 'supervisor'}
        categorias={categorias}
        veiculos={veiculos}
        mecanicos={mecanicos}
      />
    </div>
  )
}
