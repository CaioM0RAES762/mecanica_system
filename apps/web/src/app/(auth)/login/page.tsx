'use client'

import React, { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { LoginSchema } from '@metalsider/shared'
import styles from './page.module.css'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroTipo, setErroTipo] = useState<'error' | 'warning'>('error')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    const validacao = LoginSchema.safeParse({ email, password })
    if (!validacao.success) {
      setErro('Acesso permitido somente para contas @metalsider.com.br')
      setErroTipo('error')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (!result || result.error) {
      const code = result?.code ?? result?.error ?? ''
      if (code === 'conta_nao_verificada' || code.includes('nao_verificada')) {
        setErro('Conta ainda não ativada. Verifique seu e-mail.')
        setErroTipo('warning')
      } else if (code === 'dominio_invalido') {
        setErro('Acesso permitido somente para contas @metalsider.com.br')
        setErroTipo('error')
      } else {
        setErro('E-mail ou senha incorretos')
        setErroTipo('error')
      }
      return
    }

    router.push(callbackUrl)
  }

  return (
    <div className={styles.formWrapper}>
      <div className={styles.mobileLogo}>
        <img src="/images/logo.png" alt="Metalsider" className={styles.mobileLogoImg} />
      </div>

      <h2 className={styles.title}>Bem-vindo de volta</h2>
      <p className={styles.subtitle}>Acesse sua conta corporativa</p>

      {erro && (
        <div
          className={styles.toast}
          style={{
            borderColor: erroTipo === 'warning' ? 'var(--color-amber-500)' : 'var(--color-red-500)',
            backgroundColor: erroTipo === 'warning' ? 'var(--color-amber-50)' : 'var(--color-red-50)',
            color: erroTipo === 'warning' ? '#92400e' : '#991b1b',
          }}
          role="alert"
        >
          {erro}
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>
            E-mail corporativo
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu@metalsider.com.br"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="password" className={styles.label}>
              Senha
            </label>
            <Link href="/recuperar-senha" className={styles.forgotLink}>
              Esqueceu a senha?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className={styles.submit} disabled={loading || !email || !password}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <p className={styles.activateLink}>
        Primeira vez?{' '}
        <Link href="/cadastro" className={styles.link}>
          Criar minha conta
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <aside className={styles.panel}>
        <svg
          className={styles.panelDecoration}
          viewBox="0 0 440 760"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Anéis concêntricos — canto superior direito */}
          <circle cx="400" cy="-80" r="320" stroke="white" strokeOpacity="0.06" strokeWidth="1" />
          <circle cx="400" cy="-80" r="230" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
          <circle cx="400" cy="-80" r="145" stroke="white" strokeOpacity="0.04" strokeWidth="1" />
          {/* Anéis concêntricos — canto inferior esquerdo */}
          <circle cx="20" cy="840" r="300" stroke="white" strokeOpacity="0.05" strokeWidth="1" />
          <circle cx="20" cy="840" r="200" stroke="white" strokeOpacity="0.04" strokeWidth="1" />
          {/* Linhas diagonais sutis */}
          <line x1="-30" y1="400" x2="470" y2="180" stroke="white" strokeOpacity="0.025" strokeWidth="1" />
          <line x1="-30" y1="460" x2="470" y2="240" stroke="white" strokeOpacity="0.02" strokeWidth="1" />
          <line x1="-30" y1="520" x2="470" y2="300" stroke="white" strokeOpacity="0.015" strokeWidth="1" />
          {/* Quadrado decorativo centralizado */}
          <rect x="170" y="340" width="100" height="100" rx="4" stroke="white" strokeOpacity="0.045" strokeWidth="1" />
          <rect x="186" y="356" width="68" height="68" rx="2" stroke="white" strokeOpacity="0.03" strokeWidth="1" />
        </svg>

        <div className={styles.brand}>
          <img src="/images/logo.png" alt="Metalsider" className={styles.logoImg} />
          <p className={styles.brandTagline}>Gestão de Ordens de Serviço</p>
          <div className={styles.brandDivider} />
          <div className={styles.brandFeatures}>
            <div className={styles.brandFeature}>
              <span className={styles.brandFeatureDot} />
              Controle total de ordens de serviço
            </div>
            <div className={styles.brandFeature}>
              <span className={styles.brandFeatureDot} />
              Analytics e relatórios em tempo real
            </div>
            <div className={styles.brandFeature}>
              <span className={styles.brandFeatureDot} />
              Notificações automáticas por e-mail
            </div>
          </div>
        </div>
        <p className={styles.panelFooter}>© {new Date().getFullYear()} Metalsider</p>
      </aside>

      <main className={styles.formArea}>
        <Suspense fallback={<div className={styles.formWrapper} />}>
          <LoginForm />
        </Suspense>
      </main>
    </div>
  )
}
