import { AcaoAuditoria, PerfilUsuario, type PrioridadeOS } from '@metalsider/shared'
import type { CriarOSDTO, AtualizarOSDTO, FecharOSDTO, FiltroOSDTO } from '@metalsider/shared'
import {
  findManyOS,
  countOS,
  findOSById,
  createOS,
  updateOS,
  deleteOS,
  criarAuditoria,
  findAuditoriaByOS,
  type AtualizarOSData,
} from '../repositories/ordens-servico.repository.js'
import { prisma } from '../lib/prisma.js'
import type { JwtPayload } from '../middlewares/authenticate.js'
import { emailService, type OSEmailData } from '../lib/email.js'
import { invalidarCacheAnalytics } from './analytics.service.js'
import { emitirEventoOS } from '../lib/sse-emitter.js'
import { getStorageAdapter } from '../lib/storage.js'

function buildOSEmailData(os: {
  id: number
  titulo: string
  prioridade: string
  prazo: Date
  veiculo: { placa: string | null; veiculo: string } | null
  categoria: { nome: string } | null
}): OSEmailData {
  const placa = os.veiculo?.placa ? ` (${os.veiculo.placa})` : ''
  return {
    os_id: os.id,
    titulo: os.titulo,
    prioridade: os.prioridade,
    prazo: os.prazo.toISOString(),
    veiculo: os.veiculo ? `${os.veiculo.veiculo}${placa}` : '',
    categoria: os.categoria?.nome ?? '',
  }
}

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

// Se source já inclui horário (T), usa diretamente como hora local.
// Se é só data e é hoje, usa o momento exato; para datas futuras usa 08:00.
function resolveStartDateTime(source: string | Date): Date {
  if (source instanceof Date) return source
  if (source.includes('T')) return new Date(source)
  const todayStr = new Date().toISOString().split('T')[0] ?? ''
  return source === todayStr ? new Date() : new Date(source + 'T08:00:00')
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
    id:                f.id,
    resultado:         f.resultado,
    nota_resolucao:    f.nota_resolucao,
    horas_trabalhadas: f.horas_trabalhadas != null
      ? (typeof f.horas_trabalhadas === 'object' && 'toNumber' in f.horas_trabalhadas
          ? (f.horas_trabalhadas as { toNumber: () => number }).toNumber()
          : Number(f.horas_trabalhadas))
      : null,
    obs_adicionais:   f.obs_adicionais,
    fechado_em:       f.fechado_em,
    fechado_por_id:   f.fechado_por.id,
    fechado_por_nome: f.fechado_por.nome_completo,
  }
}

