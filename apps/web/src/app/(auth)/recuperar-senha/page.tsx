'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { SolicitarRecuperacaoSenhaSchema, RedefinirSenhaSchema } from '@metalsider/shared'
import styles from '../cadastro/page.module.css'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

type Etapa = 1 | 2 | 3

function passwordStrength(senha: string): 'fraca' | 'média' | 'forte' {
  if (senha.length < 8) return 'fraca'
  const temMaiuscula = /[A-Z]/.test(senha)
  const temMinuscula = /[a-z]/.test(senha)
  const temNumero = /\d/.test(senha)
  const temEspecial = /[^A-Za-z0-9]/.test(senha)
  const score = [temMaiuscula, temMinuscula, temNumero, temEspecial].filter(Boolean).length
  if (score >= 4) return 'forte'
  if (score >= 2) return 'média'
  return 'fraca'
}

export default function RecuperarSenhaPage() {
  const router = useRouter()

  const [etapa, setEtapa] = useState<Etapa>(1)

  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')

  const [countdown, setCountdown] = useState(30 * 60)
  const [reenvioDisabled, setReenvioDisabled] = useState(false)
  const [reenvioTimer, setReenvioTimer] = useState(0)

  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (etapa !== 2 && etapa !== 3) return
    if (countdown <= 0) return
    const t = setInterval(() => setCountdown((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [etapa, countdown])

  useEffect(() => {
    if (reenvioTimer <= 0) return
    const t = setInterval(() => setReenvioTimer((c) => c - 1), 1000)
    return () => clearInterval(t)
  }, [reenvioTimer])

  useEffect(() => {
    if (reenvioTimer <= 0) setReenvioDisabled(false)
  }, [reenvioTimer])

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  async function handleEtapa1(e: React.SyntheticEvent) {
    e.preventDefault()
    setErro(null)

    const val = SolicitarRecuperacaoSenhaSchema.safeParse({ email })
    if (!val.success) {
      setErro(val.error.issues.map((i) => i.message).join(' · '))
      return
    }

    setLoading(true)
    try {
      await fetch(`${API_URL}/auth/solicitar-recuperacao-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(val.data),
      })
      // Resposta sempre genérica (D-54) — avançar sem verificar status
      setCountdown(30 * 60)
      setEtapa(2)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleEtapa2(e: React.SyntheticEvent) {
    e.preventDefault()
    setErro(null)
    if (codigo.length !== 6) {
      setErro('Digite os 6 dígitos do código.')
      return
    }
    setEtapa(3)
  }

  async function handleEtapa3(e: React.SyntheticEvent) {
    e.preventDefault()
    setErro(null)

    const val = RedefinirSenhaSchema.safeParse({ email, codigo, senha, confirmar_senha: confirmarSenha })
    if (!val.success) {
      setErro(val.error.issues.map((i) => i.message).join(' · '))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/redefinir-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(val.data),
      })
      const data = (await res.json()) as { detail?: string }

      if (!res.ok) {
        setErro(data.detail ?? 'Código inválido ou expirado. Solicite um novo.')
        setEtapa(2)
        return
      }

      router.push('/login?recuperado=1')
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  async function handleReenviar() {
    if (reenvioDisabled) return
    setReenvioDisabled(true)
    setReenvioTimer(60)
    setErro(null)

    try {
      await fetch(`${API_URL}/auth/solicitar-recuperacao-senha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setCountdown(30 * 60)
    } catch {
      // silencioso
    }
  }

  const forca = passwordStrength(senha)

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <img src="/images/logo.png" alt="Metalsider" className={styles.logo} />
          <h1 className={styles.title}>Recuperar senha</h1>
          <p className={styles.subtitle}>Enviaremos um código para seu e-mail corporativo</p>
        </div>

        {/* Stepper */}
        <div className={styles.stepper}>
          {([1, 2, 3] as const).map((n) => (
            <div key={n} className={styles.stepItem}>
              <div className={`${styles.stepCircle} ${etapa >= n ? styles.stepActive : ''}`}>
                {etapa > n ? '✓' : n}
              </div>
              {n < 3 && <div className={`${styles.stepLine} ${etapa > n ? styles.stepLineActive : ''}`} />}
            </div>
          ))}
        </div>

        {erro && (
          <div className={styles.toast} role="alert">
            {erro}
          </div>
        )}

        {/* Etapa 1 */}
        {etapa === 1 && (
          <form className={styles.form} onSubmit={handleEtapa1} noValidate>
            <div className={styles.field}>
              <label className={styles.label}>E-mail corporativo</label>
              <input
                type="email"
                className={styles.input}
                placeholder="seu@metalsider.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" className={styles.submit} disabled={loading || !email}>
              {loading ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        )}

        {/* Etapa 2 */}
        {etapa === 2 && (
          <form className={styles.form} onSubmit={handleEtapa2} noValidate>
            <p className={styles.infoText}>
              Código enviado para <strong>{email}</strong>.
            </p>

            {countdown > 0 ? (
              <p className={styles.countdown}>Expira em {formatTime(countdown)}</p>
            ) : (
              <p className={styles.countdownExpired}>Código expirado. Reenvie um novo.</p>
            )}

            <div className={styles.field}>
              <label className={styles.label}>Código de 6 dígitos</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                className={`${styles.input} ${styles.codeInput}`}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submit}
              disabled={loading || codigo.length !== 6}
            >
              Validar código
            </button>

            <button
              type="button"
              className={styles.secondary}
              onClick={handleReenviar}
              disabled={reenvioDisabled}
            >
              {reenvioDisabled ? `Reenviar em ${reenvioTimer}s` : 'Reenviar código'}
            </button>
          </form>
        )}

        {/* Etapa 3 */}
        {etapa === 3 && (
          <form className={styles.form} onSubmit={handleEtapa3} noValidate>
            <div className={styles.field}>
              <label className={styles.label}>Nova senha</label>
              <input
                type="password"
                placeholder="Mínimo 8 caracteres"
                className={styles.input}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
                required
              />
              {senha.length > 0 && (
                <div className={styles.strengthBar}>
                  <div className={`${styles.strengthFill} ${styles[`strength_${forca.replace('é', 'e')}`]}`} />
                  <span className={styles.strengthLabel}>Força: {forca}</span>
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Confirmar senha</label>
              <input
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
              disabled={loading || !senha || !confirmarSenha}
            >
              {loading ? 'Redefinindo…' : 'Redefinir senha'}
            </button>
          </form>
        )}

        <p className={styles.loginLink}>
          Lembrou a senha?{' '}
          <a href="/login" className={styles.link}>
            Fazer login
          </a>
        </p>
      </div>
    </div>
  )
}
