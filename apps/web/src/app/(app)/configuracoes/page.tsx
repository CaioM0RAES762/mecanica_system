import type { Metadata } from 'next'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { ConfiguracoesClient } from '@/components/admin/ConfiguracoesClient'
import { listarUsuarios, listarVeiculos, listarCategorias, listarTurnos } from '@/lib/api/admin'

export const metadata: Metadata = {
  title: 'Configurações',
}

export default async function ConfiguracoesPage() {
  const session = await auth()

  if (!session?.user) redirect('/login')

  const perfil = session.user.perfil ?? ''
  if (perfil === 'mecanico') redirect('/chamados')

  const token = session.accessToken ?? ''

  const [usuariosRes, veiculosRes, categoriasRes, turnosRes] = await Promise.all([
    listarUsuarios(token).catch(() => ({ dados: [] })),
    listarVeiculos(token).catch(() => ({ dados: [] })),
    listarCategorias(token).catch(() => ({ dados: [] })),
    listarTurnos(token).catch(() => ({ dados: [] })),
  ])

  return (
    <ConfiguracoesClient
      token={token}
      perfil={perfil}
      initialUsuarios={usuariosRes.dados}
      initialVeiculos={veiculosRes.dados}
      initialCategorias={categoriasRes.dados}
      initialTurnos={turnosRes.dados}
    />
  )
}
