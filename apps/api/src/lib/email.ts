export interface IEmailService {
  enviarCodigoVerificacao(destinatario: string, nome: string, codigo: string): Promise<void>
}

class MockEmailService implements IEmailService {
  async enviarCodigoVerificacao(destinatario: string, nome: string, codigo: string): Promise<void> {
    console.log(`[EMAIL MOCK] Para: ${destinatario} | Nome: ${nome} | Código: ${codigo}`)
  }
}

class GraphEmailService implements IEmailService {
  private tenantId = process.env['GRAPH_TENANT_ID']!
  private clientId = process.env['GRAPH_CLIENT_ID']!
  private clientSecret = process.env['GRAPH_CLIENT_SECRET']!
  private senderEmail = process.env['GRAPH_SENDER_EMAIL']!

  private async getAccessToken(): Promise<string> {
    const url = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    })

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })

    if (!res.ok) {
      throw new Error(`Graph API token error: ${res.status}`)
    }

    const data = (await res.json()) as { access_token: string }
    return data.access_token
  }

  async enviarCodigoVerificacao(destinatario: string, nome: string, codigo: string): Promise<void> {
    const token = await this.getAccessToken()
    const url = `https://graph.microsoft.com/v1.0/users/${this.senderEmail}/sendMail`

    const payload = {
      message: {
        subject: 'Metalsider — Código de ativação da sua conta',
        body: {
          contentType: 'HTML',
          content: `
            <p>Olá, <strong>${nome}</strong>!</p>
            <p>Seu código de ativação é:</p>
            <h2 style="letter-spacing:0.3em;font-size:32px">${codigo}</h2>
            <p>Esse código expira em ${process.env['CODE_EXPIRY_MINUTES'] ?? 30} minutos.</p>
            <p>Acesse <a href="${process.env['NEXTAUTH_URL'] ?? ''}/ativar-conta">Ativar conta</a></p>
          `,
        },
        toRecipients: [{ emailAddress: { address: destinatario } }],
      },
      saveToSentItems: false,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok && res.status !== 202) {
      throw new Error(`Graph API sendMail error: ${res.status}`)
    }
  }
}

export function createEmailService(): IEmailService {
  if (process.env['NODE_ENV'] === 'production') {
    return new GraphEmailService()
  }
  return new MockEmailService()
}

export const emailService: IEmailService = createEmailService()
