import { AcaoAuditoria, PerfilUsuario, type PrioridadeOS } from '@metalsider/shared'
import type { CriarOSDTO, AtualizarOSDTO, FecharOSDTO, FiltroOSDTO } from '@metalsider/shared'
import {
  findManyOS,
  findOSById,
  createOS,
  updateOS,
  updateOSStatus,
  createFechamento,
  criarAuditoria,
  findAuditoriaByOS,
  type AtualizarOSData,
} from '../repositories/ordens-servico.repository.js'
import type { JwtPayload } from '../middlewares/authenticate.js'

// ---- Cálculo de SLA ----

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000)
}

// Adiciona dias úteis (segunda a sexta) à data base
function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date)
  let adicionados = 0
  while (adicionados < days) {
    result.setDate(result.getDate() + 1)
    const dow = result.getDay()
    if (dow !== 0 && dow !== 6) adicionados++
  }
  return result
}

export function calcularPrazo(prioridade: PrioridadeOS, inicio: Date): Date {
  switch (prioridade) {
    case 'critica': return addHours(inicio, 2)
    case 'alta':    return addHours(inicio, 8)
    case 'media':   return addBusinessDays(inicio, 2)
    case 'baixa':   return addBusinessDays(inicio, 5)
  }
}

// ---- Helpers de serialização ----

// Prisma retorna Decimal para horas_trabalhadas; converter para number evita erro de serialização JSON
function normalizarFechamento(
  f: {
    id: number
    resultado: string
    nota_resolucao: string | null
    horas_trabalhadas: { toNumber?: () => number; toString: () => string } | null
    obs_adicionais: string | null
    fechado_em: Date
    fechado_por: { id: string; nome_completo: string }
  } | null,
) {
  if (!f) return null
  return {
    ...f,
    horas_trabalhadas: f.horas_trabalhadas != null
      ? (typeof f.horas_trabalhadas === 'object' && 'toNumber' in f.horas_trabalhadas
          ? (f.horas_trabalhadas as { toNumber: () => number }).toNumber()
          : Number(f.horas_trabalhadas))
      : null,
  }
}

