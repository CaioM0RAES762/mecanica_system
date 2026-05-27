// Shell autenticado — Sidebar e Topbar implementados na Sprint 5
// Proteção de rota via NextAuth middleware — Sprint 4
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar — Sprint 5 */}
      <header
        style={{
          height: 'var(--topbar-height)',
          backgroundColor: 'var(--color-white)',
          borderBottom: 'var(--border-default)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-6)',
          position: 'sticky',
          top: 0,
          zIndex: 'var(--z-sticky)',
        }}
      >
        <span
          style={{
            fontWeight: 'var(--font-bold)',
            color: 'var(--color-navy-900)',
            fontSize: 'var(--text-lg)',
          }}
        >
          Metalsider
        </span>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar — Sprint 5 */}
        <aside
          style={{
            width: 'var(--sidebar-width)',
            backgroundColor: 'var(--color-navy-900)',
            display: 'none',
          }}
        />

        <main style={{ flex: 1, padding: 'var(--space-6)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
