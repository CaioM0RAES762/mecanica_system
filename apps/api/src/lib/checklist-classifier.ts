import type { CobliChecklistField, CobliFieldType } from '../types/cobli.js'

// ─── Normalização de texto ────────────────────────────────────────────────────

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

// ─── Listas de respostas positivas/negativas ──────────────────────────────────

const POSITIVE_TERMS = new Set([
  'ok', 'sim', 'conforme', 'bom', 'boa', 'regular', 'aprovado', 'aprovada',
  'normal', 'funcionando', 'em ordem', 'sem problema', 'sem problemas',
  'adequado', 'adequada',
])

const NEGATIVE_TERMS = new Set([
  'nao ok', 'nok', 'nao', 'nao conforme', 'reprovado', 'reprovada',
  'recusado', 'recusada', 'ruim', 'pessimo', 'pessima', 'com defeito',
  'defeito', 'quebrado', 'quebrada', 'avaria', 'avariado', 'avariada',
  'vazamento', 'irregular', 'inadequado', 'inadequada', 'ausente', 'faltando',
  'vencido', 'vencida', 'danificado', 'danificada', 'problema', 'falha',
])

export function isPositiveAnswer(value: string): boolean {
  const n = normalizeText(value)
  if (POSITIVE_TERMS.has(n)) return true
  // prefix match: "ok - observação" → positivo
  for (const term of POSITIVE_TERMS) {
    if (n.startsWith(term + ' ') || n.startsWith(term + '-')) return true
  }
  return false
}

export function isNegativeAnswer(value: string): boolean {
  const n = normalizeText(value)
  if (NEGATIVE_TERMS.has(n)) return true
  for (const term of NEGATIVE_TERMS) {
    if (n === term || n.startsWith(term + ' ') || n.startsWith(term + '-') || n.includes(term)) return true
  }
  return false
}

// ─── Extração de opções marcadas ──────────────────────────────────────────────

export function extractSelectedOptions(field: CobliChecklistField): string[] {
  const options = field.content?.options ?? []
  return options.filter((o) => o.checked && o.label).map((o) => o.label)
}

// ─── Palavras-chave negativas em títulos de campo (para tipo CHECK/CHECKED) ───

const NEGATIVE_TITLE_TERMS = [
  'defeito', 'problema', 'avaria', 'vazamento', 'irregular', 'quebrado',
  'quebrada', 'falha', 'danificado', 'danificada', 'faltando', 'ausente',
]

const POSITIVE_TITLE_TERMS = [
  'ok', 'conforme', 'em bom estado', 'funcionando', 'bom estado', 'sem problema',
]

function checkTitleIndicatesNonCompliant(title: string): boolean | null {
  const n = normalizeText(title)
  for (const term of NEGATIVE_TITLE_TERMS) {
    if (n.includes(normalizeText(term))) return true
  }
  for (const term of POSITIVE_TITLE_TERMS) {
    if (n.includes(normalizeText(term))) return false
  }
  return null
}

// ─── Pesos padrão por título ──────────────────────────────────────────────────

const WEIGHT_PATTERNS: Array<{ terms: string[]; peso: number }> = [
  { peso: 10, terms: ['freio', 'freios', 'pneu', 'pneus', 'direcao', 'suspensao', 'emergencia', 'airbag', 'cinto', 'vazamento de oleo', 'combustivel'] },
  { peso: 7,  terms: ['motor', 'transmissao', 'embreagem', 'sistema eletrico', 'bateria', 'farol', 'lanterna', 'luz de freio', 'radiador', 'temperatura'] },
  { peso: 4,  terms: ['lataria', 'vidro', 'vidros', 'espelho', 'retrovisor', 'porta', 'parachoque', 'para-choque', 'limpador', 'painel'] },
  { peso: 1,  terms: ['limpeza', 'documento', 'documentacao', 'adesivo', 'visual', 'tapete', 'acabamento', 'organizacao'] },
]

export function getDefaultWeight(fieldTitle: string): number {
  const n = normalizeText(fieldTitle)
  for (const { peso, terms } of WEIGHT_PATTERNS) {
    for (const term of terms) {
      if (n.includes(normalizeText(term))) return peso
    }
  }
  return 1
}

// ─── Interface para regra configurada no banco ───────────────────────────────

export interface ChecklistWeightRule {
  field_title_pattern: string
  peso: number
  ativo: boolean
}

