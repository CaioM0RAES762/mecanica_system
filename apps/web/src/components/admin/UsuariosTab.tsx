'use client'

import { useState, useCallback } from 'react'
import { IconPlus, IconPencil, IconTrash, IconUser } from '@tabler/icons-react'
import {
  Button,
  Input,
  Select,
  Modal,
  Badge,
  EmptyState,
  Skeleton,
} from '@/components/ui'
import type { UsuarioResumo } from '@metalsider/shared'
import {
  listarUsuarios,
  criarUsuario,
  alterarPerfil,
  desativarUsuario,
  type CriarUsuarioInput,
} from '@/lib/api/admin'
import styles from './UsuariosTab.module.css'

const PERFIL_LABEL: Record<string, string> = {
  admin: 'Admin',
  supervisor: 'Supervisor',
  mecanico: 'Mecânico',
}

const PERFIL_VARIANT: Record<string, 'red' | 'amber' | 'default'> = {
  admin: 'red',
  supervisor: 'amber',
  mecanico: 'default',
}

interface UsuariosTabProps {
  token: string
  initialUsuarios: UsuarioResumo[]
}

export function UsuariosTab({ token, initialUsuarios }: UsuariosTabProps) {
  const [usuarios, setUsuarios] = useState<UsuarioResumo[]>(initialUsuarios)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [showCriar, setShowCriar] = useState(false)
  const [showEditar, setShowEditar] = useState<UsuarioResumo | null>(null)
  const [showDesativar, setShowDesativar] = useState<UsuarioResumo | null>(null)

  const [formCriar, setFormCriar] = useState<CriarUsuarioInput>({
    email: '',
    nome_completo: '',
    perfil: 'mecanico',
  })
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [perfilEditar, setPerfilEditar] = useState('')

  const recarregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarUsuarios(token)
      setUsuarios(res.dados)
    } catch {
      setErro('Erro ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [token])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErroForm(null)
    setSalvando(true)
    try {
      await criarUsuario(formCriar, token)
      setShowCriar(false)
      setFormCriar({ email: '', nome_completo: '', perfil: 'mecanico' })
      await recarregar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao criar usuário.'
      setErroForm(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function handleEditarPerfil(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditar) return
    setErroForm(null)
    setSalvando(true)
    try {
      await alterarPerfil(showEditar.id, perfilEditar, token)
      setShowEditar(null)
      await recarregar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar perfil.'
      setErroForm(msg)
    } finally {
      setSalvando(false)
    }
  }

  async function handleDesativar() {
    if (!showDesativar) return
    setSalvando(true)
    try {
      await desativarUsuario(showDesativar.id, token)
      setShowDesativar(null)
      await recarregar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao desativar usuário.'
      setErro(msg)
    } finally {
      setSalvando(false)
    }
  }

  if (loading && usuarios.length === 0) {
    return <Skeleton height={300} />
  }

  return (
    <div className={styles.tab}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Usuários</h2>
        <Button
          leftIcon={<IconPlus size={16} />}
          onClick={() => { setShowCriar(true); setErroForm(null) }}
        >
          Novo usuário
        </Button>
      </div>

      {erro && <p className={styles.erro} role="alert">{erro}</p>}

      {usuarios.length === 0 ? (
        <EmptyState
          icon={<IconUser size={32} />}
          title="Nenhum usuário cadastrado"
          description="Clique em Novo usuário para começar."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className={!u.ativo ? styles.inativo : ''}>
                  <td>{u.nome_completo}</td>
                  <td className={styles.email}>{u.email}</td>
                  <td>
                    <Badge variant={PERFIL_VARIANT[u.perfil] ?? 'default'}>
                      {PERFIL_LABEL[u.perfil] ?? u.perfil}
                    </Badge>
                  </td>
                  <td>
                    {u.ativo
                      ? u.verificado
                        ? <Badge variant="green">Ativo</Badge>
                        : <Badge variant="amber">Aguardando ativação</Badge>
                      : <Badge variant="red">Inativo</Badge>
                    }
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconPencil size={14} />}
                        onClick={() => {
                          setPerfilEditar(u.perfil)
                          setErroForm(null)
                          setShowEditar(u)
                        }}
                        aria-label={`Editar perfil de ${u.nome_completo}`}
                      >
                        Perfil
                      </Button>
                      {u.ativo && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<IconTrash size={14} />}
                          onClick={() => setShowDesativar(u)}
                          aria-label={`Desativar ${u.nome_completo}`}
                        >
                          Desativar
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Criar usuário */}
      <Modal
        open={showCriar}
        onClose={() => setShowCriar(false)}
        title="Novo usuário"
        description="Um código de ativação será enviado ao e-mail informado."
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowCriar(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button form="form-criar" type="submit" loading={salvando}>
              Criar e enviar código
            </Button>
          </div>
        }
      >
        <form id="form-criar" onSubmit={handleCriar} className={styles.form}>
          <Input
            label="Nome completo"
            required
            value={formCriar.nome_completo}
            onChange={(e) => setFormCriar((p) => ({ ...p, nome_completo: e.target.value }))}
            placeholder="João da Silva"
          />
          <Input
            label="E-mail corporativo"
            type="email"
            required
            value={formCriar.email}
            onChange={(e) => setFormCriar((p) => ({ ...p, email: e.target.value }))}
            placeholder="nome@metalsider.com.br"
          />
          <Select
            label="Perfil"
            required
            value={formCriar.perfil}
            onChange={(e) => setFormCriar((p) => ({ ...p, perfil: e.target.value as CriarUsuarioInput['perfil'] }))}
            options={[
              { value: 'mecanico', label: 'Mecânico' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Editar perfil */}
      <Modal
        open={!!showEditar}
        onClose={() => setShowEditar(null)}
        title="Alterar perfil"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowEditar(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button form="form-editar" type="submit" loading={salvando}>
              Salvar
            </Button>
          </div>
        }
      >
        <form id="form-editar" onSubmit={handleEditarPerfil} className={styles.form}>
          <p className={styles.editarNome}>{showEditar?.nome_completo}</p>
          <Select
            label="Perfil"
            required
            value={perfilEditar}
            onChange={(e) => setPerfilEditar(e.target.value)}
            options={[
              { value: 'mecanico', label: 'Mecânico' },
              { value: 'supervisor', label: 'Supervisor' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Desativar */}
      <Modal
        open={!!showDesativar}
        onClose={() => setShowDesativar(null)}
        title="Desativar usuário"
        description={`Tem certeza que deseja desativar "${showDesativar?.nome_completo}"? O acesso será revogado imediatamente.`}
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowDesativar(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="danger" loading={salvando} onClick={handleDesativar}>
              Desativar
            </Button>
          </div>
        }
      >
        <p className={styles.alerta}>
          O usuário não conseguirá mais fazer login. Esta ação pode ser revertida pelo administrador.
        </p>
      </Modal>
    </div>
  )
}
