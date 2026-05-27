import type { Metadata } from 'next'
import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Entrar',
}

export default function LoginPage() {
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
                autoComplete="email"
                placeholder="seu@metalsider.com.br"
                className={styles.input}
                disabled
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
                disabled
              />
            </div>

            <button type="submit" className={styles.submit} disabled>
              Entrar — Sprint 4
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
