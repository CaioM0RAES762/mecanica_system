'use client'

import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { z } from 'zod'
import { CriarOSSchema, PRIORIDADE_LABEL } from '@metalsider/shared'
import type { CategoriaResumo, VeiculoResumo, UsuarioResumo } from '@metalsider/shared'
import {
  IconEye,
  IconTruck,
  IconSearch,
  IconCalendar,
  IconFlag,
  IconUser,
  IconClock,
  IconInfoCircle,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { Button } from '@/components/ui'
import { criarOS } from '@/lib/api/ordens-servico'
import { uploadAnexo } from '@/lib/api/anexos'
import { UploadAnexos } from './UploadAnexos'
import styles from './NovoChamadoForm.module.css'

// ---- Date helpers ----
function addBusinessDays(d: Date, days: number): Date {
  const r = new Date(d)
  let added = 0
  while (added < days) {
    r.setDate(r.getDate() + 1)
    const dow = r.getDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return r
}

function computeDeadlineDate(startDate: string, duration: number, unit: 'hours' | 'days'): Date | null {
  if (!startDate) return null
  const start = new Date(startDate + 'T08:00:00')
  if (isNaN(start.getTime())) return null
  if (unit === 'hours') return new Date(start.getTime() + duration * 3600000)
  return addBusinessDays(start, duration)
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0] ?? ''
}

function formatDatePt(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ---- Avatar helpers ----
const AVATAR_COLORS = ['#1D6FE8', '#E8A020', '#1D9E75', '#7C5CFC', '#E24B4A', '#0AA89D', '#D95C9A', '#3C7CE0']
function avatarBg(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length] ?? '#1D6FE8'
}
function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}

// ---- Priority style maps ----
const PRIO_TOGGLE_ACTIVE: Record<string, React.CSSProperties> = {
  baixa:   { background: 'var(--color-green-50)',  borderColor: 'var(--color-green-500)',  color: 'var(--color-green-500)' },
  media:   { background: 'var(--color-amber-50)',  borderColor: 'var(--color-amber-500)',  color: '#b87b15' },
  alta:    { background: 'var(--color-red-50)',    borderColor: 'var(--color-red-500)',    color: 'var(--color-red-500)' },
  critica: { background: 'var(--color-gray-900)',  borderColor: 'var(--color-gray-900)',   color: 'white' },
}

const PRIO_DOT_COLOR: Record<string, string> = {
  baixa:   'var(--color-green-500)',
  media:   'var(--color-amber-500)',
  alta:    'var(--color-red-500)',
  critica: 'white',
}

const PRIO_BADGE_STYLE: Record<string, React.CSSProperties> = {
  baixa:   { background: 'var(--color-green-50)',  color: 'var(--color-green-500)',  border: 'none' },
  media:   { background: 'var(--color-amber-50)',  color: 'var(--color-amber-500)',  border: 'none' },
  alta:    { background: 'var(--color-red-50)',    color: 'var(--color-red-500)',    border: 'none' },
  critica: { background: 'var(--color-gray-900)',  color: 'white',                   border: 'none' },
}

const PRIORIDADES: { key: string; label: string }[] = [
  { key: 'baixa',   label: 'Baixa' },
  { key: 'media',   label: 'Média' },
  { key: 'alta',    label: 'Alta' },
  { key: 'critica', label: 'Crítica' },
]

// ---- Estado do formulário ----
interface FormState {
  titulo: string
  categoria_id: string
  prioridade: string
  veiculo_id: string
  mecanico_id: string
  descricao: string
  notas_internas: string
  inicio_previsto: string
}

const FORM_INICIAL: FormState = {
  titulo: '',
  categoria_id: '',
  prioridade: 'media',
  veiculo_id: '',
  mecanico_id: '',
  descricao: '',
  notas_internas: '',
  inicio_previsto: new Date().toISOString().split('T')[0] ?? '',
}

type FormAction = { type: 'set'; field: keyof FormState; value: string } | { type: 'reset' }

function formReducer(state: FormState, action: FormAction): FormState {
  if (action.type === 'reset') return FORM_INICIAL
  return { ...state, [action.field]: action.value }
}

// ---- Props ----
interface NovoChamadoFormProps {
  accessToken: string
  perfil: string
  userName: string
  categorias: CategoriaResumo[]
  veiculos: VeiculoResumo[]
  mecanicos: UsuarioResumo[]
}

