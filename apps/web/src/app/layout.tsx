import type { Metadata, Viewport } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: {
    template: '%s | Metalsider',
    default: 'Metalsider — Gestão de Ordens de Serviço',
  },
  description: 'Plataforma de gestão de ordens de serviço para equipes de manutenção mecânica industrial.',
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
