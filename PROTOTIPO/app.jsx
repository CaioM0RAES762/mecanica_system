// Main app: routing + role switching
const App = () => {
  const [auth, setAuth] = React.useState(null); // { user, role }
  const [route, setRoute] = React.useState('tickets');
  const [toast, setToast] = React.useState(null);

  const showToast = (msg, kind = 'success') => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  };

  const onLogin = ({ user, role }) => {
    setAuth({ user, role });
    setRoute(role === 'supervisor' ? 'tickets' : 'tickets');
  };
  const onLogout = () => { setAuth(null); setRoute('tickets'); };

  // Route guard: redirect mechanic away from 'new'
  React.useEffect(() => {
    if (auth?.role === 'mechanic' && route === 'new') setRoute('tickets');
  }, [auth, route]);

  if (!auth) {
    return <LoginScreen onLogin={onLogin} />;
  }

  const { user, role } = auth;
  const openCount = OPEN_TICKETS.length;

  const TITLES = {
    dashboard: { title: 'Dashboard de Análise', crumb: 'Operação · Analytics' },
    tickets: { title: 'Chamados em aberto', crumb: 'Operação · Chamados' },
    new: { title: 'Novo Chamado', crumb: 'Operação · Abertura' },
    history: { title: 'Histórico de Chamados', crumb: 'Operação · Consulta' },
    settings: { title: 'Configurações', crumb: 'Conta' },
  };
  const t = TITLES[route];

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} role={role} user={user} openCount={openCount} onLogout={onLogout} />

      <div className="main">
        <TopBar title={t.title} crumb={t.crumb}>
          {route === 'tickets' && role === 'supervisor' && (
            <button className="btn btn-primary btn-sm" onClick={() => setRoute('new')}>
              <Icon name="plus" />Novo Chamado
            </button>
          )}
          {/* Demo role switch */}
          <div className="role-switcher">
            <span className="rs-label">Visualizando como:</span>
            <div className="segmented">
              <button className={role === 'supervisor' ? 'active' : ''} onClick={() => setAuth(a => ({ ...a, user: { ...a.user, name: 'João Silva' }, role: 'supervisor' }))}>
                <Icon name="user-shield" size={13} />Supervisor
              </button>
              <button className={role === 'mechanic' ? 'active' : ''} onClick={() => setAuth(a => ({ ...a, user: { ...a.user, name: 'Pedro Mota' }, role: 'mechanic' }))}>
                <Icon name="tool" size={13} />Mecânico
              </button>
            </div>
          </div>
          <button className="icon-btn"><Icon name="bell" /></button>
          <button className="icon-btn"><Icon name="help-circle" /></button>
        </TopBar>

        <div className="content">
          {route === 'dashboard' && <DashboardScreen user={user} onToast={showToast} />}
          {route === 'tickets' && <TicketsScreen user={user} role={role} onToast={showToast} />}
          {route === 'new' && role === 'supervisor' && <NewTicketScreen user={user} onToast={showToast} />}
          {route === 'history' && <HistoryScreen user={user} role={role} onToast={showToast} />}
          {route === 'settings' && (
            <div className="empty-state" style={{ marginTop: 40 }}>
              <Icon name="settings" size={36} />
              <h3>Configurações</h3>
              <p>Tela de configurações fora do escopo deste protótipo.</p>
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.kind === 'error' ? 'toast-error' : ''}`}
             style={{ background: toast.kind === 'error' ? 'var(--red-500)' : 'var(--green-500)' }}>
          <Icon name={toast.kind === 'error' ? 'alert-circle' : 'circle-check'} />
          {toast.msg}
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
