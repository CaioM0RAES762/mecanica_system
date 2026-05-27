import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Ativar Conta',
}

export default function AtivarContaPage() {
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

        {/* Formulário implementado na Sprint 4 */}
        <form className={styles.form}>
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
              disabled
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
              disabled
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
              disabled
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
              disabled
            />
          </div>

          <button type="submit" className={styles.submit} disabled>
            Ativar conta — Sprint 4
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
