import { AcaoAuditoria } from '@metalsider/shared'
import { prisma } from '../lib/prisma.js'
import { emailService, type OSEmailData } from '../lib/email.js'
import { criarAuditoria } from '../repositories/ordens-servico.repository.js'

// Cache para não re-consultar o banco a cada execução do job
let _systemActorId: string | null | undefined

async function getSystemActorId(): Promise<string | null> {
  if (_systemActorId !== undefined) return _systemActorId
  const env = process.env['SYSTEM_USER_ID']
  if (env) {
    _systemActorId = env
    return env
  }
  const admin = await prisma.usuarios.findFirst({
    where: { perfil: 'admin', ativo: true },
    select: { id: true },
  })
  _systemActorId = admin?.id ?? null
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

/**
 * Marca como 'atrasado' toda OS aberta com prazo < agora.
 * Cria auditoria e envia e-mail ao mecânico atribuído.
 * Usa updateMany com where.status='aberto' para garantir idempotência em execuções concorrentes.
 */
export async function jobMarcaAtrasadas(): Promise<void> {
  const agora = new Date()

  const atrasadas = await prisma.ordens_servico.findMany({
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

  if (atrasadas.length === 0) return

  const atorId = await getSystemActorId()
  if (!atorId) {
    console.error('[job:sla] SYSTEM_USER_ID não configurado e nenhum admin ativo encontrado — auditoria ignorada')
    return
  }

  for (const os of atrasadas) {
    try {
      // Guarda atômica: só atualiza se ainda 'aberto' (evita dupla marcação)
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
          // Falha de e-mail nunca cancela a marcação de atraso (D-60)
          console.error(`[job:sla] Falha ao enviar e-mail OS #${os.id}:`, emailErr)
        }
      }
    } catch (err) {
      console.error(`[job:sla] Erro ao processar OS #${os.id}:`, err)
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

  const proximas = await prisma.ordens_servico.findMany({
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

  for (const os of proximas) {
    if (!os.mecanico) continue

    try {
      // Marcar antes de enviar: se o e-mail falhar, não reenviar no próximo ciclo (D-59)
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
      console.error(`[job:prazo] Erro ao processar OS #${os.id}:`, err)
    }
  }
}

const INTERVALO_MS = 15 * 60 * 1000 // 15 minutos

export function iniciarJobs(): void {
  // Execução imediata no startup, depois a cada 15 min
  setImmediate(() => {
    void jobMarcaAtrasadas()
    void jobAlertaPrazo()
  })

  setInterval(() => {
    void jobMarcaAtrasadas()
    void jobAlertaPrazo()
  }, INTERVALO_MS)
}
