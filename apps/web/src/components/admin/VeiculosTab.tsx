'use client'

import { useState, useCallback } from 'react'
import { IconPlus, IconPencil, IconCar, IconTrash } from '@tabler/icons-react'
import { Button, Input, Modal, EmptyState, Skeleton } from '@/components/ui'
import type { VeiculoResumo } from '@metalsider/shared'
import {
  listarVeiculos,
  criarVeiculo,
  editarVeiculo,
  desativarVeiculo,
  excluirVeiculo,
  type CriarVeiculoInput,
} from '@/lib/api/admin'
import styles from './VeiculosTab.module.css'

interface VeiculosTabProps {
  token: string
  initialVeiculos: VeiculoResumo[]
}

const VAZIO: CriarVeiculoInput = { veiculo: '', placa: '', cod_tipo_aplicacao: '', descricao_tipo_aplicacao: '' }

export function VeiculosTab({ token, initialVeiculos }: VeiculosTabProps) {
  const [veiculos, setVeiculos] = useState<VeiculoResumo[]>(initialVeiculos)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [showCriar, setShowCriar] = useState(false)
  const [showEditar, setShowEditar] = useState<VeiculoResumo | null>(null)
  const [showDesativar, setShowDesativar] = useState<VeiculoResumo | null>(null)
  const [showExcluir, setShowExcluir] = useState<VeiculoResumo | null>(null)

  const [form, setForm] = useState<CriarVeiculoInput>(VAZIO)
  const [formEditar, setFormEditar] = useState<Partial<CriarVeiculoInput>>({})
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const recarregar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listarVeiculos(token, { ativo: undefined })
      setVeiculos(res.dados)
    } catch {
      setErro('Erro ao carregar veículos.')
    } finally {
      setLoading(false)
    }
  }, [token])

  function normalizarVeiculo(v: Partial<CriarVeiculoInput>): Partial<CriarVeiculoInput> {
    return {
      ...v,
      placa: v.placa || null,
      cod_tipo_aplicacao: v.cod_tipo_aplicacao || null,
      descricao_tipo_aplicacao: v.descricao_tipo_aplicacao || null,
    }
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErroForm(null)
    setSalvando(true)
    try {
      await criarVeiculo(normalizarVeiculo(form) as CriarVeiculoInput, token)
      setShowCriar(false)
      setForm(VAZIO)
      await recarregar()
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao criar veículo.')
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
      await editarVeiculo(showEditar.id, normalizarVeiculo(formEditar), token)
      setShowEditar(null)
      await recarregar()
    } catch (err: unknown) {
      setErroForm(err instanceof Error ? err.message : 'Erro ao editar veículo.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDesativar() {
    if (!showDesativar) return
    setSalvando(true)
    try {
      await desativarVeiculo(showDesativar.id, token)
      setShowDesativar(null)
      await recarregar()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao desativar veículo.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir() {
    if (!showExcluir) return
    setSalvando(true)
    try {
      await excluirVeiculo(showExcluir.id, token)
      setShowExcluir(null)
      await recarregar()
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir veículo.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading && veiculos.length === 0) return <Skeleton height={300} />

  return (
    <div className={styles.tab}>
      <div className={styles.tabHeader}>
        <h2 className={styles.tabTitle}>Veículos</h2>
        <Button
          leftIcon={<IconPlus size={16} />}
          onClick={() => { setShowCriar(true); setErroForm(null); setForm(VAZIO) }}
        >
          Novo veículo
        </Button>
      </div>

      {erro && <p className={styles.erro} role="alert">{erro}</p>}

      {veiculos.length === 0 ? (
        <EmptyState
          icon={<IconCar size={32} />}
          title="Nenhum veículo cadastrado"
          description="Clique em Novo veículo para começar."
        />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Identificação</th>
                <th>Placa</th>
                <th>Tipo de aplicação</th>
                <th>Descrição</th>
                <th>Status</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v) => (
                <tr key={v.id} className={!v.ativo ? styles.inativo : ''}>
                  <td><strong>{v.veiculo}</strong></td>
                  <td><code className={styles.placa}>{v.placa ?? '—'}</code></td>
                  <td className={styles.frota}>{v.cod_tipo_aplicacao ?? '—'}</td>
                  <td className={styles.descricao}>{v.descricao_tipo_aplicacao ?? '—'}</td>
                  <td>
                    {v.ativo
                      ? (
                        <button
                          type="button"
                          className={`${styles.statusToggle} ${styles.statusAtivo}`}
                          onClick={() => setShowDesativar(v)}
                          title="Clique para desativar"
                          aria-label={`Desativar ${v.veiculo}`}
                        >
                          <span className={styles.statusDot} aria-hidden="true" />
                          Ativo
                        </button>
                      )
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
                          setFormEditar({ veiculo: v.veiculo, placa: v.placa ?? '', cod_tipo_aplicacao: v.cod_tipo_aplicacao ?? '', descricao_tipo_aplicacao: v.descricao_tipo_aplicacao ?? '' })
                          setErroForm(null)
                          setShowEditar(v)
                        }}
                        aria-label={`Editar ${v.veiculo}`}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconTrash size={14} />}
                        onClick={() => setShowExcluir(v)}
                        aria-label={`Excluir ${v.veiculo}`}
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

      {/* Modal: Criar */}
      <Modal
        open={showCriar}
        onClose={() => setShowCriar(false)}
        title="Novo veículo"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowCriar(false)} disabled={salvando}>Cancelar</Button>
            <Button form="form-v-criar" type="submit" loading={salvando}>Cadastrar</Button>
          </div>
        }
      >
        <form id="form-v-criar" onSubmit={handleCriar} className={styles.form}>
          <Input label="Identificação" required value={form.veiculo} onChange={(e) => setForm((p) => ({ ...p, veiculo: e.target.value }))} placeholder="Volvo FH 500" maxLength={100} />
          <Input label="Placa" value={form.placa ?? ''} onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} placeholder="ABC1D23" maxLength={10} />
          <Input label="Cód. tipo de aplicação" value={form.cod_tipo_aplicacao ?? ''} onChange={(e) => setForm((p) => ({ ...p, cod_tipo_aplicacao: e.target.value }))} placeholder="CAMINHAO" maxLength={50} />
          <Input label="Desc. tipo de aplicação" value={form.descricao_tipo_aplicacao ?? ''} onChange={(e) => setForm((p) => ({ ...p, descricao_tipo_aplicacao: e.target.value }))} placeholder="Caminhão pesado" maxLength={200} />
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Editar */}
      <Modal
        open={!!showEditar}
        onClose={() => setShowEditar(null)}
        title="Editar veículo"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowEditar(null)} disabled={salvando}>Cancelar</Button>
            <Button form="form-v-editar" type="submit" loading={salvando}>Salvar</Button>
          </div>
        }
      >
        <form id="form-v-editar" onSubmit={handleEditar} className={styles.form}>
          <Input label="Identificação" value={formEditar.veiculo ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, veiculo: e.target.value }))} maxLength={100} />
          <Input label="Placa" value={formEditar.placa ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} maxLength={10} />
          <Input label="Cód. tipo de aplicação" value={formEditar.cod_tipo_aplicacao ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, cod_tipo_aplicacao: e.target.value }))} maxLength={50} />
          <Input label="Desc. tipo de aplicação" value={formEditar.descricao_tipo_aplicacao ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, descricao_tipo_aplicacao: e.target.value }))} maxLength={200} />
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Desativar */}
      <Modal
        open={!!showDesativar}
        onClose={() => setShowDesativar(null)}
        title="Desativar veículo"
        description={`Deseja desativar "${showDesativar?.veiculo}"?`}
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowDesativar(null)} disabled={salvando}>Cancelar</Button>
            <Button variant="danger" loading={salvando} onClick={handleDesativar}>Desativar</Button>
          </div>
        }
      >
        <p className={styles.alerta}>O veículo não aparecerá em novos chamados. OSs existentes não serão afetadas.</p>
      </Modal>

      {/* Modal: Excluir permanentemente */}
      <Modal
        open={!!showExcluir}
        onClose={() => setShowExcluir(null)}
        title="Excluir veículo permanentemente"
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowExcluir(null)} disabled={salvando}>Cancelar</Button>
            <Button variant="danger" loading={salvando} onClick={handleExcluir}>Excluir permanentemente</Button>
          </div>
        }
      >
        <p className={styles.alertaPerigo}>
          <strong>{showExcluir?.veiculo}</strong> será removido definitivamente. Esta ação não pode ser desfeita.
        </p>
        <p className={styles.alerta}>
          Veículos com ordens de serviço vinculadas não podem ser excluídos — desative-os em vez disso.
        </p>
      </Modal>
    </div>
  )
}
