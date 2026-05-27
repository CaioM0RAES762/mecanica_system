import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface User {
    perfil: string
    accessToken: string
  }
  interface Session {
    user: {
      id: string
      email: string
      name: string
      perfil: string
    }
    accessToken: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    perfil: string
    accessToken: string
  }
}
