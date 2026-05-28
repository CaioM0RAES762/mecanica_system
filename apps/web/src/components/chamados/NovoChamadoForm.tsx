'use client'

import { useMemo, useReducer, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { z } from 'zod'
import { CriarOSSchema, PRIORIDADE_LABEL, PrioridadeOS } from '@metalsider/shared'
import type { CategoriaResumo, VeiculoResumo, UsuarioResumo } from '@metalsider/shared'
import {
  IconClipboardList,
  IconAlertTriangle,
  IconCar,
  IconUser,
  IconCalendar,
} from '@tabler/icons-react'
import { Button, Input, Select } from '@/components/ui'
import { criarOS } from '@/lib/api/ordens-servico'
import styles from './NovoChamadoForm.module.css'

// ---- SLA preview (espelha calcularPrazo do backend) ----
function addHours(d: Date, h: number): Date {
  return new Date(d.getTime() + h * 3600000)
}
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
function calcPrazoPreview(prioridade: string, inicio: Date): Date | null {
  switch (prioridade) {
    case 'critica': return addHours(inicio, 2)
    case 'alta':    return addHours(inicio, 8)
    case 'media':   return addBusinessDays(inicio, 2)
    case 'baixa':   return addBusinessDays(inicio, 5)
    default: return null
  }
}
function formatDateTime(d: Date): string {
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

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
  prioridade: '',
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
  categorias: CategoriaResumo[]
  veiculos: VeiculoResumo[]
  mecanicos: UsuarioResumo[]
}

// ---- Componente ----
export function NovoChamadoForm({
  accessToken,
  perfil,
  categorias,
  veiculos,
  mecanicos,
}: NovoChamadoFormProps) {
  const router = useRouter()
  const [form, dispatch] = useReducer(formReducer, FORM_INICIAL)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [globalErro, setGlobalErro] = useState<string | null>(null)

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      dispatch({ type: 'set', field, value: e.target.value })
      if (erros[field]) setErros(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  // Computed preview
  const prazoPreview = useMemo(() => {
    if (!form.prioridade || !form.inicio_previsto) return null
    const inicio = new Date(form.inicio_previsto + 'T08:00:00')
    if (isNaN(inicio.getTime())) return null
    return calcPrazoPreview(form.prioridade, inicio)
  }, [form.prioridade, form.inicio_previsto])

  const categoriaSelecionada = categorias.find(c => String(c.id) === form.categoria_id)
  const veiculoSelecionado = veiculos.find(v => String(v.id) === form.veiculo_id)
  const mecanicoSelecionado = mecanicos.find(m => m.id === form.mecanico_id)

  async function handleSubmit(e: React.FormEvent) {
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
      router.push(`/chamados`)
      router.refresh()
      void criado
    } catch (err) {
      setGlobalErro(err instanceof Error ? err.message : 'Erro ao criar chamado')
    } finally {
      setLoading(false)
    }
  }

  const categoriaOptions = [
    { value: '', label: 'Selecione a categoria…' },
    ...categorias.map(c => ({ value: String(c.id), label: c.nome })),
  ]
  const prioridadeOptions = [
    { value: '', label: 'Selecione a prioridade…' },
    ...Object.values(PrioridadeOS).map(p => ({ value: p, label: PRIORIDADE_LABEL[p] })),
  ]
  const veiculoOptions = [
    { value: '', label: 'Selecione o veículo…' },
    ...veiculos.map(v => ({ value: String(v.id), label: `${v.placa} — ${v.modelo}` })),
  ]
  const mecanicoOptions = [
    { value: '', label: 'Não atribuído' },
    ...mecanicos.map(m => ({ value: m.id, label: m.nome_completo })),
  ]

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

        {/* Seção 1: Identificação */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <IconClipboardList size={18} aria-hidden="true" />
            Identificação
          </h2>
          <div className={styles.fields}>
            <div className={styles.fieldFull}>
              <Input
                label="Título *"
                placeholder="Descreva o problema em poucas palavras…"
                value={form.titulo}
                onChange={set('titulo')}
                error={erros['titulo']}
                required
                data-testid="input-titulo"
              />
            </div>
            <div className={styles.fieldHalf}>
              <Select
                label="Categoria *"
                value={form.categoria_id}
                onChange={set('categoria_id')}
                options={categoriaOptions}
                error={erros['categoria_id']}
                required
                data-testid="select-categoria"
              />
            </div>
            <div className={styles.fieldHalf}>
              <Select
                label="Prioridade *"
                value={form.prioridade}
                onChange={set('prioridade')}
                options={prioridadeOptions}
                error={erros['prioridade']}
                required
                data-testid="select-prioridade"
              />
            </div>
          </div>
        </section>

        {/* Seção 2: Programação */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <IconCalendar size={18} aria-hidden="true" />
            Programação
          </h2>
          <div className={styles.fields}>
            <div className={styles.fieldHalf}>
              <Select
                label="Veículo *"
                value={form.veiculo_id}
                onChange={set('veiculo_id')}
                options={veiculoOptions}
                error={erros['veiculo_id']}
                required
                data-testid="select-veiculo"
              />
            </div>
            <div className={styles.fieldHalf}>
              <Select
                label="Mecânico responsável"
                value={form.mecanico_id}
                onChange={set('mecanico_id')}
                options={mecanicoOptions}
                hint="Pode ser atribuído depois"
                data-testid="select-mecanico"
              />
            </div>
            <div className={styles.fieldHalf}>
              <Input
                label="Início previsto *"
                type="date"
                value={form.inicio_previsto}
                onChange={set('inicio_previsto')}
                error={erros['inicio_previsto']}
                required
                data-testid="input-inicio"
              />
            </div>
            {prazoPreview && (
              <div className={styles.fieldHalf}>
                <div className={styles.prazoPreview}>
                  <span className={styles.prazoPreviewLabel}>Prazo estimado (SLA)</span>
                  <span className={styles.prazoPreviewValue}>{formatDateTime(prazoPreview)}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Seção 3: Descrição */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            <IconClipboardList size={18} aria-hidden="true" />
            Descrição
          </h2>
          <div className={styles.fields}>
            <div className={styles.fieldFull}>
              <label className={styles.label}>Descrição detalhada</label>
              <textarea
                className={styles.textarea}
                value={form.descricao}
                onChange={set('descricao')}
                placeholder="Descreva o problema, sintomas, histórico…"
                rows={4}
                data-testid="textarea-descricao"
              />
            </div>

            {podeNotas && (
              <div className={styles.fieldFull}>
                <label className={styles.label}>Notas internas (visível apenas para supervisores)</label>
                <textarea
                  className={styles.textarea}
                  value={form.notas_internas}
                  onChange={set('notas_internas')}
                  placeholder="Informações confidenciais, custo estimado, prioridade especial…"
                  rows={3}
                  data-testid="textarea-notas"
                />
              </div>
            )}
          </div>
        </section>

        {/* Seção 4: Anexos (Sprint 8) */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Anexos</h2>
          <div className={styles.uploadPlaceholder} aria-label="Área de upload (Sprint 8)">
            Upload de arquivos disponível na próxima versão.
          </div>
        </section>

        {/* Ações */}
        <div className={styles.actions}>
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
            Criar Chamado
          </Button>
        </div>
      </form>

      {/* ---- Preview ---- */}
      <aside className={styles.preview} aria-label="Pré-visualização do chamado">
        <div className={styles.previewCard} data-testid="preview-card">
          <div className={styles.previewHeader}>Pré-visualização</div>

          <div className={styles.previewBody}>
            {form.prioridade && (
              <span className={[styles.previewBadge, styles[`badgePrioridade_${form.prioridade}`] ?? ''].join(' ')}>
                {PRIORIDADE_LABEL[form.prioridade as keyof typeof PRIORIDADE_LABEL] ?? form.prioridade}
              </span>
            )}
            {categoriaSelecionada && (
              <span
                className={styles.previewBadge}
                style={categoriaSelecionada.cor ? { borderColor: categoriaSelecionada.cor, color: categoriaSelecionada.cor } as React.CSSProperties : undefined}
              >
                {categoriaSelecionada.nome}
              </span>
            )}

            <p className={styles.previewTitulo}>
              {form.titulo || <span className={styles.previewPlaceholder}>Título do chamado</span>}
            </p>

            {veiculoSelecionado && (
              <div className={styles.previewMeta}>
                <IconCar size={13} aria-hidden="true" />
                {veiculoSelecionado.placa} — {veiculoSelecionado.modelo}
              </div>
            )}

            {mecanicoSelecionado && (
              <div className={styles.previewMeta}>
                <IconUser size={13} aria-hidden="true" />
                {mecanicoSelecionado.nome_completo}
              </div>
            )}

            {prazoPreview && (
              <div className={styles.previewMeta}>
                <IconCalendar size={13} aria-hidden="true" />
                Prazo: {formatDateTime(prazoPreview)}
              </div>
            )}

            {!form.titulo && !form.prioridade && !form.veiculo_id && (
              <p className={styles.previewPlaceholder}>Preencha o formulário para ver a pré-visualização.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  )
}
