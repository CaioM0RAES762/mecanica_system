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

// ── helpers ────────────────────────────────────────────────────────────────

function formatPrioridade(p: string): string {
  const map: Record<string, string> = {
    critica: 'Crítica', alta: 'Alta', media: 'Média', baixa: 'Baixa',
  }
  return map[p] ?? p
}

function prioridadeCor(p: string): { bg: string; fg: string } {
  const map: Record<string, { bg: string; fg: string }> = {
    critica: { bg: '#fee2e2', fg: '#991b1b' },
    alta:    { bg: '#ffedd5', fg: '#9a3412' },
    media:   { bg: '#fef9c3', fg: '#854d0e' },
    baixa:   { bg: '#f0fdf4', fg: '#166534' },
  }
  return map[p] ?? { bg: '#f3f4f6', fg: '#374151' }
}

function formatPrazo(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

const F = `-apple-system,BlinkMacSystemFont,'Segoe UI','Helvetica Neue',Arial,sans-serif`
const YEAR = new Date().getFullYear()

// ── layout wrapper ─────────────────────────────────────────────────────────

function wrapper(content: string, accentColor = '#1e4bb8'): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#edf1f9;-webkit-font-smoothing:antialiased;mso-line-height-rule:exactly;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background:#edf1f9;padding:40px 20px 52px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:560px;width:100%;">
<tr><td>

  <!-- top accent stripe -->
  <div style="height:3px;background:${accentColor};border-radius:4px 4px 0 0;"></div>

  <!-- card -->
  <div style="background:#ffffff;border-radius:0 0 12px 12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.05),0 8px 28px rgba(12,27,80,0.09);">

    <!-- header: text logo -->
    <div style="padding:22px 36px 18px;border-bottom:1px solid #f0f3fa;">
      <span style="font-size:15px;font-weight:800;color:#0a1628;letter-spacing:-0.03em;font-family:${F};">metal</span><span style="font-size:15px;font-weight:800;color:#c0392b;letter-spacing:-0.03em;font-family:${F};">Sider</span>
    </div>

    <!-- body -->
    <div style="padding:32px 36px 28px;font-family:${F};font-size:15px;color:#0f172a;line-height:1.65;">
      ${content}
    </div>

    <!-- footer -->
    <div style="padding:16px 36px 22px;background:#f8fafd;border-top:1px solid #f0f3fa;">
      <p style="margin:0;font-size:11px;color:#9ca8b8;line-height:1.7;font-family:${F};">Este é um e-mail automático. Não responda a esta mensagem.</p>
      <p style="margin:4px 0 0;font-size:11px;color:#c4ccd8;font-family:${F};">© ${YEAR} Metalsider &nbsp;·&nbsp; Gestão de Ordens de Serviço</p>
    </div>

  </div>

</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

// ── code block ─────────────────────────────────────────────────────────────

function codeBlock(code: string): string {
  return `
<div style="background:#f2f5fb;border-radius:10px;padding:30px 20px;text-align:center;margin:24px 0;">
  <p style="margin:0;font-size:38px;font-weight:700;letter-spacing:0.25em;color:#0a1628;font-family:'Courier New',Courier,monospace;word-break:keep-all;">${code}</p>
</div>`
}

// ── OS card ────────────────────────────────────────────────────────────────

function osCard(p: OSEmailParams): string {
  const cor = prioridadeCor(p.prioridade)
  const row = (label: string, value: string, last = false) => `
    <tr>
      <td style="padding:10px 18px;width:36%;vertical-align:top;${last ? '' : 'border-bottom:1px solid #f4f7fb;'}">
        <p style="margin:0;font-size:10px;font-weight:700;color:#a0aab8;text-transform:uppercase;letter-spacing:0.08em;font-family:${F};">${label}</p>
      </td>
      <td style="padding:10px 18px;${last ? '' : 'border-bottom:1px solid #f4f7fb;'}">
        ${value}
      </td>
    </tr>`

  return `
<div style="border:1px solid #e8edf5;border-radius:8px;overflow:hidden;margin:20px 0;">
  <!-- title row -->
  <div style="background:#f5f8fc;padding:14px 18px;border-bottom:1px solid #e8edf5;">
    <p style="margin:0;font-size:10px;font-weight:700;color:#a0aab8;letter-spacing:0.08em;text-transform:uppercase;font-family:${F};">OS #${p.os_id}</p>
    <p style="margin:5px 0 0;font-size:16px;font-weight:600;color:#0a1628;font-family:${F};">${p.titulo}</p>
  </div>
  <!-- fields -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
    ${row('Prioridade', `<span style="display:inline-block;font-size:12px;font-weight:600;color:${cor.fg};background:${cor.bg};padding:2px 10px;border-radius:20px;font-family:${F};">${formatPrioridade(p.prioridade)}</span>`)}
    ${row('Prazo', `<p style="margin:0;font-size:14px;color:#374151;font-weight:500;font-family:${F};">${formatPrazo(p.prazo)}</p>`)}
    ${row('Veículo', `<p style="margin:0;font-size:14px;color:#374151;font-weight:500;font-family:${F};">${p.veiculo}</p>`)}
    ${row('Categoria', `<p style="margin:0;font-size:14px;color:#374151;font-weight:500;font-family:${F};">${p.categoria}</p>`, true)}
  </table>
</div>`
}

// ── badge ──────────────────────────────────────────────────────────────────

function badge(text: string, bg: string, fg: string): string {
  return `<div style="margin-bottom:20px;"><span style="display:inline-block;background:${bg};color:${fg};padding:5px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;font-family:${F};">${text}</span></div>`
}

// ── templates ──────────────────────────────────────────────────────────────

export function templateVerificacaoCadastro(params: VerificacaoCadastroParams): {
  subject: string
  html: string
} {
  const content = `
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0a1628;font-family:${F};">Confirme seu e-mail</p>
<p style="margin:0 0 4px;font-size:14px;color:#64748b;font-family:${F};">Olá, <strong style="color:#0f172a;">${params.nome_completo}</strong>.</p>
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">Use o código abaixo para ativar sua conta no sistema Metalsider.</p>
${codeBlock(params.codigo)}
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">O código expira em <strong style="color:#0f172a;">30 minutos</strong>.</p>
<p style="margin:20px 0 0;font-size:12px;color:#a0aab8;font-family:${F};">Se você não solicitou este cadastro, ignore este e-mail.</p>
`
  return {
    subject: 'Confirme seu e-mail — Metalsider',
    html: wrapper(content, '#1e4bb8'),
  }
}

export function templateRecuperacaoSenha(params: RecuperacaoSenhaParams): {
  subject: string
  html: string
} {
  const content = `
<p style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0a1628;font-family:${F};">Recuperação de senha</p>
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">Use o código abaixo para redefinir a senha da sua conta Metalsider.</p>
${codeBlock(params.codigo)}
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">O código expira em <strong style="color:#0f172a;">30 minutos</strong>.</p>
<p style="margin:20px 0 0;font-size:12px;color:#a0aab8;font-family:${F};">Se você não solicitou a recuperação de senha, ignore este e-mail.</p>
`
  return {
    subject: 'Recuperação de senha — Metalsider',
    html: wrapper(content, '#1e4bb8'),
  }
}

export function templateOSAtribuida(params: OSEmailParams): { subject: string; html: string } {
  const content = `
${badge('Nova OS Atribuída', '#eff6ff', '#1d4ed8')}
<p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0a1628;font-family:${F};">Olá, ${params.destinatario_nome}</p>
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">Uma nova ordem de serviço foi atribuída a você.</p>
${osCard(params)}
<p style="margin:0;font-size:13px;color:#a0aab8;font-family:${F};">Acesse o sistema Metalsider para visualizar os detalhes e atualizar o status.</p>
`
  return {
    subject: `OS #${params.os_id} atribuída a você — Metalsider`,
    html: wrapper(content, '#12276a'),
  }
}

export function templateOSAtrasada(params: OSEmailParams): { subject: string; html: string } {
  const content = `
${badge('Prazo Vencido', '#fef2f2', '#dc2626')}
<p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0a1628;font-family:${F};">Olá, ${params.destinatario_nome}</p>
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">A ordem de serviço abaixo está <strong style="color:#dc2626;">atrasada</strong>. O prazo foi excedido.</p>
${osCard(params)}
<p style="margin:0;font-size:13px;color:#a0aab8;font-family:${F};">Acesse o sistema e tome as providências necessárias.</p>
`
  return {
    subject: `OS #${params.os_id} está ATRASADA — Metalsider`,
    html: wrapper(content, '#dc2626'),
  }
}

export function templateOSProximaPrazo(params: OSEmailParams): { subject: string; html: string } {
  const content = `
${badge('Prazo em menos de 2 horas', '#fffbeb', '#d97706')}
<p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0a1628;font-family:${F};">Olá, ${params.destinatario_nome}</p>
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">A ordem de serviço abaixo vence em <strong style="color:#d97706;">menos de 2 horas</strong>.</p>
${osCard(params)}
<p style="margin:0;font-size:13px;color:#a0aab8;font-family:${F};">Finalize ou atualize a OS antes do prazo para evitar marcação como atrasada.</p>
`
  return {
    subject: `OS #${params.os_id} — prazo em menos de 2h — Metalsider`,
    html: wrapper(content, '#d97706'),
  }
}

export function templateOSFechada(params: OSEmailParams): { subject: string; html: string } {
  const content = `
${badge('OS Concluída', '#f0fdf4', '#15803d')}
<p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0a1628;font-family:${F};">Olá, ${params.destinatario_nome}</p>
<p style="margin:0;font-size:14px;color:#64748b;font-family:${F};">A seguinte ordem de serviço foi <strong style="color:#15803d;">fechada</strong> com sucesso.</p>
${osCard(params)}
<p style="margin:0;font-size:13px;color:#a0aab8;font-family:${F};">Acesse o sistema Metalsider para visualizar o registro completo.</p>
`
  return {
    subject: `OS #${params.os_id} foi fechada — Metalsider`,
    html: wrapper(content, '#059669'),
  }
}
