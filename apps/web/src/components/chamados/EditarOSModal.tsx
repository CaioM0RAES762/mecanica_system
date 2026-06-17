'use client'

import { useEffect, useRef, useState } from 'react'
import type { CategoriaResumo, OrdemServicoDetalhe, OrdemServicoResumo, UsuarioResumo, VeiculoResumo } from '@metalsider/shared'
import { PRIORIDADE_LABEL, PrioridadeOS } from '@metalsider/shared'
import { IconX, IconCheck } from '@tabler/icons-react'
import { listarVeiculos, listarMecanicos } from '@/lib/api/recursos'
import { buscarOS, editarOS } from '@/lib/api/ordens-servico'
import styles from './EditarOSModal.module.css'

interface EditarOSModalProps {
  os: OrdemServicoResumo | null
  categorias: CategoriaResumo[]
  accessToken: string
  onClose: () => void
  onSuccess: (osAtualizada: OrdemServicoDetalhe) => void
}

export function EditarOSModal({ os, categorias, accessToken, onClose, onSuccess }: EditarOSModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Form fields
  const [titulo, setTitulo] = useState('')
  const [prioridade, setPrioridade] = useState('')
  const [categoriaIds, setCategoriaIds] = useState<string[]>([])
  const [veiculoId, setVeiculoId] = useState('')
  const [mecanicoId, setMecanicoId] = useState('')
  const [descricao, setDescricao] = useState('')
  const [notasInternas, setNotasInternas] = useState('')

  // Resources
  const [veiculos, setVeiculos] = useState<VeiculoResumo[]>([])
  const [mecanicos, setMecanicos] = useState<UsuarioResumo[]>([])

  // UI state
  const [loadingDetalhes, setLoadingDetalhes] = useState(false)
  const [loadingRecursos, setLoadingRecursos] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  // Indica se os detalhes completos (descricao/notas_internas) foram carregados com sucesso
  const [detalhesCarregados, setDetalhesCarregados] = useState(false)

  const isOpen = os !== null

  // Controlar dialog nativo
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      if (!dialog.open) dialog.showModal()
    } else {
      if (dialog.open) dialog.close()
    }
  }, [isOpen])

  // Fechar no Escape
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const onCancel = (e: Event) => { e.preventDefault(); onClose() }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  // Carregar detalhes da OS e recursos ao abrir
  useEffect(() => {
    if (!os) {
      setTitulo(''); setPrioridade(''); setCategoriaIds([]); setVeiculoId('')
      setMecanicoId(''); setDescricao(''); setNotasInternas('')
      setVeiculos([]); setMecanicos([])
      setDetalhesCarregados(false)
      setErro('')
      return
    }

    // Buscar detalhes completos (inclui descricao e notas_internas)
    setLoadingDetalhes(true)
    buscarOS(os.id, accessToken)
      .then((detalhe) => {
        setTitulo(detalhe.titulo)
        setPrioridade(detalhe.prioridade)
        setCategoriaIds((detalhe.categoria_ids ?? [detalhe.categoria_id]).map(String))
        setVeiculoId(String(detalhe.veiculo_id))
        setMecanicoId(detalhe.mecanico_id ?? '')
        setDescricao(detalhe.descricao ?? '')
        setNotasInternas(detalhe.notas_internas ?? '')
        setDetalhesCarregados(true)
      })
      .catch(() => {
        // Fallback: usar apenas dados do resumo; não incluir descricao/notas no PATCH
        setTitulo(os.titulo)
        setPrioridade(os.prioridade)
        setCategoriaIds((os.categoria_ids ?? [os.categoria_id]).map(String))
        setVeiculoId(String(os.veiculo_id))
        setMecanicoId(os.mecanico_id ?? '')
        setDetalhesCarregados(false)
      })
      .finally(() => setLoadingDetalhes(false))

    // Carregar veículos e mecânicos em paralelo
    setLoadingRecursos(true)
    Promise.all([
      listarVeiculos(accessToken),
      listarMecanicos(accessToken),
    ])
      .then(([v, m]) => { setVeiculos(v); setMecanicos(m) })
      .catch(() => {})
      .finally(() => setLoadingRecursos(false))
  }, [os, accessToken])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!os) return

    setSaving(true)
    setErro('')
    try {
      const payload: Record<string, unknown> = {}

      if (titulo.trim() !== os.titulo) payload.titulo = titulo.trim()
      if (prioridade !== os.prioridade) payload.prioridade = prioridade
      const osCatIds = (os.categoria_ids ?? [os.categoria_id]).map(String).sort().join(',')
      const newCatIds = [...categoriaIds].sort().join(',')
      if (newCatIds !== osCatIds) payload.categoria_ids = categoriaIds.map(Number)
      if (Number(veiculoId) !== os.veiculo_id) payload.veiculo_id = Number(veiculoId)

      const mecAtual = os.mecanico_id ?? ''
      if (mecanicoId !== mecAtual) payload.mecanico_id = mecanicoId || null

      // Só enviar descricao/notas_internas se os detalhes completos foram carregados com sucesso
      // Isso evita sobrescrever campos com null em caso de falha no buscarOS
      if (detalhesCarregados) {
        payload.descricao = descricao || null
        payload.notas_internas = notasInternas || null
      }

      const osAtualizada = await editarOS(os.id, payload, accessToken)
      onSuccess(osAtualizada)
      onClose()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao salvar alterações')
    } finally {
      setSaving(false)
    }
  }

  const isLoading = loadingDetalhes || loadingRecursos

  return (
    <dialog ref={dialogRef} className={styles.dialog}>
      <div className={styles.sheet}>
        {/* Header */}
        <div className={styles.head}>
          <div className={styles.headMain}>
            <p className={styles.eyebrow}>Editar Chamado</p>
            <p className={styles.title}>
              {os ? `#${os.id} — ${os.titulo}` : ''}
            </p>
          </div>
          <button
            className={styles.closeBtn}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            disabled={saving}
          >
            <IconX size={18} />
          </button>
        </div>

        {isLoading ? (
          <div className={styles.loadingBody}>
            Carregando dados...
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.body}>
              {erro && <p className={styles.globalError}>{erro}</p>}

              {/* Título */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-titulo">
                  Título <span className={styles.required}>*</span>
                </label>
                <input
                  id="edit-titulo"
                  className={styles.input}
                  type="text"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  maxLength={300}
                  required
                  autoFocus
                />
              </div>

              {/* Prioridade + Categoria */}
              <div className={styles.formGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="edit-prioridade">Prioridade</label>
                  <select
                    id="edit-prioridade"
                    className={styles.select}
                    value={prioridade}
                    onChange={e => setPrioridade(e.target.value)}
                  >
                    {Object.values(PrioridadeOS).map(p => (
                      <option key={p} value={p}>{PRIORIDADE_LABEL[p]}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Categoria</label>
                  <div className={styles.multiCatWrap}>
                    {categorias.filter(c => c.ativo).map(c => {
                      const sid = String(c.id)
                      const ativo = categoriaIds.includes(sid)
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.catPill} ${ativo ? styles.catPillActive : ''}`}
                          style={ativo && c.cor ? { background: c.cor + '22', borderColor: c.cor, color: c.cor } : undefined}
                          onClick={() => setCategoriaIds(prev =>
                            prev.includes(sid) ? prev.filter(id => id !== sid) : [...prev, sid]
                          )}
                        >
                          {ativo && <span className={styles.catPillCheck}>✓</span>}
                          {c.nome}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Veículo */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-veiculo">Veículo</label>
                <select
                  id="edit-veiculo"
                  className={styles.select}
                  value={veiculoId}
                  onChange={e => setVeiculoId(e.target.value)}
                >
                  {veiculos.filter(v => v.ativo).map(v => (
                    <option key={v.id} value={v.id}>
                      {v.veiculo}{v.descricao_tipo_aplicacao ? ` — ${v.descricao_tipo_aplicacao}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mecânico */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-mecanico">
                  Mecânico <span className={styles.optional}>(opcional)</span>
                </label>
                <select
                  id="edit-mecanico"
                  className={styles.select}
                  value={mecanicoId}
                  onChange={e => setMecanicoId(e.target.value)}
                >
                  <option value="">Não atribuído</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome_completo}</option>
                  ))}
                </select>
              </div>

              <hr className={styles.sectionDivider} />

              {/* Descrição */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-descricao">
                  Descrição <span className={styles.optional}>(opcional)</span>
                </label>
                <div className={styles.textareaWrap}>
                  <textarea
                    id="edit-descricao"
                    className={styles.textarea}
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    maxLength={10000}
                    rows={3}
                  />
                  {descricao.length > 9000 && (
                    <span className={styles.charCount}>{descricao.length}/10000</span>
                  )}
                </div>
              </div>

              {/* Notas internas */}
              <div className={styles.field}>
                <label className={styles.label} htmlFor="edit-notas">
                  Notas internas <span className={styles.optional}>(visível apenas para supervisores)</span>
                </label>
                <div className={styles.textareaWrap}>
                  <textarea
                    id="edit-notas"
                    className={styles.textarea}
                    value={notasInternas}
                    onChange={e => setNotasInternas(e.target.value)}
                    maxLength={10000}
                    rows={3}
                  />
                  {notasInternas.length > 9000 && (
                    <span className={styles.charCount}>{notasInternas.length}/10000</span>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button
                className={styles.cancelBtn}
                type="button"
                onClick={onClose}
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                className={styles.confirmBtn}
                type="submit"
                disabled={saving || !titulo.trim()}
              >
                <IconCheck size={15} />
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  )
}
