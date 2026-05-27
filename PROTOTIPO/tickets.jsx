// Screen 3: Active Tickets / Mechanic Workspace
const TicketsScreen = ({ user, role, onClose, onToast }) => {
  const [search, setSearch] = React.useState('');
  const [priority, setPriority] = React.useState('');
  const [category, setCategory] = React.useState('');
  const [scope, setScope] = React.useState(role === 'mechanic' ? 'mine' : 'all');
  const [sort, setSort] = React.useState('newest');
  const [closing, setClosing] = React.useState(null);
  const [closedIds, setClosedIds] = React.useState([]);

  const tickets = OPEN_TICKETS.filter(t => !closedIds.includes(t.id))
    .filter(t => {
      if (scope === 'mine' && t.mechanic !== user.name) return false;
      if (priority && t.priority !== priority) return false;
      if (category && t.category !== category) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!t.title.toLowerCase().includes(s) && !t.id.includes(s)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sort === 'newest') return a.openedHoursAgo - b.openedHoursAgo;
      if (sort === 'deadline') return (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0);
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return order[a.priority] - order[b.priority];
    });

  const handleClose = (data) => {
    setClosedIds(prev => [...prev, closing.id]);
    onToast(`Chamado #${closing.id} fechado como "${data.resolution}".`, 'success');
    setClosing(null);
  };

  return (
    <div className="screen-enter tickets">
      {/* Sticky filter bar */}
      <div className="ticket-filterbar">
        <div className="filter-search">
          <Icon name="search" size={16} />
          <input placeholder="Buscar por ID ou título…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="filter-clear" onClick={() => setSearch('')}><Icon name="x" size={14} /></button>}
        </div>

        <div className="filter-divider"></div>

        <select className="select filter-select" value={priority} onChange={e => setPriority(e.target.value)}>
          <option value="">Prioridade: Todas</option>
          {['critical','high','medium','low'].map(p => <option key={p} value={p}>Prioridade: {PRIORITY_LABEL[p]}</option>)}
        </select>

        <select className="select filter-select" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Categoria: Todas</option>
          {Object.entries(CATEGORY_LABEL).map(([k,v]) => <option key={k} value={k}>Categoria: {v}</option>)}
        </select>

        <div className="segmented">
          <button className={scope === 'mine' ? 'active' : ''} onClick={() => setScope('mine')}>Atribuídos a mim</button>
          <button className={scope === 'all' ? 'active' : ''} onClick={() => setScope('all')}>Todos</button>
        </div>

        <div className="filter-divider"></div>

        <div className="sort-group">
          <span className="sort-label">Ordenar:</span>
          {[
            { id: 'newest', label: 'Mais recentes' },
            { id: 'deadline', label: 'Prazo' },
            { id: 'priority', label: 'Prioridade' },
          ].map(o => (
            <button key={o.id} className={`sort-btn ${sort === o.id ? 'active' : ''}`} onClick={() => setSort(o.id)}>{o.label}</button>
          ))}
        </div>

        <div className="spacer"></div>

        <div className="count-badge">
          <span className="dot" style={{ background: 'var(--blue-500)' }}></span>
          <strong>{tickets.length}</strong>&nbsp;chamados em aberto
        </div>
      </div>

      {/* Cards grid */}
      {tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-illo">
            <svg width="160" height="120" viewBox="0 0 160 120" fill="none">
              <rect x="20" y="30" width="120" height="76" rx="10" fill="#eaf2fd" stroke="#1D6FE8" strokeWidth="1.5"/>
              <rect x="34" y="46" width="60" height="6" rx="3" fill="#1D6FE8" opacity="0.4"/>
              <rect x="34" y="60" width="92" height="4" rx="2" fill="#1D6FE8" opacity="0.2"/>
              <rect x="34" y="72" width="80" height="4" rx="2" fill="#1D6FE8" opacity="0.2"/>
              <rect x="34" y="84" width="50" height="4" rx="2" fill="#1D6FE8" opacity="0.2"/>
              <circle cx="124" cy="34" r="14" fill="#1D9E75"/>
              <path d="M118 34l4 4 8-8" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h3>Nenhum chamado em aberto no momento</h3>
          <p>Todos os chamados que atendem aos filtros já foram resolvidos. Bom trabalho!</p>
        </div>
      ) : (
        <div className="tickets-grid">
          {tickets.map(t => (
            <TicketCard key={t.id} t={t} onClose={() => setClosing(t)} role={role} />
          ))}
        </div>
      )}

      {closing && (
        <CloseTicketModal ticket={closing} onCancel={() => setClosing(null)} onConfirm={handleClose} />
      )}
    </div>
  );
};

