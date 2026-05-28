import nodemailer from 'nodemailer'
import {
  templateRecuperacaoSenha,
  templateVerificacaoCadastro,
} from './email-templates.js'

export interface IEmailService {
  enviarCodigoVerificacao(destinatario: string, nome: string, codigo: string): Promise<void>
  enviarCodigoRecuperacaoSenha(destinatario: string, codigo: string): Promise<void>
}

class MockEmailService implements IEmailService {
  async enviarCodigoVerificacao(destinatario: string, _nome: string, _codigo: string): Promise<void> {
    // Loga apenas assunto e destinatário, nunca o código (segurança)
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: Código de verificação — Metalsider`)
  }

  async enviarCodigoRecuperacaoSenha(destinatario: string, _codigo: string): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Assunto: Recuperação de senha — Metalsider`)
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
