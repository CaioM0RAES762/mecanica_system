'use client'

import dynamic from 'next/dynamic'

// Dynamic import com ssr:false só funciona dentro de um Client Component.
// Este wrapper existe exclusivamente para que o Server Component dashboard/page.tsx
// possa importar DashboardClient sem acionar o erro de "ssr:false in Server Component".
// Recharts (~280KB) e todo o código de dashboard ficam em um chunk separado e só
// são baixados quando o usuário navega até /dashboard.
const DashboardClientLazy = dynamic(
  () => import('./DashboardClient').then(m => ({ default: m.DashboardClient })),
  { ssr: false },
)

interface Props {
  token: string
}

export function DashboardClientWrapper({ token }: Props) {
  return <DashboardClientLazy token={token} />
}
