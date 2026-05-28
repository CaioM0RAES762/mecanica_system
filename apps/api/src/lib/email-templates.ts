export interface VerificacaoCadastroParams {
  nome_completo: string
  codigo: string
}

export interface RecuperacaoSenhaParams {
  codigo: string
}

export interface OSEmailParams {
  destinatario_nome: string
  os_id: number
  titulo: string
  prioridade: string
  prazo: string
  veiculo: string
  categoria: string
}

function formatPrioridade(p: string): string {
  const map: Record<string, string> = {
    critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa',
  }
  return map[p] ?? p
}

function formatPrazo(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

const baseStyle = `font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a2e`
const headerStyle = `background:#0F1B2D;padding:20px 24px;border-radius:8px 8px 0 0`
const bodyStyle = `background:#f9fafb;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e5e7eb;border-top:none`
const labelStyle = `font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280`
const valueStyle = `font-size:15px;color:#111827;margin:2px 0 12px`

function osCardHtml(p: OSEmailParams): string {
  return `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
      <p style="${labelStyle}">OS #${p.os_id}</p>
      <p style="${valueStyle}">${p.titulo}</p>
      <p style="${labelStyle}">Prioridade</p>
      <p style="${valueStyle}">${formatPrioridade(p.prioridade)}</p>
      <p style="${labelStyle}">Prazo</p>
      <p style="${valueStyle}">${formatPrazo(p.prazo)}</p>
      <p style="${labelStyle}">Veículo</p>
      <p style="${valueStyle}">${p.veiculo}</p>
      <p style="${labelStyle}">Categoria</p>
      <p style="font-size:15px;color:#111827;margin:2px 0 0">${p.categoria}</p>
    </div>
  `
}

export function templateVerificacaoCadastro(params: VerificacaoCadastroParams): {
  subject: string
  html: string
} {
  return {
    subject: 'Código de verificação — Metalsider',
    html: `
      <div style="${baseStyle}">
        <p>Olá, <strong>${params.nome_completo}</strong>.</p>
        <p>Seu código de verificação é:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:0.3em;text-align:center">${params.codigo}</p>
        <p>Ele expira em 30 minutos.</p>
        <p style="color:#888;font-size:12px">Se você não solicitou este cadastro, ignore este e-mail.</p>
      </div>
    `,
  }
}

export function templateRecuperacaoSenha(params: RecuperacaoSenhaParams): {
  subject: string
  html: string
} {
  return {
    subject: 'Recuperação de senha — Metalsider',
    html: `
      <div style="${baseStyle}">
        <p>Olá.</p>
        <p>Seu código de recuperação de senha é:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:0.3em;text-align:center">${params.codigo}</p>
        <p>Ele expira em 30 minutos.</p>
        <p style="color:#888;font-size:12px">Se você não solicitou recuperação de senha, ignore este e-mail.</p>
      </div>
    `,
  }
}

export function templateOSAtribuida(params: OSEmailParams): { subject: string; html: string } {
  return {
    subject: `OS #${params.os_id} atribuída a você — Metalsider`,
    html: `
      <div style="${baseStyle}">
        <div style="${headerStyle}">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:600">Nova OS atribuída</p>
        </div>
        <div style="${bodyStyle}">
          <p>Olá, <strong>${params.destinatario_nome}</strong>.</p>
          <p>Uma ordem de serviço foi atribuída a você:</p>
          ${osCardHtml(params)}
          <p style="color:#6b7280;font-size:12px">Acesse o sistema Metalsider para visualizar os detalhes.</p>
        </div>
      </div>
    `,
  }
}

export function templateOSAtrasada(params: OSEmailParams): { subject: string; html: string } {
  return {
    subject: `OS #${params.os_id} está ATRASADA — Metalsider`,
    html: `
      <div style="${baseStyle}">
        <div style="background:#dc2626;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:600">⚠ OS com prazo vencido</p>
        </div>
        <div style="${bodyStyle}">
          <p>Olá, <strong>${params.destinatario_nome}</strong>.</p>
          <p>A ordem de serviço a seguir está <strong>atrasada</strong>. O prazo já foi excedido.</p>
          ${osCardHtml(params)}
          <p>Por favor, acesse o sistema e tome as providências necessárias.</p>
          <p style="color:#6b7280;font-size:12px">Este é um alerta automático do sistema Metalsider.</p>
        </div>
      </div>
    `,
  }
}

export function templateOSProximaPrazo(params: OSEmailParams): { subject: string; html: string } {
  return {
    subject: `OS #${params.os_id} — prazo em menos de 2h — Metalsider`,
    html: `
      <div style="${baseStyle}">
        <div style="background:#d97706;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:600">⏰ Prazo se aproximando</p>
        </div>
        <div style="${bodyStyle}">
          <p>Olá, <strong>${params.destinatario_nome}</strong>.</p>
          <p>A ordem de serviço a seguir vence em <strong>menos de 2 horas</strong>:</p>
          ${osCardHtml(params)}
          <p>Finalize ou atualize a OS antes do prazo para evitar marcação como atrasada.</p>
          <p style="color:#6b7280;font-size:12px">Este é um alerta automático do sistema Metalsider.</p>
        </div>
      </div>
    `,
  }
}

export function templateOSFechada(params: OSEmailParams): { subject: string; html: string } {
  return {
    subject: `OS #${params.os_id} foi fechada — Metalsider`,
    html: `
      <div style="${baseStyle}">
        <div style="background:#059669;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:600">✓ OS concluída</p>
        </div>
        <div style="${bodyStyle}">
          <p>Olá, <strong>${params.destinatario_nome}</strong>.</p>
          <p>A seguinte ordem de serviço foi <strong>fechada</strong>:</p>
          ${osCardHtml(params)}
          <p style="color:#6b7280;font-size:12px">Acesse o sistema Metalsider para visualizar o registro completo.</p>
        </div>
      </div>
    `,
  }
}
