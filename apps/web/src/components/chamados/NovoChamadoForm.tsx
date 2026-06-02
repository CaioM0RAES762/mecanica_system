'use client'

import { type FormEvent, useEffect, useMemo, useReducer, useRef, useState } from 'react'
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
  IconX,
  IconChevronDown,
  IconRefresh,
} from '@tabler/icons-react'
import { Button } from '@/components/ui'
import { criarOS } from '@/lib/api/ordens-servico'
import { uploadAnexo } from '@/lib/api/anexos'
import { UploadAnexos } from './UploadAnexos'
import styles from './NovoChamadoForm.module.css'

// ---- Date helpers ----
function todayISO(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, '0')
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

function nextMonday(d: Date): Date {
  const r = new Date(d)
  const dow = r.getDay()
  if (dow === 6) r.setDate(r.getDate() + 2)
  else if (dow === 0) r.setDate(r.getDate() + 1)
  return r
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

function computeDeadlineFull(
  startDate: string,
  inicioHora: string,
  inicioMin: string,
  durationH: number,
  durationM: number,
  unit: 'hours' | 'days',
): { date: string; hora: string; min: string } | null {
  if (!startDate) return null
  const hasTime = inicioHora !== ''
  let start: Date
  if (hasTime) {
    const h = clamp(parseInt(inicioHora, 10), 0, 23)
    const m = clamp(parseInt(inicioMin || '0', 10), 0, 59)
    start = new Date(`${startDate}T${pad2(h)}:${pad2(m)}:00`)
  } else {
    start = startDate === todayISO() ? new Date() : new Date(startDate + 'T08:00:00')
  }
  if (isNaN(start.getTime())) return null
  if (unit === 'hours') {
    const totalMs = (durationH * 60 + durationM) * 60000
    const end = new Date(start.getTime() + totalMs)
    return {
      date: toInputDate(end),
      hora: hasTime ? pad2(end.getHours()) : '',
      min: hasTime ? pad2(end.getMinutes()) : '',
    }
  }
  if (durationH < 1) return null
  const end = addBusinessDays(start, durationH)
  return { date: toInputDate(end), hora: '', min: '' }
}

function toInputDate(d: Date): string {
  return d.toISOString().split('T')[0] ?? ''
}

function countBusinessDays(start: Date, end: Date): number {
  let count = 0
  const d = new Date(start)
  while (d < end) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) count++
  }
  return Math.max(1, count)
}