export function getWeightForField(
  fieldTitle: string,
  rules: ChecklistWeightRule[],
  fieldId?: string | null,
): number {
  const activeRules = rules.filter((r) => r.ativo)

  // Priority 1: exact UUID match (when field has a Cobli UUID and admin configured by UUID)
  if (fieldId) {
    const exactById = activeRules.find((r) => r.field_title_pattern === fieldId)
    if (exactById) return exactById.peso
  }

  // Priority 2: exact title match (admin configured by title string)
  const exactByTitle = activeRules.find((r) => r.field_title_pattern === fieldTitle)
  if (exactByTitle) return exactByTitle.peso

  // Priority 3: substring title match (legacy wildcard behavior)
  const n = normalizeText(fieldTitle)
  for (const rule of activeRules) {
    if (n.includes(normalizeText(rule.field_title_pattern))) return rule.peso
  }

  return getDefaultWeight(fieldTitle)
}

// ─── Item de não conformidade resultante ─────────────────────────────────────

export interface NonCompliantItem {
  field_id?: string
  field_title: string
  field_type: string
  valor_respondido: string
  peso_criticidade: number
  photos_urls: string[]
}

// ─── Classificação por tipo de campo ─────────────────────────────────────────

export function isFieldNonCompliant(
  field: CobliChecklistField,
  rules: ChecklistWeightRule[],
): boolean {
  return getNonCompliantItems(field, rules).length > 0
}

export function getNonCompliantItems(
  field: CobliChecklistField,
  rules: ChecklistWeightRule[],
): NonCompliantItem[] {
  if (!field.content) return []

  // Normalizar CHECKED → CHECK defensivamente
  const type: CobliFieldType = (field.type === 'CHECKED' ? 'CHECK' : field.type)
  const peso = getWeightForField(field.title, rules, field.id)
  const photos = field.photos_urls ?? []

  if (type === 'SINGLE_SELECT' || type === 'MULTI_SELECT') {
    const items: NonCompliantItem[] = []
    for (const option of field.content.options ?? []) {
      if (!option.checked) continue
      if (!option.label) continue
      // Detecta "NC" como token isolado (ex: "NC", "NC (Não conforme)") ou termos negativos genéricos
      const isNc = /\bnc\b/i.test(option.label)
      if (isNc || isNegativeAnswer(option.label)) {
        items.push({
          field_id: field.id,
          field_title: field.title,
          field_type: type,
          valor_respondido: option.label,
          peso_criticidade: peso,
          photos_urls: photos,
        })
      }
    }
    return items
  }

  if (type === 'CHECK') {
    if (field.content.checked !== true) return []
    const titleResult = checkTitleIndicatesNonCompliant(field.title)
    // Título claramente negativo e checked=true → não conforme
    if (titleResult === true) {
      return [{
        field_id: field.id,
        field_title: field.title,
        field_type: type,
        valor_respondido: 'Marcado',
        peso_criticidade: peso,
        photos_urls: photos,
      }]
    }
    // Título positivo ou ambíguo → conforme (sem certeza, não gerar falso positivo)
    return []
  }

  if (type === 'TEXT') {
    // Não reprovar automaticamente campos de texto — salvo regra negativa explícita
    const value = field.content.value ?? ''
    if (!value) return []
    if (isNegativeAnswer(value)) {
      return [{
        field_id: field.id,
        field_title: field.title,
        field_type: type,
        valor_respondido: value,
        peso_criticidade: peso,
        photos_urls: photos,
      }]
    }
    return []
  }

  return []
}

// ─── Pontuação e prioridade ───────────────────────────────────────────────────

export type ChecklistPriority = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAIXA' | null

export function calculateChecklistScore(nonCompliantItems: NonCompliantItem[]): number {
  return nonCompliantItems.reduce((sum, item) => sum + item.peso_criticidade, 0)
}

export function calculatePriority(score: number): ChecklistPriority {
  if (score >= 20) return 'CRITICA'
  if (score >= 10) return 'ALTA'
  if (score >= 4)  return 'MEDIA'
  if (score >= 1)  return 'BAIXA'
  return null
}

// ─── Resultado completo da classificação de um checklist ─────────────────────

export interface ClassificationResult {
  status: 'CONFORME' | 'NAO_CONFORME'
  nonCompliantItems: NonCompliantItem[]
  pontuacao: number
  prioridade: ChecklistPriority
}

export function classifyChecklist(
  fields: CobliChecklistField[],
  rules: ChecklistWeightRule[],
): ClassificationResult {
  const nonCompliantItems: NonCompliantItem[] = []

  for (const field of fields) {
    const items = getNonCompliantItems(field, rules)
    nonCompliantItems.push(...items)
  }

  const pontuacao = calculateChecklistScore(nonCompliantItems)
  const prioridade = calculatePriority(pontuacao)
  const status = nonCompliantItems.length > 0 ? 'NAO_CONFORME' : 'CONFORME'

  return { status, nonCompliantItems, pontuacao, prioridade }
}
