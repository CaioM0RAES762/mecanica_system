// Screen 1: Login / Register
const { useState } = React;

const LoginScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState('supervisor');
  const [email, setEmail] = useState('joao.silva@metalsider.com.br');
  const [pw, setPw] = useState('••••••••••');
  const [name, setName] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [hoverRole, setHoverRole] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    const user = mode === 'login'
      ? { name: role === 'supervisor' ? 'João Silva' : 'Pedro Mota', email }
      : { name: name || 'Novo Usuário', email };
    onLogin({ user, role });
  };

  return (
    <div className="login-wrap">
      {/* LEFT panel — navy */}
      <div className="login-left">
        <div className="login-brand">
          <div className="logo-mark logo-mark-lg">M</div>
          <div>
            <div className="brand-name">Metalsider</div>
            <div className="brand-tag">Gestão de Ordens de Serviço</div>
          </div>
        </div>

        <div className="login-hero">
          <div className="hero-eyebrow">Plataforma de oficina industrial</div>
          <h2 className="hero-title">
            Cada chamado,<br/>
            <span className="amber">cada minuto,</span><br/>
            sob controle.
          </h2>
          <p className="hero-sub">
            Abertura, acompanhamento e fechamento de ordens de serviço para
            equipes de manutenção mecânica — feito para o chão da oficina.
          </p>
        </div>

        {/* Industrial pattern + stats */}
        <div className="login-stats">
          <div className="stat"><div className="stat-num">3.4k</div><div className="stat-label">Chamados / mês</div></div>
          <div className="stat-divider"></div>
          <div className="stat"><div className="stat-num">94<span>%</span></div><div className="stat-label">SLA cumprido</div></div>
          <div className="stat-divider"></div>
          <div className="stat"><div className="stat-num">12</div><div className="stat-label">Oficinas conectadas</div></div>
        </div>

        <div className="login-pattern" aria-hidden="true">
          <svg width="100%" height="100%" viewBox="0 0 400 240" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="400" height="240" fill="url(#grid)" />
            <circle cx="340" cy="60" r="80" fill="none" stroke="rgba(232,160,32,0.15)" strokeWidth="1" strokeDasharray="3 4"/>
            <circle cx="340" cy="60" r="48" fill="none" stroke="rgba(29,111,232,0.2)" strokeWidth="1"/>
            <circle cx="340" cy="60" r="6" fill="rgba(232,160,32,0.5)"/>
          </svg>
        </div>
      </div>

      {/* RIGHT panel — form */}
      <div className="login-right">
        <div className="login-form-top">
          <div className="logo-mark" style={{ width: 36, height: 36, fontSize: 16 }}>M</div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
          </button>
        </div>

        <form className="login-form" onSubmit={submit}>
          <div className="form-head">
            <h1>{mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}</h1>
            <p>{mode === 'login'
              ? 'Acesse o sistema de gestão de ordens de serviço.'
              : 'Cadastre-se para abrir e acompanhar chamados.'}</p>
          </div>

          {mode === 'register' && (
            <div className="field">
              <label>Nome completo <span className="req">*</span></label>
              <div className="input-wrap">
                <Icon name="user" className="lead" />
                <input className="input with-icon" value={name} onChange={e => setName(e.target.value)} placeholder="Ex.: Pedro Mota" />
              </div>
            </div>
          )}

          <div className="field">
            <label>E-mail <span className="req">*</span></label>
            <div className="input-wrap">
              <Icon name="mail" className="lead" />
              <input className="input with-icon" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@metalsider.com.br" />
            </div>
          </div>

          <div className="field">
            <label>Senha <span className="req">*</span></label>
            <div className="input-wrap">
              <Icon name="lock" className="lead" />
              <input className="input with-icon" type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••" />
              <i className={`ti ti-${showPw ? 'eye-off' : 'eye'} trail`} onClick={() => setShowPw(!showPw)}></i>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div className="field">
                <label>Confirme a senha <span className="req">*</span></label>
                <div className="input-wrap">
                  <Icon name="lock-check" className="lead" />
                  <input className="input with-icon" type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="••••••••" />
                </div>
              </div>

              <div className="field">
                <label>Tipo de conta <span className="req">*</span></label>
                <div className="role-toggle">
                  <button
                    type="button"
                    className={`role-opt ${role === 'supervisor' ? 'active' : ''}`}
                    onClick={() => setRole('supervisor')}
                    onMouseEnter={() => setHoverRole('supervisor')}
                    onMouseLeave={() => setHoverRole(null)}
                  >
                    <Icon name="user-shield" />
                    <div>
                      <div className="role-name">Supervisor</div>
                      <div className="role-sub">Abre e gerencia chamados</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`role-opt ${role === 'mechanic' ? 'active' : ''}`}
                    onClick={() => setRole('mechanic')}
                    onMouseEnter={() => setHoverRole('mechanic')}
                    onMouseLeave={() => setHoverRole(null)}
                  >
                    <Icon name="tool" />
                    <div>
                      <div className="role-name">Mecânico</div>
                      <div className="role-sub">Executa e fecha chamados</div>
                    </div>
                  </button>
                </div>
                {hoverRole && (
                  <div className="role-tooltip">
                    {hoverRole === 'supervisor'
                      ? 'Pode abrir novos chamados, atribuir mecânicos, definir prazos e visualizar todos os relatórios.'
                      : 'Visualiza apenas os chamados atribuídos e os abertos pela equipe, com foco no fechamento rápido.'}
                  </div>
                )}
              </div>
            </>
          )}

          {mode === 'login' && (
            <div className="field">
              <label>Entrar como</label>
              <div className="role-toggle">
                <button type="button" className={`role-opt sm ${role === 'supervisor' ? 'active' : ''}`} onClick={() => setRole('supervisor')}>
                  <Icon name="user-shield" />
                  <div className="role-name">Supervisor</div>
                </button>
                <button type="button" className={`role-opt sm ${role === 'mechanic' ? 'active' : ''}`} onClick={() => setRole('mechanic')}>
                  <Icon name="tool" />
                  <div className="role-name">Mecânico</div>
                </button>
              </div>
              <div className="hint">Demo — escolha o perfil para entrar no sistema.</div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg btn-full" style={{ marginTop: 8 }}>
            {mode === 'login' ? 'Entrar' : 'Cadastrar'}
            <Icon name="arrow-right" />
          </button>

          {mode === 'login' && (
            <div style={{ textAlign: 'center', marginTop: 4 }}>
              <a href="#" onClick={e => e.preventDefault()} style={{ fontSize: 13, color: 'var(--gray-500)' }}>Esqueci minha senha</a>
            </div>
          )}
        </form>

        <div className="login-footer">
          © 2026 Metalsider Sistemas Industriais · v2.4.1
        </div>
      </div>
    </div>
  );
};

window.LoginScreen = LoginScreen;