// ----- Ticket card -----
const TicketCard = ({ t, onClose }) => (
  <div className={`ticket-card ${t.overdue ? 'overdue' : ''}`}>
    {t.overdue && <div className="overdue-stripe"></div>}
    <div className="ticket-head">
      <div className="ticket-id mono">#{t.id}</div>
      <PriorityBadge p={t.priority} />
      <CategoryTag c={t.category} />
      <div className="spacer"></div>
      {t.overdue && (
        <span className="badge badge-amber">
          <Icon name="alert-triangle-filled" size={11} />&nbsp;Atrasado 1 dia
        </span>
      )}
    </div>

    <h3 className="ticket-title">{t.title}</h3>

    <div className="ticket-info">
      <div className="info-item">
        <Icon name="truck" size={14} /> <span>{t.vehicle}</span>
      </div>
      <div className="info-item">
        <Icon name="user" size={14} /><AvatarRow name={t.mechanic} />
      </div>
    </div>

    <div className="ticket-divider"></div>

    <div className="ticket-foot">
      <div className="foot-meta">
        <div className="meta-line">
          <span className="muted">Aberto por</span>
          <strong>{t.supervisor}</strong>
          <span className="muted">· {t.openedAt}</span>
        </div>
        <div className={`time-line ${t.overdue ? 'late' : ''}`}>
          {t.overdue
            ? <><Icon name="alert-triangle" size={14} /> Atrasado · prazo era {t.deadline}</>
            : <><Icon name="clock" size={14} /> Aberto há {t.openedHoursAgo}h · prazo {t.deadline}</>
          }
        </div>
      </div>

      {t.progress > 0 && (
        <div className="progress-wrap" title={`${t.progress}% concluído`}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: t.progress + '%' }}></div>
          </div>
          <div className="progress-label">{t.progress}%</div>
        </div>
      )}
    </div>

    <div className="ticket-actions">
      <button className="btn btn-ghost btn-sm">
        <Icon name="eye" />Ver detalhes
      </button>
      <button className="btn btn-primary close-btn" onClick={onClose}>
        <Icon name="circle-check" />Fechar Chamado
      </button>
    </div>
  </div>
);

// ----- Close ticket modal -----
const CloseTicketModal = ({ ticket, onCancel, onConfirm }) => {
  const [resolution, setResolution] = React.useState(null);
  const [note, setNote] = React.useState('');
  const [hours, setHours] = React.useState(4);
  const [obs, setObs] = React.useState('');

  const resOptions = [
    { id: 'completed', label: 'Concluído', icon: 'circle-check-filled', color: 'var(--green-500)', bg: 'var(--green-50)' },
    { id: 'partial', label: 'Parcial', icon: 'progress', color: '#b87b15', bg: 'var(--amber-50)' },
    { id: 'unresolved', label: 'Não resolvido', icon: 'circle-x-filled', color: 'var(--red-500)', bg: 'var(--red-50)' },
  ];

  const submit = () => {
    if (!resolution) return;
    onConfirm({ resolution: resOptions.find(r => r.id === resolution).label, note, hours, obs });
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal close-modal" onClick={e => e.stopPropagation()}>
        <div className="close-modal-head">
          <div>
            <div className="modal-eyebrow">Fechamento de chamado · <span className="mono">#{ticket.id}</span></div>
            <h2 className="modal-title">{ticket.title}</h2>
            <div className="modal-meta">
              <CategoryTag c={ticket.category} />
              <PriorityBadge p={ticket.priority} />
              <span className="muted">· {ticket.vehicle}</span>
            </div>
          </div>
          <button className="icon-btn" onClick={onCancel}><Icon name="x" /></button>
        </div>

        <div className="close-modal-body">
          <div className="field">
            <label>Qual o resultado do atendimento? <span className="req">*</span></label>
            <div className="resolution-grid">
              {resOptions.map(opt => (
                <button key={opt.id}
                  className={`res-opt ${resolution === opt.id ? 'active' : ''}`}
                  style={{ '--c': opt.color, '--bg': opt.bg }}
                  onClick={() => setResolution(opt.id)}>
                  <Icon name={opt.icon} size={28} />
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="hint">Selecionar uma opção é suficiente para fechar — os campos abaixo são opcionais.</div>
          </div>

          <div className="field">
            <label>Resolução <span className="muted">(opcional)</span></label>
            <textarea className="textarea" rows="2" maxLength={280}
              placeholder="Descreva brevemente o que foi feito…"
              value={note} onChange={e => setNote(e.target.value)} />
            <div className="char-count">{note.length}/280</div>
          </div>

          <div className="form-grid" style={{ marginTop: 0 }}>
            <div className="field">
              <label>Horas trabalhadas <span className="muted">(opcional)</span></label>
              <div className="input-wrap">
                <Icon name="clock" className="lead" />
                <input type="number" className="input with-icon" min="0" step="0.5" value={hours} onChange={e => setHours(+e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>Observações adicionais <span className="muted">(opcional)</span></label>
              <input className="input" placeholder="Notas, peças, próximos passos…"
                value={obs} onChange={e => setObs(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="close-modal-foot">
          <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
          <button className={`btn btn-success btn-lg ${!resolution ? 'disabled' : ''}`}
            disabled={!resolution}
            style={{ opacity: resolution ? 1 : 0.5 }}
            onClick={submit}>
            <Icon name="circle-check" />Confirmar fechamento
          </button>
        </div>
      </div>
    </div>
  );
};

window.TicketsScreen = TicketsScreen;
