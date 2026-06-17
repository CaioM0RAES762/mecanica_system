import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ChecklistConfigClient } from '@/components/checklists/ChecklistConfigClient'
import { listarCamposPorTemplate } from '@/lib/api/checklists'
import type { TemplateComCampos } from '@/lib/api/checklists'
import styles from './page.module.css'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Pesos de Criticidade | MetalSider',
}

export default async function ChecklistConfigPage() {
  const session = await auth()

  if (!session?.user) redirect('/login')
  if (session.user.perfil !== 'admin') redirect('/checklists')

  const token = session.accessToken ?? ''

  let templates: TemplateComCampos[] = []
  try {
    const res = await listarCamposPorTemplate(token)
    templates = res.dados
  } catch { /* client irá buscar */ }

  return (
    <div className={styles.page}>
      <ChecklistConfigClient token={token} initialTemplates={templates} />
    </div>
  )
}