// ---- Componente ----
export function NovoChamadoForm({
  accessToken,
  perfil,
  userName,
  categorias,
  veiculos,
  mecanicos,
}: NovoChamadoFormProps) {
  const router = useRouter()
  const [form, dispatch] = useReducer(formReducer, FORM_INICIAL)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [globalErro, setGlobalErro] = useState<string | null>(null)
  const pendingFilesRef = useRef<File[]>([])

  // UI-only scheduling fields
  const [duration, setDuration] = useState(4)
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours')
  const [deadline, setDeadline] = useState('')
  const [deadlineOverridden, setDeadlineOverridden] = useState(false)

  // Auto-compute deadline from startDate + duration
  useEffect(() => {
    if (deadlineOverridden) return
    const d = computeDeadlineDate(form.inicio_previsto, duration, durationUnit)
    setDeadline(d ? toInputDate(d) : '')
  }, [form.inicio_previsto, duration, durationUnit, deadlineOverridden])

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      dispatch({ type: 'set', field, value: e.target.value })
      if (erros[field]) setErros(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  function setPrioridade(p: string) {
    dispatch({ type: 'set', field: 'prioridade', value: p })
    if (erros['prioridade']) setErros(prev => { const n = { ...prev }; delete n['prioridade']; return n })
  }

  const categoriaSelecionada = categorias.find(c => String(c.id) === form.categoria_id)
  const veiculoSelecionado = veiculos.find(v => String(v.id) === form.veiculo_id)
  const mecanicoSelecionado = mecanicos.find(m => m.id === form.mecanico_id)

  const deadlineFormatted = useMemo(() => {
    if (!deadline) return null
    const d = new Date(deadline + 'T00:00:00')
    if (isNaN(d.getTime())) return null
    return formatDatePt(d)
  }, [deadline])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setGlobalErro(null)
    setErros({})

    const payload = {
      titulo: form.titulo,
      categoria_id: Number(form.categoria_id),
      prioridade: form.prioridade as z.infer<typeof CriarOSSchema>['prioridade'],
      veiculo_id: Number(form.veiculo_id),
      mecanico_id: form.mecanico_id || undefined,
      descricao: form.descricao || undefined,
      notas_internas:
        perfil !== 'mecanico' && form.notas_internas ? form.notas_internas : undefined,
      inicio_previsto: form.inicio_previsto,
    }

    const parsed = CriarOSSchema.safeParse(payload)
    if (!parsed.success) {
      const errsMap: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as string
        if (!errsMap[path]) errsMap[path] = issue.message
      }
      setErros(errsMap)
      return
    }

    setLoading(true)
    try {
      const criado = await criarOS(parsed.data, accessToken)
      const files = pendingFilesRef.current
      if (files.length > 0) {
        await Promise.allSettled(files.map((f) => uploadAnexo(criado.id, f, accessToken)))
      }
      router.push('/chamados')
      router.refresh()
    } catch (err) {
      setGlobalErro(err instanceof Error ? err.message : 'Erro ao criar chamado')
    } finally {
      setLoading(false)
    }
  }

  const podeNotas = perfil === 'supervisor' || perfil === 'admin'

  return (
    <div className={styles.layout}>
      {/* ---- Formulário ---- */}
      <form className={styles.form} onSubmit={handleSubmit} noValidate data-testid="novo-chamado-form">
        {globalErro && (
          <div className={styles.globalErro} role="alert" data-testid="global-erro">
            <IconAlertTriangle size={16} />
            {globalErro}
          </div>
        )}

        {/* Seção 1 · Identificação do Serviço */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>IDENTIFICAÇÃO DO SERVIÇO</h2>
            <p className={styles.sectionSubtitle}>Informações que aparecem no card do chamado.</p>
          </div>

          <div className={styles.fields}>
            {/* Linha 1: Título */}
            <div className={styles.fieldFull}>
              <label className={styles.label}>
                Título do chamado <span className={styles.req}>*</span>
              </label>
              <input
                className={`${styles.input} ${erros['titulo'] ? styles.inputError : ''}`}
                placeholder="Ex.: Vazamento de óleo na caixa de transmissão"
                value={form.titulo}
                onChange={set('titulo')}
                required
                data-testid="input-titulo"
              />
              {erros['titulo'] && <span className={styles.fieldError}>{erros['titulo']}</span>}
            </div>

            {/* Linha 2: Categoria + Prioridade */}
            <div className={styles.fieldHalf}>
              <label className={styles.label}>
                Categoria <span className={styles.req}>*</span>
              </label>
              <select
                className={`${styles.select} ${erros['categoria_id'] ? styles.inputError : ''}`}
                value={form.categoria_id}
                onChange={set('categoria_id')}
                required
                data-testid="select-categoria"
              >
                <option value="">Selecione…</option>
                {categorias.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.nome}</option>
                ))}
              </select>
              {erros['categoria_id'] && <span className={styles.fieldError}>{erros['categoria_id']}</span>}
            </div>

            <div className={styles.fieldHalf}>
              <label className={styles.label}>
                Prioridade <span className={styles.req}>*</span>
              </label>
              <div className={styles.prioSeg}>
                {PRIORIDADES.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.prioOpt} ${form.prioridade === key ? styles.prioActive : ''}`}
                    style={form.prioridade === key ? PRIO_TOGGLE_ACTIVE[key] : undefined}
                    onClick={() => setPrioridade(key)}
                    data-testid={`prio-${key}`}
                  >
                    <span
                      className={styles.prioDot}
                      style={{ background: form.prioridade === key && key === 'critica' ? 'white' : PRIO_DOT_COLOR[key] }}
                    />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Linha 3: Veículo + Mecânico */}
            <div className={styles.fieldHalf}>
              <label className={styles.label}>
                Veículo / Ativo <span className={styles.req}>*</span>
              </label>
              <div className={styles.inputWrap}>
                <IconTruck size={16} className={styles.inputIcon} aria-hidden="true" />
                <select
                  className={`${styles.select} ${styles.selectWithIcon} ${erros['veiculo_id'] ? styles.inputError : ''}`}
                  value={form.veiculo_id}
                  onChange={set('veiculo_id')}
                  required
                  data-testid="select-veiculo"
                >
                  <option value="">Buscar veículo…</option>
                  {veiculos.map(v => (
                    <option key={v.id} value={String(v.id)}>{v.placa} — {v.modelo}</option>
                  ))}
                </select>
              </div>
              {erros['veiculo_id'] && <span className={styles.fieldError}>{erros['veiculo_id']}</span>}
            </div>

            <div className={styles.fieldHalf}>
              <label className={styles.label}>
                Mecânico responsável <span className={styles.req}>*</span>
              </label>
              <div className={styles.inputWrap}>
                <IconSearch size={16} className={styles.inputIcon} aria-hidden="true" />
                <select
                  className={`${styles.select} ${styles.selectWithIcon}`}
                  value={form.mecanico_id}
                  onChange={set('mecanico_id')}
                  data-testid="select-mecanico"
                >
                  <option value="">Atribuir a um mecânico…</option>
                  {mecanicos.map(m => (
                    <option key={m.id} value={m.id}>{m.nome_completo}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Seção 2 · Programação */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>PROGRAMAÇÃO</h2>
            <p className={styles.sectionSubtitle}>Quando o serviço deve iniciar e qual o prazo final.</p>
          </div>

          <div className={styles.fields}>
            {/* Linha 1: Início previsto + Duração */}
            <div className={styles.fieldHalf}>
              <label className={styles.label}>Início previsto</label>
              <div className={styles.inputWrap}>
                <IconCalendar size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  type="date"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.inicio_previsto}
                  onChange={e => {
                    set('inicio_previsto')(e)
                    setDeadlineOverridden(false)
                  }}
                  data-testid="input-inicio"
                />
              </div>
            </div>

            <div className={styles.fieldHalf}>
              <label className={styles.label}>Duração estimada</label>
              <div className={styles.durationRow}>
                <input
                  type="number"
                  className={styles.input}
                  min={1}
                  value={duration}
                  onChange={e => {
                    setDuration(Math.max(1, Number(e.target.value)))
                    setDeadlineOverridden(false)
                  }}
                />
                <div className={styles.unitSeg}>
                  <button
                    type="button"
                    className={durationUnit === 'hours' ? styles.unitActive : styles.unitBtn}
                    onClick={() => { setDurationUnit('hours'); setDeadlineOverridden(false) }}
                  >
                    horas
                  </button>
                  <button
                    type="button"
                    className={durationUnit === 'days' ? styles.unitActive : styles.unitBtn}
                    onClick={() => { setDurationUnit('days'); setDeadlineOverridden(false) }}
                  >
                    dias
                  </button>
                </div>
              </div>
            </div>

            {/* Linha 2: Prazo final */}
            <div className={styles.fieldHalf}>
              <label className={styles.label}>Prazo final</label>
              <div className={styles.inputWrap}>
                <IconFlag size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  type="date"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={deadline}
                  onChange={e => {
                    setDeadline(e.target.value)
                    setDeadlineOverridden(true)
                  }}
                />
              </div>
              <p className={styles.hint}>Calculado automaticamente — você pode ajustar.</p>
            </div>
          </div>
        </div>

        {/* Seção 3 · Descrição & Anexos */}
        <div className={styles.card}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>DESCRIÇÃO & ANEXOS</h2>
            <p className={styles.sectionSubtitle}>Detalhes técnicos e arquivos de apoio (opcional).</p>
          </div>

          <div className={styles.fields}>
            <div className={styles.fieldFull}>
              <textarea
                className={styles.textarea}
                value={form.descricao}
                onChange={set('descricao')}
                placeholder="Sintomas, peças envolvidas, histórico relevante, instruções específicas…"
                rows={5}
                data-testid="textarea-descricao"
              />
            </div>

            <div className={styles.fieldFull}>
              <UploadAnexos
                token={accessToken}
                onAnexosChange={(files) => { pendingFilesRef.current = files }}
              />
            </div>

            {podeNotas && (
              <div className={styles.fieldFull}>
                <label className={styles.label}>
                  Notas internas{' '}
                  <span className={styles.badgeInternal}>Apenas supervisores</span>
                </label>
                <textarea
                  className={styles.textarea}
                  value={form.notas_internas}
                  onChange={set('notas_internas')}
                  placeholder="Observações restritas ao time de supervisão (não visíveis ao mecânico)…"
                  rows={3}
                  data-testid="textarea-notas"
                />
              </div>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className={styles.actions}>
          <Button
            type="button"
            variant="ghost"
            onClick={() => { dispatch({ type: 'reset' }); setDeadlineOverridden(false) }}
            disabled={loading}
          >
            Limpar formulário
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            data-testid="btn-criar"
          >
            Abrir Chamado
          </Button>
        </div>
      </form>

      {/* ---- Painel de pré-visualização ---- */}
      <aside className={styles.preview} aria-label="Pré-visualização do chamado">
        <div className={styles.previewCard} data-testid="preview-card">
          <div className={styles.previewEyebrow}>
            <IconEye size={14} />
            PRÉ-VISUALIZAÇÃO AO VIVO
          </div>

          <div className={styles.previewBody}>
            <div className={styles.previewIdRow}>
              <span className={styles.previewNumber}>#0043</span>
              {form.prioridade && (
                <span className={styles.previewBadge} style={PRIO_BADGE_STYLE[form.prioridade]}>
                  <span
                    className={styles.badgeDot}
                    style={{ background: PRIO_DOT_COLOR[form.prioridade] }}
                  />
                  {PRIORIDADE_LABEL[form.prioridade as keyof typeof PRIORIDADE_LABEL] ?? form.prioridade}
                </span>
              )}
            </div>

            <h3 className={styles.previewTitle}>
              {form.titulo || (
                <span className={styles.previewPlaceholder}>Título do chamado…</span>
              )}
            </h3>

            <div className={styles.previewCatRow}>
              {categoriaSelecionada ? (
                <span
                  className={styles.previewCatBadge}
                  style={categoriaSelecionada.cor
                    ? { background: categoriaSelecionada.cor + '1a', color: categoriaSelecionada.cor }
                    : undefined}
                >
                  {categoriaSelecionada.nome}
                </span>
              ) : (
                <span className={`${styles.previewCatBadge} ${styles.previewCatPlaceholder}`}>
                  Categoria
                </span>
              )}
            </div>

            <div className={styles.previewDivider} />

            <div className={styles.previewMeta}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconTruck size={13} aria-hidden="true" /> Veículo
                </span>
                <span className={styles.metaVal}>
                  {veiculoSelecionado
                    ? veiculoSelecionado.placa
                    : <span className={styles.metaPlaceholder}>—</span>}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconUser size={13} aria-hidden="true" /> Mecânico
                </span>
                <span className={styles.metaVal}>
                  {mecanicoSelecionado ? (
                    <span className={styles.avatarRow}>
                      <span
                        className={styles.avatar}
                        style={{ background: avatarBg(mecanicoSelecionado.nome_completo) }}
                      >
                        {initials(mecanicoSelecionado.nome_completo)}
                      </span>
                      {mecanicoSelecionado.nome_completo.split(' ')[0]}
                    </span>
                  ) : (
                    <span className={styles.metaPlaceholder}>Não atribuído</span>
                  )}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconUser size={13} aria-hidden="true" /> Aberto por
                </span>
                <span className={styles.metaVal}>
                  {userName ? (
                    <span className={styles.avatarRow}>
                      <span className={styles.avatar} style={{ background: avatarBg(userName) }}>
                        {initials(userName)}
                      </span>
                      {userName.split(' ')[0]}
                    </span>
                  ) : '—'}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconClock size={13} aria-hidden="true" /> Duração
                </span>
                <span className={styles.metaVal}>
                  {duration} {durationUnit === 'hours' ? 'horas' : 'dias'}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconFlag size={13} aria-hidden="true" /> Prazo
                </span>
                <span className={styles.metaVal}>
                  {deadlineFormatted ?? <span className={styles.metaPlaceholder}>—</span>}
                </span>
              </div>
            </div>

            <div className={styles.previewDivider} />

            <div className={styles.previewNotice}>
              <IconInfoCircle size={14} className={styles.noticeIcon} />
              <span>O mecânico será notificado assim que o chamado for aberto.</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
