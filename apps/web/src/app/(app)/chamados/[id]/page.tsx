import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { buscarOS, buscarAuditoria } from '@/lib/api/ordens-servico'
import {
  PRIORIDADE_LABEL,
  RESULTADO_LABEL,
} from '@metalsider/shared'
import {
  IconArrowLeft,
  IconPaperclip,
} from '@tabler/icons-react'
import styles from './page.module.css'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  return { title: `Chamado #${id}` }
}

export default async function ChamadoDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: idStr } = await params
  const id = Number(idStr)
  if (isNaN(id) || id <= 0) notFound()

  const session = await auth()
  const token = session?.accessToken ?? ''
  const perfil = session?.user?.perfil ?? 'mecanico'

  let os, auditoria
  try {
    ;[os, auditoria] = await Promise.all([
      buscarOS(id, token),
      perfil !== 'mecanico' ? buscarAuditoria(id, token) : Promise.resolve([]),
    ])
  } catch {
    notFound()
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  }

  const STATUS_LABEL: Record<string, string> = {
    aberto: 'Aberto',
    em_andamento: 'Em andamento',
    atrasado: 'Atrasado',
    fechado: 'Fechado',
  }

  return (
    <div className={styles.page}>
      <Link href="/chamados" className={styles.backLink}>
        <IconArrowLeft size={15} aria-hidden="true" />
        Voltar para chamados
      </Link>

      {/* Cabeçalho */}
      <div className={styles.header}>
        <div className={styles.headerMeta}>
          <span className={styles.id}>#{os.id}</span>
          <span className={`${styles.statusBadge} ${styles[`status_${os.status}`]}`}>
            {STATUS_LABEL[os.status] ?? os.status}
          </span>
          <span className={styles.prioBadge}>{PRIORIDADE_LABEL[os.prioridade]}</span>
          <span className={styles.catBadge}>{os.categoria_nome}</span>
        </div>
        <h1 className={styles.titulo}>{os.titulo}</h1>
        {os.descricao && <p className={styles.descricao}>{os.descricao}</p>}
      </div>

      {/* Grid de informações */}
      <div className={styles.infoGrid}>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Veículo</span>
          <span className={styles.infoValue}>{os.veiculo_nome}{os.veiculo_placa ? ` — ${os.veiculo_placa}` : ''}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Mecânico</span>
          <span className={styles.infoValue}>{os.mecanico_nome ?? 'Não atribuído'}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Supervisor</span>
          <span className={styles.infoValue}>{os.supervisor_nome}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Aberto em</span>
          <span className={styles.infoValue}>{fmt(os.criado_em)}</span>
        </div>
        <div className={styles.infoItem}>
          <span className={styles.infoLabel}>Prazo</span>
          <span className={styles.infoValue}>{fmt(os.prazo)}</span>
        </div>
        {os.fechado_em && (
          <div className={styles.infoItem}>
            <span className={styles.infoLabel}>Fechado em</span>
            <span className={styles.infoValue}>{fmt(os.fechado_em)}</span>
          </div>
        )}
      </div>

      {/* Notas internas — ocultas para mecânico */}
      {perfil !== 'mecanico' && os.notas_internas && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notas internas</h2>
          <p className={styles.blockText}>{os.notas_internas}</p>
        </div>
      )}

      {/* Registro de fechamento */}
      {os.fechamento && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Registro de fechamento</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Resultado</span>
              <span className={styles.infoValue}>{RESULTADO_LABEL[os.fechamento.resultado]}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Fechado por</span>
              <span className={styles.infoValue}>{os.fechamento.fechado_por_nome}</span>
            </div>
            {os.fechamento.horas_trabalhadas != null && (
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Horas trabalhadas</span>
                <span className={styles.infoValue}>{os.fechamento.horas_trabalhadas}h</span>
              </div>
            )}
            {os.fechamento.nota_resolucao && (
              <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                <span className={styles.infoLabel}>Resolução</span>
                <span className={styles.infoValue}>{os.fechamento.nota_resolucao}</span>
              </div>
            )}
            {os.fechamento.obs_adicionais && (
              <div className={`${styles.infoItem} ${styles.fullWidth}`}>
                <span className={styles.infoLabel}>Observações</span>
                <span className={styles.infoValue}>{os.fechamento.obs_adicionais}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Anexos */}
      {os.anexos.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Anexos ({os.anexos.length})</h2>
          <ul className={styles.anexosList}>
            {os.anexos.map(a => (
              <li key={a.id} className={styles.anexoItem}>
                <IconPaperclip size={14} className={styles.anexoIcon} aria-hidden="true" />
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.anexoLink}
                >
                  {a.nome_arquivo}
                </a>
                {a.tamanho_bytes != null && (
                  <span className={styles.anexoMeta}>
                    {a.tamanho_bytes < 1024 * 1024
                      ? `${(a.tamanho_bytes / 1024).toFixed(1)} KB`
                      : `${(a.tamanho_bytes / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Histórico de auditoria — só admin/supervisor */}
      {auditoria.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Histórico de auditoria</h2>
          <ol className={styles.auditList}>
            {auditoria.map(log => (
              <li key={log.id} className={styles.auditItem}>
                <span className={styles.auditAtor}>{log.ator_nome}</span>
                <span className={styles.auditAcao}>
                  {log.acao.replace(/_/g, ' ').toLowerCase()}
                </span>
                <span className={styles.auditData}>{fmt(log.ocorrido_em)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