// BigInt em logs_auditoria.id não serializa com JSON.stringify; converter para string
function normalizarAuditoria(
  logs: Array<{
    id: bigint | number
    acao: string
    valores_anteriores: string | null
    novos_valores: string | null
    ocorrido_em: Date
    ator: { id: string; nome_completo: string; email: string }
  }>,
) {
  return logs.map((log) => ({
    ...log,
    id: String(log.id),
  }))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizarOS(os: any, perfil: string): any {
  const resultado = { ...os, fechamento: normalizarFechamento(os.fechamento ?? null) }
  // Remover notas_internas para mecânicos (SDD § 8.5 / CLAUDE.md)
  if (perfil === PerfilUsuario.MECANICO) {
    delete resultado.notas_internas
  }
  return resultado
}

// ---- Serviço principal ----

function httpError(statusCode: number, message: string): Error {
  const err = new Error(message) as Error & { statusCode: number }
  err.statusCode = statusCode
  return err
}

export async function listarOSService(
  params: FiltroOSDTO,
  ator: JwtPayload,
) {
  const { pagina, por_pagina, status, prioridade, categoria_id, mecanico_id, de, ate, busca } = params

  const { dados, total } = await findManyOS({
    pagina,
    por_pagina,
    status,
    prioridade,
    categoria_id,
    mecanico_id,
    de:    de  ? new Date(de)  : undefined,
    ate:   ate ? new Date(ate) : undefined,
    busca,
  })

  const paginas = Math.ceil(total / por_pagina)

  return {
    dados: dados.map((os) => normalizarOS(os, ator.perfil)),
    paginacao: { pagina, por_pagina, total, paginas },
  }
}

export async function buscarOSService(id: number, ator: JwtPayload) {
  const os = await findOSById(id)
  if (!os) throw httpError(404, `OS #${id} não encontrada`)

  return normalizarOS(os, ator.perfil)
}

export async function criarOSService(dto: CriarOSDTO, atorId: string) {
  const inicio = new Date(dto.inicio_previsto)
  const prazo  = calcularPrazo(dto.prioridade, inicio)

  const os = await createOS({
    titulo:          dto.titulo,
    categoria_id:    dto.categoria_id,
    prioridade:      dto.prioridade,
    veiculo_id:      dto.veiculo_id,
    supervisor_id:   atorId,
    mecanico_id:     dto.mecanico_id ?? null,
    descricao:       dto.descricao   ?? null,
    notas_internas:  dto.notas_internas ?? null,
    inicio_previsto: inicio,
    prazo,
  })

  await criarAuditoria({
    ordem_servico_id: os.id,
    ator_id:          atorId,
    acao:             AcaoAuditoria.OS_CRIADA,
    novos_valores:    JSON.stringify({ titulo: os.titulo, prioridade: os.prioridade, status: os.status }),
  })

  return normalizarOS(os, PerfilUsuario.SUPERVISOR)
}

export async function atualizarOSService(
  id: number,
  dto: AtualizarOSDTO,
  ator: JwtPayload,
) {
  const osAtual = await findOSById(id)
  if (!osAtual) throw httpError(404, `OS #${id} não encontrada`)

  if (osAtual.status === 'fechado') {
    throw httpError(422, 'Não é possível editar uma OS já fechada')
  }

  const dados: AtualizarOSData = {}
  if (dto.titulo         !== undefined) dados.titulo          = dto.titulo
  if (dto.categoria_id   !== undefined) dados.categoria_id    = dto.categoria_id
  if (dto.prioridade     !== undefined) dados.prioridade      = dto.prioridade
  if (dto.veiculo_id     !== undefined) dados.veiculo_id      = dto.veiculo_id
  if (dto.descricao      !== undefined) dados.descricao       = dto.descricao ?? null
  if (dto.notas_internas !== undefined) dados.notas_internas  = dto.notas_internas ?? null
  if (dto.mecanico_id    !== undefined) dados.mecanico_id     = dto.mecanico_id ?? null

  // Recalcular prazo se prioridade ou inicio_previsto mudaram
  if (dto.prioridade || dto.inicio_previsto) {
    const novaPrioridade = (dto.prioridade ?? osAtual.prioridade) as PrioridadeOS
    const novoInicio     = new Date(dto.inicio_previsto ?? osAtual.inicio_previsto)
    dados.prazo          = calcularPrazo(novaPrioridade, novoInicio)
    if (dto.inicio_previsto) dados.inicio_previsto = novoInicio
  }

  const houveMudancaMecanico =
    dto.mecanico_id !== undefined && dto.mecanico_id !== osAtual.mecanico?.id

  const osAtualizada = await updateOS(id, dados)

  const acoes: Array<{ acao: string; anteriores?: object; novos?: object }> = [
    {
      acao:      AcaoAuditoria.OS_EDITADA,
      anteriores: { titulo: osAtual.titulo, prioridade: osAtual.prioridade, status: osAtual.status },
      novos:     { ...dados },
    },
  ]

  if (houveMudancaMecanico) {
    acoes.push({
      acao:      AcaoAuditoria.OS_REATRIBUIDA,
      anteriores: { mecanico_id: osAtual.mecanico?.id ?? null },
      novos:     { mecanico_id: dto.mecanico_id ?? null },
    })
  }

  await Promise.all(
    acoes.map((a) =>
      criarAuditoria({
        ordem_servico_id:  id,
        ator_id:           ator.sub,
        acao:              a.acao,
        valores_anteriores: a.anteriores ? JSON.stringify(a.anteriores) : null,
        novos_valores:     a.novos       ? JSON.stringify(a.novos)       : null,
      }),
    ),
  )

  return normalizarOS(osAtualizada, ator.perfil)
}

export async function fecharOSService(
  id: number,
  dto: FecharOSDTO,
  ator: JwtPayload,
) {
  const os = await findOSById(id)
  if (!os) throw httpError(404, `OS #${id} não encontrada`)

  if (os.status === 'fechado') {
    throw httpError(422, 'OS já está fechada')
  }

  // Mecânicos só podem fechar OSs atribuídas a eles (SDD § 8.5 / CLAUDE.md)
  if (
    ator.perfil === PerfilUsuario.MECANICO &&
    os.mecanico?.id !== ator.sub
  ) {
    throw httpError(403, 'Mecânico só pode fechar OS atribuída a si')
  }

  const agora = new Date()
  await updateOSStatus(id, 'fechado', agora)
  await createFechamento({
    ordem_servico_id:  id,
    fechado_por_id:    ator.sub,
    resultado:         dto.resultado,
    nota_resolucao:    dto.nota_resolucao   ?? null,
    horas_trabalhadas: dto.horas_trabalhadas ?? null,
    obs_adicionais:    dto.obs_adicionais   ?? null,
    fechado_em:        agora,
  })

  await criarAuditoria({
    ordem_servico_id:  id,
    ator_id:           ator.sub,
    acao:              AcaoAuditoria.OS_FECHADA,
    valores_anteriores: JSON.stringify({ status: os.status }),
    novos_valores:     JSON.stringify({ status: 'fechado', resultado: dto.resultado }),
  })

  // Retornar OS com estado atualizado
  const osAtualizada = await findOSById(id)
  return normalizarOS(osAtualizada!, ator.perfil)
}

export async function buscarAuditoriaService(id: number) {
  const os = await findOSById(id)
  if (!os) throw httpError(404, `OS #${id} não encontrada`)

  const logs = await findAuditoriaByOS(id)
  return normalizarAuditoria(logs)
}
