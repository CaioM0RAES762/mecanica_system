'use client'

import { useState } from 'react'
import {
  IconUsers,
  IconCar,
  IconTag,
  IconSettings,
  IconInfoCircle,
} from '@tabler/icons-react'
import { UsuariosTab } from './UsuariosTab'
import { VeiculosTab } from './VeiculosTab'
import { CategoriasTab } from './CategoriasTab'
import type { UsuarioResumo, VeiculoResumo, CategoriaResumo } from '@metalsider/shared'
import styles from './ConfiguracoesClient.module.css'

type TabKey = 'usuarios' | 'veiculos' | 'categorias'

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'usuarios', label: 'Usuários', icon: <IconUsers size={18} /> },
  { key: 'veiculos', label: 'Veículos', icon: <IconCar size={18} /> },
  { key: 'categorias', label: 'Categorias', icon: <IconTag size={18} /> },
]

interface ConfiguracoesClientProps {
  token: string
  perfil: string
  initialUsuarios: UsuarioResumo[]
  initialVeiculos: VeiculoResumo[]
  initialCategorias: CategoriaResumo[]
}

export function ConfiguracoesClient({
  token,
  perfil,
  initialUsuarios,
  initialVeiculos,
  initialCategorias,
}: ConfiguracoesClientProps) {
  const [tab, setTab] = useState<TabKey>('usuarios')

  const isAdmin = perfil === 'admin'

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <IconSettings size={24} className={styles.headerIcon} aria-hidden="true" />
        <h1 className={styles.title}>Configurações</h1>
      </div>

      {!isAdmin && (
        <div className={styles.aviso} role="note">
          <IconInfoCircle size={16} className={styles.avisoIcon} aria-hidden="true" />
          <span>Você tem acesso de leitura. Apenas administradores podem criar ou editar itens.</span>
        </div>
      )}

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Seções de configuração">
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.navBtn} ${tab === t.key ? styles.active : ''}`}
              onClick={() => setTab(t.key)}
              aria-current={tab === t.key ? 'page' : undefined}
              type="button"
            >
              <span className={styles.navIcon} aria-hidden="true">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          {tab === 'usuarios' && (
            <UsuariosTab token={token} initialUsuarios={initialUsuarios} />
          )}
          {tab === 'veiculos' && (
            <VeiculosTab token={token} initialVeiculos={initialVeiculos} />
          )}
          {tab === 'categorias' && (
            <CategoriasTab token={token} initialCategorias={initialCategorias} />
          )}
        </div>
      </div>
    </div>
  )
}