function formatDatePt(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ---- Fuzzy search: ignora maiúsculas, acentos e cedilha ----
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
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

// ---- SearchableSelect ----
interface SearchOption {
  value: string
  label: string
  displayLabel?: string
}

interface SearchableSelectProps {
  options: SearchOption[]
  value: string
  onChange: (val: string) => void
  placeholder: string
  leadingIcon?: React.ReactNode
  hasError?: boolean
  testId?: string
  required?: boolean
}

function SearchableSelect({
  options,
  value,
  onChange,
  placeholder,
  leadingIcon,
  hasError,
  testId,
  required,
}: SearchableSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [activeIdx, setActiveIdx] = useState(-1)

  const selected = options.find(o => o.value === value)

  const filtered = useMemo(() => {
    if (!query) return options
    const q = normalizeStr(query)
    return options.filter(o => normalizeStr(o.label).includes(q))
  }, [options, query])

  useEffect(() => { setActiveIdx(-1) }, [filtered.length])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery(''); setActiveIdx(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleSelect(opt: SearchOption) {
    onChange(opt.value); setQuery(''); setOpen(false); setActiveIdx(-1)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation(); onChange(''); setQuery(''); setActiveIdx(-1); inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) { e.preventDefault(); setOpen(true); return }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); setActiveIdx(-1); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); const opt = filtered[activeIdx]; if (opt) handleSelect(opt) }
  }

  const displayValue = open ? query : (selected?.displayLabel ?? selected?.label ?? '')

  return (
    <div className={styles.comboWrap} ref={containerRef}>
      <select
        data-testid={testId}
        value={value}
        onChange={e => onChange(e.target.value)}
        required={required}
        aria-hidden="true"
        tabIndex={-1}
        className={styles.comboHiddenSelect}
      >
        <option value="" />
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>

      {leadingIcon && <span className={styles.comboLeadIcon} aria-hidden="true">{leadingIcon}</span>}

      <input
        ref={inputRef}
        className={`${styles.comboInput} ${leadingIcon ? styles.comboInputWithIcon : ''} ${hasError ? styles.inputError : ''}`}
        value={displayValue}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(-1) }}
        onFocus={() => { setOpen(true); if (selected) setQuery('') }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-haspopup="listbox"
      />

      {selected ? (
        <button type="button" className={styles.comboClear} onClick={handleClear} tabIndex={-1} aria-label="Limpar seleção">
          <IconX size={14} />
        </button>
      ) : (
        <span className={styles.comboChevron} aria-hidden="true"><IconChevronDown size={14} /></span>
      )}

      {open && (
        <ul className={styles.comboList} role="listbox">
          {filtered.length === 0 ? (
            <li className={styles.comboEmpty}>Nenhum resultado encontrado</li>
          ) : (
            filtered.map((opt, idx) => (
              <li
                key={opt.value}
                className={`${styles.comboItem} ${idx === activeIdx ? styles.comboItemActive : ''} ${opt.value === value ? styles.comboItemSelected : ''}`}
                onMouseDown={() => handleSelect(opt)}
                role="option"
                aria-selected={opt.value === value}
                title={opt.displayLabel ?? opt.label}
              >
                {opt.displayLabel ?? opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

// ---- TimeInput: dois inputs numéricos para hora e minuto ----
interface TimeInputProps {
  hora: string
  min: string
  onChangeHora: (v: string) => void
  onChangeMin: (v: string) => void
}

function TimeInput({ hora, min, onChangeHora, onChangeMin }: TimeInputProps) {
  const horaRef = useRef<HTMLInputElement>(null)
  const minRef = useRef<HTMLInputElement>(null)
  // Quando o auto-advance aciona focus no min, o blur da hora dispara de forma síncrona
  // ANTES do React comprometer o novo estado — este ref evita que o blur leia valor stale.
  const skipHoraBlurRef = useRef(false)

  function handleHoraChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2)

    // Auto-advance: 2 dígitos OU dígito único >= 3 (impossível ter hora 30+)
    if (raw.length === 2 || (raw.length === 1 && parseInt(raw, 10) >= 3)) {
      const n = parseInt(raw, 10)
      const formatted = isNaN(n) ? raw : pad2(clamp(n, 0, 23))
      // Marcar ANTES do focus para que o blur síncrono o encontre
      skipHoraBlurRef.current = true
      onChangeHora(formatted)
      minRef.current?.focus()
      minRef.current?.select()
    } else {
      onChangeHora(raw)
    }
  }

  function handleMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChangeMin(e.target.value.replace(/\D/g, '').slice(0, 2))
  }

  function handleHoraBlur() {
    if (skipHoraBlurRef.current) {
      skipHoraBlurRef.current = false
      return
    }
    if (hora === '') return
    const n = parseInt(hora, 10)
    onChangeHora(isNaN(n) ? '' : pad2(clamp(n, 0, 23)))
  }

  function handleMinBlur() {
    if (min === '') return
    const n = parseInt(min, 10)
    onChangeMin(isNaN(n) ? '' : pad2(clamp(n, 0, 59)))
  }

  function handleHoraKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = hora !== '' ? parseInt(hora, 10) : -1
      onChangeHora(pad2(clamp(cur + 1, 0, 23)))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = hora !== '' ? parseInt(hora, 10) : 24
      onChangeHora(pad2(clamp(cur - 1, 0, 23)))
    }
  }

  function handleMinKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const cur = min !== '' ? parseInt(min, 10) : -5
      onChangeMin(pad2(clamp(Math.floor(cur / 5) * 5 + 5, 0, 55)))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const cur = min !== '' ? parseInt(min, 10) : 60
      onChangeMin(pad2(clamp(Math.ceil(cur / 5) * 5 - 5, 0, 55)))
    }
  }

  function handleHoraPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const txt = e.clipboardData.getData('text')
    const m = txt.match(/^(\d{1,2}):(\d{2})$/)
    if (m) {
      e.preventDefault()
      onChangeHora(pad2(clamp(parseInt(m[1]!, 10), 0, 23)))
      onChangeMin(pad2(clamp(parseInt(m[2]!, 10), 0, 59)))
    }
  }

  return (
    <div className={styles.timeWrap}>
      <input
        ref={horaRef}
        type="text"
        inputMode="numeric"
        className={styles.timeInput}
        value={hora}
        onChange={handleHoraChange}
        onBlur={handleHoraBlur}
        onKeyDown={handleHoraKey}
        onFocus={e => e.target.select()}
        onPaste={handleHoraPaste}
        placeholder="hh"
        aria-label="Hora"
      />
      <span className={styles.timeSep} aria-hidden="true">:</span>
      <input
        ref={minRef}
        type="text"
        inputMode="numeric"
        className={styles.timeInput}
        value={min}
        onChange={handleMinChange}
        onBlur={handleMinBlur}
        onKeyDown={handleMinKey}
        onFocus={e => e.target.select()}
        placeholder="mm"
        aria-label="Minuto"
      />
    </div>
  )
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
  prioridade: 'media',
  veiculo_id: '',
  mecanico_id: '',
  descricao: '',
  notas_internas: '',
  inicio_previsto: todayISO(),
}

