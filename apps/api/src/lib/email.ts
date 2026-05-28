import nodemailer from 'nodemailer'
import {
  templateRecuperacaoSenha,
  templateVerificacaoCadastro,
  templateOSAtribuida,
  templateOSAtrasada,
  templateOSProximaPrazo,
  templateOSFechada,
} from './email-templates.js'

export interface OSEmailData {
  os_id: number
  titulo: string
  prioridade: string
  prazo: string
  veiculo: string
  categoria: string
}

export interface IEmailService {
  enviarCodigoVerificacao(destinatario: string, nome: string, codigo: string): Promise<void>
  enviarCodigoRecuperacaoSenha(destinatario: string, codigo: string): Promise<void>
  enviarOSAtribuida(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void>
  enviarOSAtrasada(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void>
  enviarOSProximaPrazo(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void>
  enviarOSFechada(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void>
}

class MockEmailService implements IEmailService {
  async enviarCodigoVerificacao(destinatario: string, _nome: string, _codigo: string): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: Código de verificação — Metalsider`)
  }

  async enviarCodigoRecuperacaoSenha(destinatario: string, _codigo: string): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: Recuperação de senha — Metalsider`)
  }

  async enviarOSAtribuida(destinatario: string, _nome: string, os: OSEmailData): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: OS #${os.os_id} atribuída — Metalsider`)
  }

  async enviarOSAtrasada(destinatario: string, _nome: string, os: OSEmailData): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: OS #${os.os_id} ATRASADA — Metalsider`)
  }

  async enviarOSProximaPrazo(destinatario: string, _nome: string, os: OSEmailData): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: OS #${os.os_id} prazo em 2h — Metalsider`)
  }

  async enviarOSFechada(destinatario: string, _nome: string, os: OSEmailData): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: OS #${os.os_id} fechada — Metalsider`)
  }
}

class NodemailerEmailService implements IEmailService {
  private transporter: nodemailer.Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env['EMAIL_HOST'],
      port: Number(process.env['EMAIL_PORT'] ?? 587),
      secure: process.env['EMAIL_SECURE'] === 'true',
      auth: {
        user: process.env['EMAIL_USER'],
        pass: process.env['EMAIL_PASSWORD'],
      },
    })
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    await this.transporter.sendMail({
      from: process.env['EMAIL_FROM'],
      to,
      subject,
      html,
    })
  }

  async enviarCodigoVerificacao(destinatario: string, nome: string, codigo: string): Promise<void> {
    const { subject, html } = templateVerificacaoCadastro({ nome_completo: nome, codigo })
    await this.send(destinatario, subject, html)
  }

  async enviarCodigoRecuperacaoSenha(destinatario: string, codigo: string): Promise<void> {
    const { subject, html } = templateRecuperacaoSenha({ codigo })
    await this.send(destinatario, subject, html)
  }

  async enviarOSAtribuida(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void> {
    const { subject, html } = templateOSAtribuida({ destinatario_nome: nomeDestinatario, ...os })
    await this.send(destinatario, subject, html)
  }

  async enviarOSAtrasada(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void> {
    const { subject, html } = templateOSAtrasada({ destinatario_nome: nomeDestinatario, ...os })
    await this.send(destinatario, subject, html)
  }

  async enviarOSProximaPrazo(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void> {
    const { subject, html } = templateOSProximaPrazo({ destinatario_nome: nomeDestinatario, ...os })
    await this.send(destinatario, subject, html)
  }

  async enviarOSFechada(destinatario: string, nomeDestinatario: string, os: OSEmailData): Promise<void> {
    const { subject, html } = templateOSFechada({ destinatario_nome: nomeDestinatario, ...os })
    await this.send(destinatario, subject, html)
  }
}

export function createEmailService(): IEmailService {
  const emailUser = process.env['EMAIL_USER']
  const emailPassword = process.env['EMAIL_PASSWORD']
  if (emailUser && emailPassword) {
    return new NodemailerEmailService()
  }
  return new MockEmailService()
}

export const emailService: IEmailService = createEmailService()