function normalizarAnexos(
  anexos: Array<{
    id: number
    nome_arquivo: string
    url: string
    tipo: string | null
    tamanho_bytes: number | null
    criado_em: Date
    enviado_por: { id: string; nome_completo: string }
  }>,
) {
  const storage = getStorageAdapter()
  return anexos.map((a) => ({
    id:             a.id,
    nome_arquivo:   a.nome_arquivo,
    url:            storage.publicUrl(a.url),
    tipo:           a.tipo,
    tamanho_bytes:  a.tamanho_bytes,
    enviado_por_id: a.enviado_por.id,
    criado_em:      a.criado_em,
  }))
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
  const resultado = {
    // Campos diretos da tabela ordens_servico
    id:              os.id,
    titulo:          os.titulo,
    prioridade:      os.prioridade,
    status:          os.status,
    descricao:       os.descricao,
    notas_internas:  os.notas_internas,
    inicio_previsto: os.inicio_previsto,
    prazo:           os.prazo,
    fechado_em:      os.fechado_em,
    criado_em:       os.criado_em,
    atualizado_em:   os.atualizado_em,
    // Relações achatadas → campos planos exigidos por OrdemServicoResumo
    categoria_id:    os.categoria?.id   ?? null,
    categoria_nome:  os.categoria?.nome ?? '',
    veiculo_id:                        os.veiculo?.id                        ?? null,
    veiculo_placa:                     os.veiculo?.placa                     ?? null,
    veiculo_nome:                      os.veiculo?.veiculo                   ?? '',
    veiculo_descricao_tipo_aplicacao:  os.veiculo?.descricao_tipo_aplicacao  ?? null,
    supervisor_id:   os.supervisor?.id  ?? '',
    supervisor_nome: os.supervisor?.nome_completo ?? '',
    mecanico_id:     os.mecanico?.id              ?? null,
    mecanico_nome:   os.mecanico?.nome_completo   ?? null,
    // Campos de OrdemServicoDetalhe
    fechamento: normalizarFechamento(os.fechamento ?? null),
    // Incluir anexos apenas quando foi buscado via osSelect() (detalhe); na listagem
    // osListSelect() não traz o campo e os.anexos fica undefined — omitir para que
    // handleSelecionar em HistoricoClient saiba que precisa buscar o detalhe completo.
    ...(os.anexos !== undefined ? { anexos: normalizarAnexos(os.anexos) } : {}),
  }
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

export async function contarOSService(params: FiltroOSDTO) {
  return countOS({
    status:       params.status,
    prioridade:   params.prioridade,
    categoria_id: params.categoria_id,
    mecanico_id:  params.mecanico_id,
    supervisor_id: params.supervisor_id,
    de:  params.de  ? new Date(params.de)  : undefined,
    ate: params.ate ? new Date(params.ate) : undefined,
    busca: params.busca,
  })
}

const PRIORIDADE_NIVEL: Record<string, number> = {
  critica: 0, alta: 1, media: 2, baixa: 3,
}

export async function listarOSService(
  params: FiltroOSDTO,
  ator: JwtPayload,
) {
  const {
    pagina, por_pagina, status, excluir_fechados,
    prioridade, categoria_id, mecanico_id, supervisor_id,
    de, ate, fechado_de, fechado_ate, busca,
    orderBy, order,
  } = params

  // 'prioridade' não tem suporte nativo de ordenação por severity no Prisma/SQL Server;
  // busca sem orderBy específico e aplica sort em memória abaixo.
  const dbOrderBy = orderBy !== 'prioridade' ? orderBy : undefined

  const { dados, total } = await findManyOS({
    pagina,
    por_pagina,
    status,
    excluir_fechados,
    prioridade,
    categoria_id,
    mecanico_id,
    supervisor_id,
    de:          de          ? new Date(de)          : undefined,
    ate:         ate         ? new Date(ate)         : undefined,
    fechado_de:  fechado_de  ? new Date(fechado_de)  : undefined,
    fechado_ate: fechado_ate ? new Date(fechado_ate) : undefined,
    busca,
    orderBy: dbOrderBy,
    order,
  })

  const paginas = Math.ceil(total / por_pagina)

  const lista = dados.map((os) => normalizarOS(os, ator.perfil))

  if (orderBy === 'prioridade') {
    lista.sort(
      (a, b) =>
        (PRIORIDADE_NIVEL[a.prioridade as string] ?? 99) -
        (PRIORIDADE_NIVEL[b.prioridade as string] ?? 99),
    )
  }

  return {
    dados: lista,
    paginacao: { pagina, por_pagina, total, paginas },
  }
}

export async function buscarOSService(id: number, ator: JwtPayload) {
  const os = await findOSById(id)
  if (!os) throw httpError(404, `OS #${id} não encontrada`)

  return normalizarOS(os, ator.perfil)
}

export async function criarOSService(dto: CriarOSDTO, atorId: string) {
  const inicio = resolveStartDateTime(dto.inicio_previsto)
  const prazo = dto.duracao_valor !== undefined && dto.duracao_tipo !== undefined
    ? dto.duracao_tipo === 'horas'
      ? addHours(inicio, dto.duracao_valor)
      : addBusinessDays(inicio, dto.duracao_valor)
    : calcularPrazo(dto.prioridade, inicio)

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

  // Notificar mecânico atribuído (falha silenciosa — D-60)
  if (os.mecanico) {
    try {
      await emailService.enviarOSAtribuida(
        os.mecanico.email,
        os.mecanico.nome_completo,
        buildOSEmailData(os),
      )
    } catch (err) {
      console.error(`[email] Falha ao enviar OS #${os.id} atribuída:`, err)
    }
  }

  void invalidarCacheAnalytics()
  emitirEventoOS({ tipo: 'criado', id: os.id })
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

  // Recalcular prazo se prioridade, inicio_previsto ou duração mudaram
  if (dto.prioridade || dto.inicio_previsto || dto.duracao_valor !== undefined) {
    const novaPrioridade = (dto.prioridade ?? osAtual.prioridade) as PrioridadeOS
    const novoInicio     = resolveStartDateTime(dto.inicio_previsto ?? osAtual.inicio_previsto)
    dados.prazo = dto.duracao_valor !== undefined && dto.duracao_tipo !== undefined
      ? dto.duracao_tipo === 'horas'
        ? addHours(novoInicio, dto.duracao_valor)
        : addBusinessDays(novoInicio, dto.duracao_valor)
      : calcularPrazo(novaPrioridade, novoInicio)
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

  // Notificar novo mecânico ao reatribuir (falha silenciosa — D-60)
  if (houveMudancaMecanico && dto.mecanico_id && osAtualizada.mecanico) {
    try {
      await emailService.enviarOSAtribuida(
        osAtualizada.mecanico.email,
        osAtualizada.mecanico.nome_completo,
        buildOSEmailData(osAtualizada),
      )
    } catch (err) {
      console.error(`[email] Falha ao enviar reatribuição OS #${id}:`, err)
    }
  }

  void invalidarCacheAnalytics()
  emitirEventoOS({ tipo: 'atualizado', id })
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

  // Atribuir mecânico se não havia um e foi informado no fechamento
  if (dto.mecanico_id && !os.mecanico) {
    await updateOS(id, { mecanico_id: dto.mecanico_id })
    await criarAuditoria({
      ordem_servico_id:   id,
      ator_id:            ator.sub,
      acao:               AcaoAuditoria.OS_REATRIBUIDA,
      valores_anteriores: JSON.stringify({ mecanico_id: null }),
      novos_valores:      JSON.stringify({ mecanico_id: dto.mecanico_id }),
    })
  }

  const agora = new Date()
  const [updateResult] = await prisma.$transaction([
    prisma.ordens_servico.updateMany({
      where: { id, status: { not: 'fechado' } },
      data: { status: 'fechado', fechado_em: agora },
    }),
    prisma.registros_fechamento.create({
      data: {
        ordem_servico_id:  id,
        fechado_por_id:    ator.sub,
        resultado:         dto.resultado,
        nota_resolucao:    dto.nota_resolucao   ?? null,
        horas_trabalhadas: dto.horas_trabalhadas ?? null,
        obs_adicionais:    dto.obs_adicionais   ?? null,
        fechado_em:        agora,
      },
    }),
  ])

  if (updateResult.count === 0) {
    throw httpError(422, 'OS já está fechada')
  }

  await criarAuditoria({
    ordem_servico_id:  id,
    ator_id:           ator.sub,
    acao:              AcaoAuditoria.OS_FECHADA,
    valores_anteriores: JSON.stringify({ status: os.status }),
    novos_valores:     JSON.stringify({ status: 'fechado', resultado: dto.resultado }),
  })

  // Retornar OS com estado atualizado
  const osAtualizada = await findOSById(id)

  // Notificar supervisor sobre o fechamento (falha silenciosa — D-60)
  if (os.supervisor) {
    try {
      await emailService.enviarOSFechada(
        os.supervisor.email,
        os.supervisor.nome_completo,
        buildOSEmailData(osAtualizada ?? os),
      )
    } catch (err) {
      console.error(`[email] Falha ao enviar fechamento OS #${id}:`, err)
    }
  }

  void invalidarCacheAnalytics()
  emitirEventoOS({ tipo: 'fechado', id })
  return normalizarOS(osAtualizada!, ator.perfil)
}

export async function excluirOSService(id: number, _ator: JwtPayload) {
  const os = await findOSById(id)
  if (!os) throw httpError(404, `OS #${id} não encontrada`)

  if (os.status === 'fechado') {
    throw httpError(422, 'Não é possível excluir uma OS já fechada')
  }

  // Hard delete: remove a OS e todos os registros relacionados (logs, fechamento, anexos)
  await deleteOS(id)
  void invalidarCacheAnalytics()
  emitirEventoOS({ tipo: 'excluido', id })
}

export async function buscarAuditoriaService(id: number) {
  const os = await findOSById(id)
  if (!os) throw httpError(404, `OS #${id} não encontrada`)

  const logs = await findAuditoriaByOS(id)
  return normalizarAuditoria(logs)
}
