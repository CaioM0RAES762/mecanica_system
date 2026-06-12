import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { buscarChecklist } from '@/lib/api/checklists'
import { listarCategorias, listarMecanicos } from '@/lib/api/recursos'
import { ChecklistDetalheClient } from '@/components/checklists/ChecklistDetalheClient'
import type { UserPerfil } from '@/components/layout/Sidebar'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `Checklist ${id.slice(0, 8)}… | MetalSider` }
}

export default async function ChecklistDetalhePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string; pagina?: string }>
}) {
  const { id } = await params
  const { tab, pagina } = await searchParams
  const session = await auth()
  const token = session?.accessToken ?? ''
  const perfil = (session?.user?.perfil ?? 'mecanico') as UserPerfil

  const backTab = tab ?? 'NAO_CONFORME'
  const backPagina = pagina && /^\d+$/.test(pagina) ? pagina : '1'
  const backHref = `/checklists?tab=${backTab}&pagina=${backPagina}`

  let checklist
  try {
    checklist = await buscarChecklist(id, token)
  } catch {
    notFound()
  }

  const [categorias, mecanicos] = await Promise.all([
    listarCategorias(token),
    perfil !== 'mecanico' ? listarMecanicos(token) : Promise.resolve([]),
  ])

  return (
    <ChecklistDetalheClient
      checklist={checklist}
      token={token}
      perfil={perfil}
      categorias={categorias}
      mecanicos={mecanicos}
      backHref={backHref}
    />
  )
}
