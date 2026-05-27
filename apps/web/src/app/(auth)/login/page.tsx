'use client'

import type { Metadata } from 'next'
import { useState, type FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { LoginSchema } from '@metalsider/shared'
import styles from './page.module.css'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroTipo, setErroTipo] = useState<'error' | 'warning'>('error')

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
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
    <div className={styles.container}>
      <aside className={styles.panel}>
        <div className={styles.brand}>
          <span className={styles.logo}>M</span>
          <h1 className={styles.brandName}>Metalsider</h1>
          <p className={styles.brandTagline}>Gestão de Ordens de Serviço</p>
        </div>
      </aside>

      <main className={styles.formArea}>
        <div className={styles.formWrapper}>
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
              <label htmlFor="password" className={styles.label}>
                Senha
              </label>
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
            <a href="/ativar-conta" className={styles.link}>
              Ativar minha conta
            </a>
          </p>
        </div>
      </main>
    </div>
  )
}