type FormAction = { type: 'set'; field: keyof FormState; value: string } | { type: 'reset' }

function formReducer(state: FormState, action: FormAction): FormState {
  if (action.type === 'reset') return { ...FORM_INICIAL, inicio_previsto: todayISO() }
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

// ---- Componente principal ----
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

  const today = todayISO()

  // Campos de agendamento (UI-only, exceto duracao_valor/tipo que vão no payload)
  const [duration, setDuration] = useState(0)
  const [durationMin, setDurationMin] = useState(0)
  const [durationUnit, setDurationUnit] = useState<'hours' | 'days'>('hours')
  const [deadline, setDeadline] = useState(todayISO())
  const [inicioHora, setInicioHora] = useState(() => pad2(new Date().getHours()))
  const [inicioMin, setInicioMin] = useState(() => pad2(new Date().getMinutes()))
  const [prazoHora, setPrazoHora] = useState(() => pad2(new Date().getHours()))
  const [prazoMin, setPrazoMin] = useState(() => pad2(new Date().getMinutes()))
  const [weekendAck, setWeekendAck] = useState('')
  // 'by-duration': prazo calculado a partir da duração
  // 'by-deadline': duração calculada a partir do prazo (padrão inicial)
  const [schedulingMode, setSchedulingMode] = useState<'by-duration' | 'by-deadline'>('by-deadline')

  // Modo by-duration: recalcula C sempre que A ou B mudam
  useEffect(() => {
    if (schedulingMode !== 'by-duration') return
    const result = computeDeadlineFull(
      form.inicio_previsto, inicioHora, inicioMin,
      duration, durationMin, durationUnit,
    )
    if (!result) { setDeadline(''); setPrazoHora(''); setPrazoMin(''); return }
    setDeadline(result.date)
    setPrazoHora(result.hora)
    setPrazoMin(result.min)
  }, [form.inicio_previsto, inicioHora, inicioMin, duration, durationMin, durationUnit, schedulingMode])

  // Modo by-deadline: recalcula B sempre que A ou C mudam (C fica fixo)
  useEffect(() => {
    if (schedulingMode !== 'by-deadline') return
    if (!deadline || !form.inicio_previsto) return

    const sh = inicioHora !== '' ? clamp(parseInt(inicioHora, 10), 0, 23) : null
    const sm = inicioMin !== '' ? clamp(parseInt(inicioMin, 10), 0, 59) : null
    const eh = prazoHora !== '' ? clamp(parseInt(prazoHora, 10), 0, 23) : null
    const em = prazoMin !== '' ? clamp(parseInt(prazoMin, 10), 0, 59) : null

    const start = sh !== null
      ? new Date(`${form.inicio_previsto}T${pad2(sh)}:${pad2(sm ?? 0)}:00`)
      : form.inicio_previsto === today ? new Date() : new Date(form.inicio_previsto + 'T08:00:00')

    const end = eh !== null
      ? new Date(`${deadline}T${pad2(eh)}:${pad2(em ?? 0)}:00`)
      : new Date(deadline + 'T23:59:00')

    if (isNaN(start.getTime()) || isNaN(end.getTime())) return

    if (end <= start) {
      setDuration(0)
      setDurationMin(0)
      return
    }

    if (durationUnit === 'hours') {
      const totalMins = Math.round((end.getTime() - start.getTime()) / 60000)
      const h = Math.floor(totalMins / 60)
      const m = totalMins % 60
      setDuration(Math.max(0, h))
      setDurationMin(Math.round(m / 5) * 5)
    } else {
      setDuration(countBusinessDays(start, end))
      setDurationMin(0)
    }
  }, [form.inicio_previsto, inicioHora, inicioMin, deadline, prazoHora, prazoMin, durationUnit, schedulingMode, today])

  // Conflito: prazo final ≤ início
  const deadlineInvalid = useMemo(() => {
    if (!deadline || !form.inicio_previsto) return false
    const sh = inicioHora !== '' ? clamp(parseInt(inicioHora, 10), 0, 23) : null
    const sm = inicioMin !== '' ? clamp(parseInt(inicioMin, 10), 0, 59) : null
    const start = sh !== null
      ? new Date(`${form.inicio_previsto}T${pad2(sh)}:${pad2(sm ?? 0)}:00`)
      : new Date(form.inicio_previsto + 'T00:00:00')
    const eh = prazoHora !== '' ? clamp(parseInt(prazoHora, 10), 0, 23) : null
    const em = prazoMin !== '' ? clamp(parseInt(prazoMin, 10), 0, 59) : null
    const end = eh !== null
      ? new Date(`${deadline}T${pad2(eh)}:${pad2(em ?? 0)}:00`)
      : new Date(deadline + 'T23:59:00')
    return end <= start
  }, [deadline, form.inicio_previsto, inicioHora, inicioMin, prazoHora, prazoMin])

  // Aviso quando prazo calculado cai em fim de semana (modo horas, by-duration)
  const showWeekendWarning = useMemo(() => {
    if (!deadline || durationUnit !== 'hours' || schedulingMode !== 'by-duration') return false
    const d = new Date(deadline + 'T12:00:00')
    return !isNaN(d.getTime()) && isWeekend(d) && weekendAck !== deadline
  }, [deadline, durationUnit, schedulingMode, weekendAck])

  // Formatação para pré-visualização
  const inicioFormatted = useMemo(() => {
    if (!form.inicio_previsto) return null
    const d = new Date(form.inicio_previsto + 'T12:00:00')
    if (isNaN(d.getTime())) return null
    const dateStr = formatDatePt(d)
    if (inicioHora !== '') {
      const h = clamp(parseInt(inicioHora, 10), 0, 23)
      const m = inicioMin !== '' ? clamp(parseInt(inicioMin, 10), 0, 59) : 0
      return `${dateStr} às ${pad2(h)}:${pad2(m)}`
    }
    return dateStr
  }, [form.inicio_previsto, inicioHora, inicioMin])

  const deadlineFormattedFull = useMemo(() => {
    if (!deadline) return null
    const d = new Date(deadline + 'T12:00:00')
    if (isNaN(d.getTime())) return null
    const dateStr = formatDatePt(d)
    if (prazoHora !== '') {
      const h = clamp(parseInt(prazoHora, 10), 0, 23)
      const m = prazoMin !== '' ? clamp(parseInt(prazoMin, 10), 0, 59) : 0
      return `${dateStr} às ${pad2(h)}:${pad2(m)}`
    }
    return dateStr
  }, [deadline, prazoHora, prazoMin])

  const durationFormatted = useMemo(() => {
    if (durationUnit === 'days') {
      if (duration === 0) return 'Não definida'
      return duration === 1 ? '1 dia útil' : `${duration} dias úteis`
    }
    if (duration === 0 && durationMin === 0) return 'Não definida'
    if (durationMin > 0) return `${duration}h ${durationMin}min`
    return duration === 1 ? '1 hora' : `${duration} horas`
  }, [duration, durationMin, durationUnit])

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

  function setVeiculoId(val: string) {
    dispatch({ type: 'set', field: 'veiculo_id', value: val })
    if (erros['veiculo_id']) setErros(prev => { const n = { ...prev }; delete n['veiculo_id']; return n })
  }

  function setMecanicoId(val: string) {
    dispatch({ type: 'set', field: 'mecanico_id', value: val })
  }

  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const val = isNaN(raw) || raw < 0 ? 0 : raw
    setDuration(val)
    setSchedulingMode('by-duration')
  }

  function handleDurationMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = parseInt(e.target.value, 10)
    const val = isNaN(raw) || raw < 0 ? 0 : Math.min(59, raw)
    setDurationMin(val)
    setSchedulingMode('by-duration')
  }

  function handleUnitChange(unit: 'hours' | 'days') {
    setDurationUnit(unit)
    if (unit === 'days') setDurationMin(0)
    setSchedulingMode('by-duration')
  }

  function handleAdjustToMonday() {
    if (!deadline) return
    const d = new Date(deadline + 'T12:00:00')
    const monday = nextMonday(d)
    const newDate = toInputDate(monday)
    setDeadline(newDate)
    setWeekendAck(newDate)
    setSchedulingMode('by-deadline')
  }

  function handleReset() {
    const now = new Date()
    const h = pad2(now.getHours())
    const m = pad2(now.getMinutes())
    dispatch({ type: 'reset' })
    setSchedulingMode('by-deadline')
    setInicioHora(h)
    setInicioMin(m)
    setPrazoHora(h)
    setPrazoMin(m)
    setDuration(0)
    setDurationMin(0)
    setDeadline(todayISO())
    setWeekendAck('')
  }

  const categoriaSelecionada = categorias.find(c => String(c.id) === form.categoria_id)
  const veiculoSelecionado = veiculos.find(v => String(v.id) === form.veiculo_id)
  const mecanicoSelecionado = mecanicos.find(m => m.id === form.mecanico_id)

  const veiculoOptions: SearchOption[] = veiculos.map(v => {
    const displayParts: string[] = [v.veiculo]
    if (v.cod_tipo_aplicacao) displayParts.push(v.cod_tipo_aplicacao)
    if (v.descricao_tipo_aplicacao) displayParts.push(v.descricao_tipo_aplicacao)
    const searchParts = [v.veiculo, v.placa, v.cod_tipo_aplicacao, v.descricao_tipo_aplicacao]
      .filter((p): p is string => Boolean(p))
    return {
      value: String(v.id),
      label: searchParts.join(' '),
      displayLabel: displayParts.join(' — '),
    }
  })

  const mecanicoOptions: SearchOption[] = mecanicos.map(m => ({
    value: m.id,
    label: m.nome_completo,
  }))

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (deadlineInvalid) return
    setGlobalErro(null)
    setErros({})

    const duracao_valor = (duration === 0 && durationMin === 0)
      ? undefined
      : durationUnit === 'hours' && durationMin > 0
        ? duration + durationMin / 60
        : duration

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
      duracao_valor,
      duracao_tipo: (durationUnit === 'hours' ? 'horas' : 'dias_uteis') as 'horas' | 'dias_uteis',
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
        await Promise.allSettled(files.map(f => uploadAnexo(criado.id, f, accessToken)))
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
              <select
                data-testid="select-prioridade"
                value={form.prioridade}
                onChange={e => setPrioridade(e.target.value)}
                aria-hidden="true"
                tabIndex={-1}
                className={styles.comboHiddenSelect}
              >
                {PRIORIDADES.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
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

            <div className={styles.fieldHalf}>
              <label className={styles.label}>
                Veículo / Ativo <span className={styles.req}>*</span>
              </label>
              <SearchableSelect
                options={veiculoOptions}
                value={form.veiculo_id}
                onChange={setVeiculoId}
                placeholder="Buscar veículo ou placa…"
                leadingIcon={<IconTruck size={16} />}
                hasError={!!erros['veiculo_id']}
                testId="select-veiculo"
                required
              />
              {erros['veiculo_id'] && <span className={styles.fieldError}>{erros['veiculo_id']}</span>}
            </div>

            <div className={styles.fieldHalf}>
              <label className={styles.label}>Mecânico responsável</label>
              <SearchableSelect
                options={mecanicoOptions}
                value={form.mecanico_id}
                onChange={setMecanicoId}
                placeholder="Buscar mecânico…"
                leadingIcon={<IconSearch size={16} />}
                testId="select-mecanico"
              />
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
            {/* Início previsto + horário opcional */}
            <div className={styles.fieldHalf}>
              <label className={styles.label}>Início previsto</label>
              <div className={styles.inputWrap}>
                <IconCalendar size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  type="date"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.inicio_previsto}
                  min={today}
                  onChange={e => dispatch({ type: 'set', field: 'inicio_previsto', value: e.target.value })}
                  data-testid="input-inicio"
                />
              </div>
              <div className={styles.timeFieldRow}>
                <span className={styles.timeLabel}>Horário (opcional)</span>
                <TimeInput
                  hora={inicioHora}
                  min={inicioMin}
                  onChangeHora={setInicioHora}
                  onChangeMin={setInicioMin}
                />
              </div>
            </div>

            {/* Duração estimada */}
            <div className={styles.fieldHalf}>
              <label className={styles.label}>Duração estimada</label>
              <div className={styles.durationRow}>
                <input
                  type="number"
                  className={`${styles.input} ${styles.durationNumInput} ${schedulingMode === 'by-deadline' ? styles.inputOverridden : ''}`}
                  min={0}
                  step={1}
                  value={duration}
                  onChange={handleDurationChange}
                  onBlur={e => {
                    const val = parseInt(e.target.value, 10)
                    if (isNaN(val) || val < 0) setDuration(0)
                  }}
                />
                {durationUnit === 'hours' && (
                  <>
                    <span className={styles.durationSuffix}>h</span>
                    <input
                      type="number"
                      className={`${styles.input} ${styles.durationNumInput} ${schedulingMode === 'by-deadline' ? styles.inputOverridden : ''}`}
                      min={0}
                      max={59}
                      step={5}
                      value={durationMin}
                      onChange={handleDurationMinChange}
                      onBlur={e => {
                        const val = parseInt(e.target.value, 10)
                        setDurationMin(isNaN(val) || val < 0 ? 0 : Math.min(59, val))
                      }}
                    />
                    <span className={styles.durationSuffix}>min</span>
                  </>
                )}
                <div className={`${styles.unitSeg} ${styles.unitSegFlex}`}>
                  <button
                    type="button"
                    className={durationUnit === 'hours' ? styles.unitActive : styles.unitBtn}
                    onClick={() => handleUnitChange('hours')}
                  >
                    horas
                  </button>
                  <button
                    type="button"
                    className={durationUnit === 'days' ? styles.unitActive : styles.unitBtn}
                    onClick={() => handleUnitChange('days')}
                  >
                    dias úteis
                  </button>
                </div>
              </div>
              {schedulingMode === 'by-deadline' && (
                <p className={styles.hintOverride}>Calculado a partir do prazo final — altere para usar a duração.</p>
              )}
            </div>

            {/* Prazo final + horário opcional */}
            <div className={styles.fieldHalf}>
              <div className={styles.prazoHeader}>
                <label className={styles.label}>Prazo final</label>
                {schedulingMode === 'by-deadline' && (
                  <button
                    type="button"
                    className={styles.prazoReset}
                    onClick={() => setSchedulingMode('by-duration')}
                  >
                    <IconRefresh size={12} />
                    Recalcular
                  </button>
                )}
              </div>
              <div className={styles.inputWrap}>
                <IconFlag size={16} className={styles.inputIcon} aria-hidden="true" />
                <input
                  type="date"
                  className={`${styles.input} ${styles.inputWithIcon} ${schedulingMode === 'by-deadline' ? styles.inputOverridden : ''} ${deadlineInvalid ? styles.inputError : ''}`}
                  value={deadline}
                  min={form.inicio_previsto || today}
                  onChange={e => {
                    setDeadline(e.target.value)
                    setPrazoHora(inicioHora)
                    setPrazoMin(inicioMin)
                    setSchedulingMode('by-deadline')
                  }}
                />
              </div>
              <div className={styles.timeFieldRow}>
                <span className={styles.timeLabel}>Horário (opcional)</span>
                <TimeInput
                  hora={prazoHora}
                  min={prazoMin}
                  onChangeHora={v => { setPrazoHora(v); setSchedulingMode('by-deadline') }}
                  onChangeMin={v => { setPrazoMin(v); setSchedulingMode('by-deadline') }}
                />
              </div>
              {deadlineInvalid ? (
                <p className={styles.hintError}>
                  <IconAlertTriangle size={12} />
                  {duration === 0 && durationMin === 0
                    ? 'Defina a duração ou ajuste a data/horário do prazo.'
                    : 'O prazo final não pode ser igual ou anterior ao início.'}
                </p>
              ) : schedulingMode === 'by-deadline' ? (
                <p className={styles.hintOverride}>Prazo ajustado manualmente — duração calculada automaticamente.</p>
              ) : (
                <p className={styles.hint}>Calculado automaticamente — você pode ajustar o prazo ou a duração.</p>
              )}
            </div>

            {/* Aviso de fim de semana */}
            {showWeekendWarning && (
              <div className={`${styles.fieldFull} ${styles.weekendWarn}`}>
                <p className={styles.weekendWarnText}>
                  <IconAlertTriangle size={14} />
                  O prazo calculado cai em um fim de semana.
                </p>
                <div className={styles.weekendWarnBtns}>
                  <button
                    type="button"
                    className={styles.weekendWarnBtn}
                    onClick={() => setWeekendAck(deadline)}
                  >
                    Manter assim
                  </button>
                  <button
                    type="button"
                    className={`${styles.weekendWarnBtn} ${styles.weekendWarnBtnPrimary}`}
                    onClick={handleAdjustToMonday}
                  >
                    Ajustar para segunda-feira
                  </button>
                </div>
              </div>
            )}
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
                onAnexosChange={files => { pendingFilesRef.current = files }}
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
          <Button type="button" variant="ghost" onClick={handleReset} disabled={loading}>
            Limpar formulário
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={deadlineInvalid}
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
                  <span className={styles.badgeDot} style={{ background: PRIO_DOT_COLOR[form.prioridade] }} />
                  {PRIORIDADE_LABEL[form.prioridade as keyof typeof PRIORIDADE_LABEL] ?? form.prioridade}
                </span>
              )}
            </div>

            <h3 className={styles.previewTitle}>
              {form.titulo || <span className={styles.previewPlaceholder}>Preencha o formulário…</span>}
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
                <span className={`${styles.previewCatBadge} ${styles.previewCatPlaceholder}`}>Categoria</span>
              )}
            </div>

            <div className={styles.previewDivider} />

            <div className={styles.previewMeta}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconTruck size={13} aria-hidden="true" /> Veículo
                </span>
                <span className={styles.metaVal}>
                  {veiculoSelecionado ? veiculoSelecionado.placa : <span className={styles.metaPlaceholder}>—</span>}
                </span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconUser size={13} aria-hidden="true" /> Mecânico
                </span>
                <span className={styles.metaVal}>
                  {mecanicoSelecionado ? (
                    <span className={styles.avatarRow}>
                      <span className={styles.avatar} style={{ background: avatarBg(mecanicoSelecionado.nome_completo) }}>
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

              {inicioFormatted && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>
                    <IconCalendar size={13} aria-hidden="true" /> Início previsto
                  </span>
                  <span className={styles.metaVal}>{inicioFormatted}</span>
                </div>
              )}

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconClock size={13} aria-hidden="true" /> Duração
                </span>
                <span className={styles.metaVal}>{durationFormatted}</span>
              </div>

              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>
                  <IconFlag size={13} aria-hidden="true" /> Prazo
                </span>
                <span className={styles.metaVal}>
                  {deadlineFormattedFull ?? <span className={styles.metaPlaceholder}>—</span>}
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
