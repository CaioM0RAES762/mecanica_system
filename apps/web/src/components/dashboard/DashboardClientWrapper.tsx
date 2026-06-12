'use client'

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui'

// Dynamic import com ssr:false só funciona dentro de um Client Component.
// Este wrapper existe exclusivamente para que o Server Component dashboard/page.tsx
// possa importar DashboardClient sem acionar o erro de "ssr:false in Server Component".
// Recharts (~280KB) e todo o código de dashboard ficam em um chunk separado e só
// são baixados quando o usuário navega até /dashboard.
// O loading skeleton evita o CLS (layout shift) causado por renderizar null antes do chunk carregar.
function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        {/* Título real no HTML do servidor → LCP element disponível na primeira pintura */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#323130', margin: 0, lineHeight: 1.2 }}>
            Dashboard de Análise
          </h1>
          <p style={{ fontSize: '0.8125rem', color: '#605e5c', margin: 0 }}>
            Visão consolidada das operações de oficina
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton style={{ height: 32, width: 220 }} />
          <Skeleton style={{ height: 32, width: 90 }} />
          <Skeleton style={{ height: 32, width: 140 }} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 108, borderRadius: 8 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton style={{ height: 300, borderRadius: 8 }} />
        <Skeleton style={{ height: 300, borderRadius: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton style={{ height: 280, borderRadius: 8 }} />
        <Skeleton style={{ height: 280, borderRadius: 8 }} />
      </div>
      <Skeleton style={{ height: 180, borderRadius: 8 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Skeleton style={{ height: 240, borderRadius: 8 }} />
        <Skeleton style={{ height: 240, borderRadius: 8 }} />
      </div>
    </div>
  )
}

const DashboardClientLazy = dynamic(
  () => import('./DashboardClient').then(m => ({ default: m.DashboardClient })),
  { ssr: false, loading: () => <DashboardSkeleton /> },
)

interface Props {
  token: string
}

export function DashboardClientWrapper({ token }: Props) {
  return <DashboardClientLazy token={token} />
}
