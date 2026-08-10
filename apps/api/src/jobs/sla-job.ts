import { AcaoAuditoria } from '@metalsider/shared'
import { logger } from '../lib/logger.js'
import { prisma } from '../lib/prisma.js'
import { emailService, type OSEmailData } from '../lib/email.js'
import { criarAuditoria } from '../repositories/ordens-servico.repository.js'

let _systemActorId: string | null | undefined
let _systemActorCachedAt = 0
const SYSTEM_ACTOR_CACHE_TTL_MS = 60 * 60 * 1000 

async function getSystemActorId(): Promise<string | null> {
  const now = Date.now()
  if (_systemActorId !== undefined && now - _systemActorCachedAt < SYSTEM_ACTOR_CACHE_TTL_MS) {
    return _systemActorId
  }
  const env = process.env['SYSTEM_USER_ID']
  if (env) {
    _systemActorId = env
    _systemActorCachedAt = now
    return env
  }
  const admin = await prisma.usuarios.findFirst({
    where: { perfil: 'admin', ativo: true },
    select: { id: true },
  })
  _systemActorId = admin?.id ?? null
  _systemActorCachedAt = now
  return _systemActorId
}

function buildOSEmailData(os: {
  id: number
  titulo: string
  prioridade: string
  prazo: Date
  veiculo: { placa: string | null; veiculo: string }
  categoria: { nome: string }
}): OSEmailData {
  const placa = os.veiculo.placa ? ` (${os.veiculo.placa})` : ''
  return {
    os_id: os.id,
    titulo: os.titulo,
    prioridade: os.prioridade,
    prazo: os.prazo.toISOString(),
    veiculo: `${os.veiculo.veiculo}${placa}`,
    categoria: os.categoria.nome,
  }
}


export async function jobMarcaAtrasadas(): Promise<void> {
  const agora = new Date()

  let atrasadas
  try {
    atrasadas = await prisma.ordens_servico.findMany({
      where: { status: 'aberto', prazo: { lt: agora } },
      select: {
        id: true,
        titulo: true,
        prioridade: true,
        prazo: true,
        mecanico: { select: { id: true, nome_completo: true, email: true } },
        veiculo: { select: { placa: true, veiculo: true } },
        categoria: { select: { nome: true } },
      },
    })
  } catch (err) {
    logger.error({ mensagem: 'Falha ao consultar OSs atrasadas no job de SLA', detalhe: err instanceof Error ? err.message : String(err) })
    return
  }

  if (atrasadas.length === 0) return

  const atorId = await getSystemActorId().catch((err) => {
    logger.error({ mensagem: 'Falha ao resolver ator do sistema no job de SLA', detalhe: err instanceof Error ? err.message : String(err) })
    return null
  })
  if (!atorId) {
    logger.error({ mensagem: 'SYSTEM_USER_ID não configurado e nenhum admin ativo encontrado — auditoria de SLA ignorada' })
    return
  }

  for (const os of atrasadas) {
    try {
      const resultado = await prisma.ordens_servico.updateMany({
        where: { id: os.id, status: 'aberto' },
        data: { status: 'atrasado' },
      })
      if (resultado.count === 0) continue

      await criarAuditoria({
        ordem_servico_id: os.id,
        ator_id: atorId,
        acao: AcaoAuditoria.OS_MARCADA_ATRASADA,
        valores_anteriores: JSON.stringify({ status: 'aberto' }),
        novos_valores: JSON.stringify({ status: 'atrasado', prazo: os.prazo.toISOString() }),
      })

      if (os.mecanico) {
        try {
          await emailService.enviarOSAtrasada(
            os.mecanico.email,
            os.mecanico.nome_completo,
            buildOSEmailData(os),
          )
        } catch (emailErr) {
          logger.error({ mensagem: `Falha ao enviar e-mail de atraso da OS #${os.id}`, detalhe: emailErr instanceof Error ? emailErr.message : String(emailErr) })
        }
      }
    } catch (err) {
      logger.error({ mensagem: `Erro ao processar OS #${os.id} no job de SLA`, detalhe: err instanceof Error ? err.message : String(err) })
    }
  }
}

/**
 * Envia alerta de prazo próximo (2h) ao mecânico atribuído.
 * Idempotência garantida por alerta_proximo_enviado_em (D-59):
 * apenas OSs com esse campo NULL são processadas; ao enviar, o campo é preenchido.
 */
export async function jobAlertaPrazo(): Promise<void> {
  const agora = new Date()
  const em2h = new Date(agora.getTime() + 2 * 60 * 60 * 1000)

  let proximas
  try {
    proximas = await prisma.ordens_servico.findMany({
      where: {
        status: 'aberto',
        prazo: { gte: agora, lte: em2h },
        alerta_proximo_enviado_em: null,
      },
      select: {
        id: true,
        titulo: true,
        prioridade: true,
        prazo: true,
        mecanico: { select: { id: true, nome_completo: true, email: true } },
        veiculo: { select: { placa: true, veiculo: true } },
        categoria: { select: { nome: true } },
      },
    })
  } catch (err) {
    logger.error({ mensagem: 'Falha ao consultar OSs com prazo próximo no job de SLA', detalhe: err instanceof Error ? err.message : String(err) })
    return
  }

  for (const os of proximas) {
    if (!os.mecanico) continue

    try {
      const marcado = await prisma.ordens_servico.updateMany({
        where: { id: os.id, alerta_proximo_enviado_em: null },
        data: { alerta_proximo_enviado_em: agora },
      })
      if (marcado.count === 0) continue

      await emailService.enviarOSProximaPrazo(
        os.mecanico.email,
        os.mecanico.nome_completo,
        buildOSEmailData(os),
      )
    } catch (err) {
      logger.error({ mensagem: `Erro ao enviar alerta de prazo da OS #${os.id}`, detalhe: err instanceof Error ? err.message : String(err) })
    }
  }
}

const INTERVALO_MS = 15 * 60 * 1000 

export function iniciarJobs(): void {
  setImmediate(() => {
    void jobMarcaAtrasadas()
    void jobAlertaPrazo()
  })

  setInterval(() => {
    void jobMarcaAtrasadas()
    void jobAlertaPrazo()
  }, INTERVALO_MS)
}
