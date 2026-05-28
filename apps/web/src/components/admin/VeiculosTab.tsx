'use client'

import { useState, useCallback } from 'react'
import { IconPlus, IconPencil, IconTrash, IconCar } from '@tabler/icons-react'
import { Button, Input, Modal, Badge, EmptyState, Skeleton } from '@/components/ui'
import type { VeiculoResumo } from '@metalsider/shared'
import {
  listarVeiculos,
  criarVeiculo,
  editarVeiculo,
  desativarVeiculo,
  type CriarVeiculoInput,
} from '@/lib/api/admin'
import styles from './VeiculosTab.module.css'

interface VeiculosTabProps {
  token: string
  initialVeiculos: VeiculoResumo[]
}

const VAZIO: CriarVeiculoInput = { placa: '', marca: '', modelo: '', codigo_frota: '' }

export function VeiculosTab({ token, initialVeiculos }: VeiculosTabProps) {
  const [veiculos, setVeiculos] = useState<VeiculoResumo[]>(initialVeiculos)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const [showCriar, setShowCriar] = useState(false)
  const [showEditar, setShowEditar] = useState<VeiculoResumo | null>(null)
  const [showDesativar, setShowDesativar] = useState<VeiculoResumo | null>(null)

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

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    setErroForm(null)
    setSalvando(true)
    try {
      await criarVeiculo(form, token)
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
      await editarVeiculo(showEditar.id, formEditar, token)
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
                <th>Placa</th>
                <th>Marca / Modelo</th>
                <th>Frota</th>
                <th>Status</th>
                <th aria-label="Ações"></th>
              </tr>
            </thead>
            <tbody>
              {veiculos.map((v) => (
                <tr key={v.id} className={!v.ativo ? styles.inativo : ''}>
                  <td><code className={styles.placa}>{v.placa}</code></td>
                  <td>{v.marca} {v.modelo}</td>
                  <td className={styles.frota}>{v.codigo_frota ?? '—'}</td>
                  <td>
                    {v.ativo
                      ? <Badge variant="green">Ativo</Badge>
                      : <Badge variant="red">Inativo</Badge>}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<IconPencil size={14} />}
                        onClick={() => {
                          setFormEditar({ placa: v.placa, marca: v.marca, modelo: v.modelo, codigo_frota: v.codigo_frota ?? '' })
                          setErroForm(null)
                          setShowEditar(v)
                        }}
                        aria-label={`Editar ${v.placa}`}
                      >
                        Editar
                      </Button>
                      {v.ativo && (
                        <Button
                          variant="danger"
                          size="sm"
                          leftIcon={<IconTrash size={14} />}
                          onClick={() => setShowDesativar(v)}
                          aria-label={`Desativar ${v.placa}`}
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
          <Input label="Placa" required value={form.placa} onChange={(e) => setForm((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} placeholder="ABC1D23" maxLength={10} />
          <Input label="Marca" required value={form.marca} onChange={(e) => setForm((p) => ({ ...p, marca: e.target.value }))} placeholder="Volvo" />
          <Input label="Modelo" required value={form.modelo} onChange={(e) => setForm((p) => ({ ...p, modelo: e.target.value }))} placeholder="FH 460" />
          <Input label="Código de frota" value={form.codigo_frota ?? ''} onChange={(e) => setForm((p) => ({ ...p, codigo_frota: e.target.value }))} placeholder="V-001" />
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
          <Input label="Placa" value={formEditar.placa ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, placa: e.target.value.toUpperCase() }))} maxLength={10} />
          <Input label="Marca" value={formEditar.marca ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, marca: e.target.value }))} />
          <Input label="Modelo" value={formEditar.modelo ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, modelo: e.target.value }))} />
          <Input label="Código de frota" value={formEditar.codigo_frota ?? ''} onChange={(e) => setFormEditar((p) => ({ ...p, codigo_frota: e.target.value }))} />
          {erroForm && <p className={styles.erro} role="alert">{erroForm}</p>}
        </form>
      </Modal>

      {/* Modal: Desativar */}
      <Modal
        open={!!showDesativar}
        onClose={() => setShowDesativar(null)}
        title="Desativar veículo"
        description={`Deseja desativar o veículo ${showDesativar?.placa}?`}
        size="sm"
        footer={
          <div className={styles.modalFooter}>
            <Button variant="secondary" onClick={() => setShowDesativar(null)} disabled={salvando}>Cancelar</Button>
            <Button variant="danger" loading={salvando} onClick={handleDesativar}>Desativar</Button>
          </div>
        }
      >
        <p className={styles.alerta}>OSs abertas vinculadas a este veículo não serão afetadas.</p>
      </Modal>
    </div>
  )
}
