import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { LoginSchema } from '@metalsider/shared'

class ContaNaoVerificadaError extends CredentialsSignin {
  override code = 'conta_nao_verificada'
}

class DominioInvalidoError extends CredentialsSignin {
  override code = 'dominio_invalido'
}

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials)
        if (!parsed.success) throw new DominioInvalidoError()

        const res = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        })

        if (!res.ok) {
          const data = (await res.json()) as { code?: string; detail?: string }
          if (data.code === 'CONTA_NAO_VERIFICADA') throw new ContaNaoVerificadaError()
          return null
        }

        const data = (await res.json()) as {
          token: string
          user: { id: string; email: string; nome_completo: string; perfil: string }
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.nome_completo,
          perfil: data.user.perfil,
          accessToken: data.token,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id!
        token.perfil = user.perfil
        token.accessToken = user.accessToken
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id
      session.user.perfil = token.perfil
      session.accessToken = token.accessToken
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
})
