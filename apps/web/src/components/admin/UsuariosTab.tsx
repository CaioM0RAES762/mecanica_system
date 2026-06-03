'use client'

import { useState, useCallback } from 'react'
import { IconPlus, IconPencil, IconUser, IconTrash, IconInfoCircle } from '@tabler/icons-react'
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
  atualizarUsuario,
  desativarUsuario,
  excluirUsuario,
  type CriarUsuarioInput,
  type AtualizarUsuarioInput,
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

const DOMAIN = '@metalsider.com.br'

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
  const [showExcluir, setShowExcluir] = useState<UsuarioResumo | null>(null)

  const [formCriar, setFormCriar] = useState<CriarUsuarioInput>({
    email: '',
    nome_completo: '',
    perfil: 'mecanico',
  })
  const [formEditar, setFormEditar] = useState<AtualizarUsuarioInput>({})
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

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

    if (!formCriar.email.endsWith(DOMAIN)) {
      setErroForm(`Apenas e-mails corporativos ${DOMAIN} são permitidos`)
      return
    }

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

  async function handleEditar(e: React.FormEvent) {
    e.preventDefault()
    if (!showEditar) return
    setErroForm(null)
    setSalvando(true)
    try {
      await atualizarUsuario(showEditar.id, formEditar, token)
      setShowEditar(null)
      await recarregar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao editar usuário.'
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

  async function handleExcluir() {
    if (!showExcluir) return
    setSalvando(true)
    try {
      await excluirUsuario(showExcluir.id, token)
      setShowExcluir(null)
      await recarregar()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir usuário.'
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
                        ? (
                          <button
                            type="button"
                            className={`${styles.statusToggle} ${styles.statusAtivo}`}
                            onClick={() => setShowDesativar(u)}
                            title="Clique para desativar"
                            aria-label={`Desativar ${u.nome_completo}`}
                          >
                            <span className={styles.statusDot} aria-hidden="true" />
                            Ativo
                          </button>
                        )
                        : <Badge variant="amber">Aguardando</Badge>
                      : (
                        <span className={`${styles.statusToggle} ${styles.statusInativo}`}>
                          <span className={styles.statusDot} aria-hidden="true" />
                          Inativo
                        </span>
                      )
                    }
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconPencil size={14} />}
                        onClick={() => {
                          setFormEditar({ nome_completo: u.nome_completo, perfil: u.perfil })
                          setErroForm(null)
                          setShowEditar(u)
                        }}
                        aria-label={`Editar ${u.nome_completo}`}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconTrash size={14} />}
                        onClick={() => setShowExcluir(u)}
                        aria-label={`Excluir ${u.nome_completo}`}
                        className={styles.btnExcluir}
                      >
                        Excluir
                      </Button>
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
        description="O usuário poderá acessar o sistema imediatamente com a senha padrão."
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowCriar(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button form="form-criar" type="submit" loading={salvando}>
              Criar usuário
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
            placeholder={`nome${DOMAIN}`}
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
          <div className={styles.senhaInfo}>
            <IconInfoCircle size={16} aria-hidden="true" />
            <span>Senha padrão: <strong>metal@10</strong> — o usuário deverá alterar no primeiro acesso</span>
          </div>
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Editar usuário */}
      <Modal
        open={!!showEditar}
        onClose={() => setShowEditar(null)}
        title="Editar usuário"
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
        <form id="form-editar" onSubmit={handleEditar} className={styles.form}>
          <Input
            label="Nome completo"
            required
            value={formEditar.nome_completo ?? ''}
            onChange={(e) => setFormEditar((p) => ({ ...p, nome_completo: e.target.value }))}
          />
          <Select
            label="Perfil"
            required
            value={formEditar.perfil ?? 'mecanico'}
            onChange={(e) => setFormEditar((p) => ({ ...p, perfil: e.target.value as AtualizarUsuarioInput['perfil'] }))}
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
        description={`Tem certeza que deseja desativar "${showDesativar?.nome_completo}"?`}
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
          O acesso será revogado imediatamente. Esta ação pode ser revertida pelo administrador.
        </p>
      </Modal>

      {/* Modal: Excluir permanentemente */}
      <Modal
        open={!!showExcluir}
        onClose={() => setShowExcluir(null)}
        title="Excluir usuário permanentemente"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowExcluir(null)} disabled={salvando}>
              Cancelar
            </Button>
            <Button variant="danger" loading={salvando} onClick={handleExcluir}>
              Excluir permanentemente
            </Button>
          </div>
        }
      >
        <p className={styles.alertaPerigo}>
          <strong>{showExcluir?.nome_completo}</strong> será removido definitivamente do sistema. Esta ação não pode ser desfeita.
        </p>
        <p className={styles.alerta}>
          Usuários com ordens de serviço, fechamentos ou logs de auditoria vinculados não podem ser excluídos — desative-os em vez disso.
        </p>
      </Modal>
    </div>
  )
}
