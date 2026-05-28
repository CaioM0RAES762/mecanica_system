export interface VerificacaoCadastroParams {
  nome_completo: string
  codigo: string
}

export interface RecuperacaoSenhaParams {
  codigo: string
}

export function templateVerificacaoCadastro(params: VerificacaoCadastroParams): {
  subject: string
  html: string
} {
  return {
    subject: 'Código de verificação — Metalsider',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
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
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <p>Olá.</p>
        <p>Seu código de recuperação de senha é:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:0.3em;text-align:center">${params.codigo}</p>
        <p>Ele expira em 30 minutos.</p>
        <p style="color:#888;font-size:12px">Se você não solicitou recuperação de senha, ignore este e-mail.</p>
      </div>
    `,
  }
}

// Deixar preparado para Sprint 11 — não implementado ainda
export type OSEventEmailType =
  | 'os_atribuida'
  | 'os_proximo_prazo'
  | 'os_atrasada'
  | 'os_fechada'
