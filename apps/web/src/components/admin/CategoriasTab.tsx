'use client'

import { useState, useCallback } from 'react'
import { IconPlus, IconPencil, IconTag, IconTrash } from '@tabler/icons-react'
import { Button, Input, Modal, EmptyState, Skeleton } from '@/components/ui'
import type { CategoriaResumo } from '@metalsider/shared'
import {
  listarCategorias,
  criarCategoria,
  editarCategoria,
  desativarCategoria,
  excluirCategoria,
  type CriarCategoriaInput,
} from '@/lib/api/admin'
import styles from './CategoriasTab.module.css'

interface CategoriasTabProps {
  token: string
  initialCategorias: CategoriaResumo[]
}

const VAZIO: CriarCategoriaInput = { nome: '', cor: '' }

export function CategoriasTab({ token, initialCategorias }: CategoriasTabProps) {
  const [categorias, setCategorias] = useState<CategoriaResumo[]>(initialCategorias)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [showCriar, setShowCriar] = useState(false)
  const [showEditar, setShowEditar] = useState<CategoriaResumo | null>(null)
  const [showDesativar, setShowDesativar] = useState<CategoriaResumo | null>(null)
  const [showExcluir, setShowExcluir] = useState<CategoriaResumo | null>(null)

  const [form, setForm] = useState<CriarCategoriaInput>(VAZIO)
  const [formEditar, setFormEditar] = useState<Partial<CriarCategoriaInput>>({})
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const recarregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarCategorias(token, { ativo: undefined })
      setCategorias(res.dados)
    } catch {
      setErro('Erro ao carregar categorias.')
    } finally {
      setLoading(false)
    }
  }, [token])

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErroForm(null)
    setSalvando(true)
    try {
      await criarCategoria({ nome: form.nome, cor: form.cor || null }, token)
      setShowCriar(false)
      setForm(VAZIO)
      await recarregar()
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao criar categoria.')
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
      await editarCategoria(showEditar.id, formEditar, token)
      setShowEditar(null)
      await recarregar()
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao editar categoria.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDesativar() {
    if (!showDesativar) return
    setSalvando(true)
    try {
      await desativarCategoria(showDesativar.id, token)
      setShowDesativar(null)
      await recarregar()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao desativar categoria.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    if (!showExcluir) return
    setSalvando(true)
    try {
      await excluirCategoria(showExcluir.id, token)
      setShowExcluir(null)
      await recarregar()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir categoria.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading && categorias.length === 0) return <Skeleton height={300} />

  return (
    <div className={styles.tab}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Categorias</h2>
        <Button
          leftIcon={<IconPlus size={16} />}
          onClick={() => { setShowCriar(true); setErroForm(null); setForm(VAZIO) }}
        >
          Nova categoria
        </Button>
      </div>

      {erro && <p className={styles.erro} role="alert">{erro}</p>}

      {categorias.length === 0 ? (
        <EmptyState
          icon={<IconTag size={32} />}
          title="Nenhuma categoria cadastrada"
          description="Clique em Nova categoria para começar."
        />
      ) : (
        <div className={styles.grid}>
          {categorias.map((c) => (
            <div key={c.id} className={`${styles.card} ${!c.ativo ? styles.inativo : ''}`}>
              <div className={styles.cardLeft}>
                <span
                  className={styles.dot}
                  style={{ background: c.cor ?? 'var(--color-text-muted)' }}
                  aria-hidden="true"
                />
                <span className={styles.nome}>{c.nome}</span>
              </div>
              <div className={styles.cardRight}>
                {c.ativo
                  ? (
                    <button
                      type="button"
                      className={`${styles.statusToggle} ${styles.statusAtivo}`}
                      onClick={() => setShowDesativar(c)}
                      title="Clique para desativar"
                      aria-label={`Desativar ${c.nome}`}
                    >
                      <span className={styles.statusDot} aria-hidden="true" />
                      Ativa
                    </button>
                  )
                  : (
                    <span className={`${styles.statusToggle} ${styles.statusInativo}`}>
                      <span className={styles.statusDot} aria-hidden="true" />
                      Inativa
                    </span>
                  )
                }
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconPencil size={14} />}
                  onClick={() => {
                    setFormEditar({ nome: c.nome, cor: c.cor ?? '' })
                    setErroForm(null)
                    setShowEditar(c)
                  }}
                  aria-label={`Editar ${c.nome}`}
                >
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<IconTrash size={14} />}
                  onClick={() => setShowExcluir(c)}
                  aria-label={`Excluir ${c.nome}`}
                  className={styles.btnExcluir}
                >
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Criar */}
      <Modal
        open={showCriar}
        onClose={() => setShowCriar(false)}
        title="Nova categoria"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowCriar(false)} disabled={salvando}>Cancelar</Button>
            <Button form="form-c-criar" type="submit" loading={salvando}>Criar</Button>
          </div>
        }
      >
        <form id="form-c-criar" onSubmit={handleCriar} className={styles.form}>
          <Input
            label="Nome"
            required
            value={form.nome}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: Hidráulica"
          />
          <div className={styles.colorField}>
            <label className={styles.colorLabel}>Cor</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                value={form.cor || '#1D6FE8'}
                onChange={(e) => setForm((p) => ({ ...p, cor: e.target.value }))}
                className={styles.colorInput}
                aria-label="Escolher cor"
              />
              <span className={styles.colorHex}>{form.cor || '#1D6FE8'}</span>
            </div>
          </div>
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Editar */}
      <Modal
        open={!!showEditar}
        onClose={() => setShowEditar(null)}
        title="Editar categoria"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowEditar(null)} disabled={salvando}>Cancelar</Button>
            <Button form="form-c-editar" type="submit" loading={salvando}>Salvar</Button>
          </div>
        }
      >
        <form id="form-c-editar" onSubmit={handleEditar} className={styles.form}>
          <Input
            label="Nome"
            value={formEditar.nome ?? ''}
            onChange={(e) => setFormEditar((p) => ({ ...p, nome: e.target.value }))}
          />
          <div className={styles.colorField}>
            <label className={styles.colorLabel}>Cor</label>
            <div className={styles.colorRow}>
              <input
                type="color"
                value={formEditar.cor || '#1D6FE8'}
                onChange={(e) => setFormEditar((p) => ({ ...p, cor: e.target.value }))}
                className={styles.colorInput}
                aria-label="Escolher cor"
              />
              <span className={styles.colorHex}>{formEditar.cor || '#1D6FE8'}</span>
            </div>
          </div>
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Desativar */}
      <Modal
        open={!!showDesativar}
        onClose={() => setShowDesativar(null)}
        title="Desativar categoria"
        description={`Deseja desativar "${showDesativar?.nome}"?`}
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowDesativar(null)} disabled={salvando}>Cancelar</Button>
            <Button variant="danger" loading={salvando} onClick={handleDesativar}>Desativar</Button>
          </div>
        }
      >
        <p className={styles.alerta}>A categoria não aparecerá em novos chamados. OSs existentes não serão afetadas.</p>
      </Modal>

      {/* Modal: Excluir permanentemente */}
      <Modal
        open={!!showExcluir}
        onClose={() => setShowExcluir(null)}
        title="Excluir categoria permanentemente"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowExcluir(null)} disabled={salvando}>Cancelar</Button>
            <Button variant="danger" loading={salvando} onClick={handleExcluir}>Excluir permanentemente</Button>
          </div>
        }
      >
        <p className={styles.alertaPerigo}>
          <strong>{showExcluir?.nome}</strong> será removida definitivamente. Esta ação não pode ser desfeita.
        </p>
        <p className={styles.alerta}>
          Categorias com ordens de serviço vinculadas não podem ser excluídas — desative-as em vez disso.
        </p>
      </Modal>
    </div>
  )
}
