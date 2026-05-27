'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AtivarContaSchema } from '@metalsider/shared'
import styles from './page.module.css'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

export default function AtivarContaPage() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    setLoading(true)

    const validacao = AtivarContaSchema.safeParse({ email, codigo, senha, confirmar_senha: confirmarSenha })
    if (!validacao.success) {
      const msgs = validacao.error.issues.map((i) => i.message).join(' · ')
      setErro(msgs)
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/auth/ativar-conta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validacao.data),
      })

      const data = (await res.json()) as { detail?: string; message?: string }

      if (!res.ok) {
        if (res.status === 410) {
          setErro('Código de verificação expirado. Solicite um novo ao administrador.')
        } else if (res.status === 409) {
          setErro('Conta já está ativa. Acesse o login.')
        } else {
          setErro(data.detail ?? 'Código inválido. Verifique e tente novamente.')
        }
        setLoading(false)
        return
      }

      setSucesso(true)
      setTimeout(() => router.push('/login?ativado=1'), 2000)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.logo}>✓</span>
            <h1 className={styles.title}>Conta ativada!</h1>
            <p className={styles.subtitle}>Redirecionando para o login…</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.logo}>M</span>
          <h1 className={styles.title}>Ativar conta</h1>
          <p className={styles.subtitle}>
            Insira o código de 6 dígitos recebido no seu e-mail corporativo
          </p>
        </div>

        {erro && (
          <div className={styles.toast} role="alert">
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
              placeholder="seu@metalsider.com.br"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="codigo" className={styles.label}>
              Código de verificação
            </label>
            <input
              id="codigo"
              name="codigo"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              className={`${styles.input} ${styles.inputCode}`}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={loading}
              required
            />
            <span className={styles.codeHint}>Expira em 30 minutos</span>
          </div>

          <div className={styles.field}>
            <label htmlFor="senha" className={styles.label}>
              Nova senha
            </label>
            <input
              id="senha"
              name="senha"
              type="password"
              placeholder="Mínimo 8 caracteres"
              className={styles.input}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmar_senha" className={styles.label}>
              Confirmar senha
            </label>
            <input
              id="confirmar_senha"
              name="confirmar_senha"
              type="password"
              placeholder="Repita a senha"
              className={styles.input}
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className={styles.submit}
            disabled={loading || !email || !codigo || !senha || !confirmarSenha}
          >
            {loading ? 'Ativando…' : 'Ativar conta'}
          </button>
        </form>

        <p className={styles.loginLink}>
          Já tem acesso?{' '}
          <a href="/login" className={styles.link}>
            Fazer login
          </a>
        </p>
      </div>
    </div>
  )
}
