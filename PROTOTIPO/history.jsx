// Screen 4: Ticket History / Query
const HistoryScreen = ({ user, role, onToast }) => {
  const [filtersOpen, setFiltersOpen] = React.useState(true);
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [priorityFilters, setPriorityFilters] = React.useState([]);
  const [categoryFilters, setCategoryFilters] = React.useState([]);
  const [from, setFrom] = React.useState('2026-05-08');
  const [to, setTo] = React.useState('2026-05-14');
  const [selectedMech, setSelectedMech] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [perPage, setPerPage] = React.useState(10);
  const [drawer, setDrawer] = React.useState(null);

  const togglePrio = (p) => setPriorityFilters(f => f.includes(p) ? f.filter(x => x !== p) : [...f, p]);
  const toggleCat = (c) => setCategoryFilters(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);

  let rows = HISTORY_TICKETS;
  if (statusFilter !== 'all') rows = rows.filter(t => statusFilter === 'open' ? t.status !== 'closed' : t.status === 'closed');
  if (priorityFilters.length) rows = rows.filter(t => priorityFilters.includes(t.priority));
  if (categoryFilters.length) rows = rows.filter(t => categoryFilters.includes(t.category));
  if (selectedMech) rows = rows.filter(t => t.mechanic === selectedMech);

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  const paged = rows.slice((page - 1) * perPage, page * perPage);

  const clearAll = () => { setStatusFilter('all'); setPriorityFilters([]); setCategoryFilters([]); setSelectedMech(''); };

  return (
    <div className="screen-enter history">
      {/* Top action bar */}
      <div className="history-top">
        <div>
          <h2 className="history-title">Histórico de Chamados</h2>
          <p className="history-sub">{total} resultados encontrados · período {new Date(from).toLocaleDateString('pt-BR')} – {new Date(to).toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="history-actions">
          <button className="btn btn-secondary btn-sm" onClick={() => setFiltersOpen(!filtersOpen)}>
            <Icon name={filtersOpen ? 'layout-sidebar-left-collapse' : 'layout-sidebar-left-expand'} />
            {filtersOpen ? 'Ocultar filtros' : 'Filtros'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onToast('CSV exportado com sucesso.', 'success')}>
            <Icon name="file-spreadsheet" />Exportar CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => onToast('PDF exportado com sucesso.', 'success')}>
            <Icon name="file-type-pdf" />Exportar PDF
          </button>
        </div>
      </div>

      <div className={`history-grid ${filtersOpen ? '' : 'no-filters'}`}>
        {filtersOpen && (
          <aside className="filter-panel">
            <div className="fp-section">
              <div className="fp-title">Período</div>
              <div className="field" style={{ gap: 8 }}>
                <input type="date" className="input" value={from} onChange={e => setFrom(e.target.value)} />
                <input type="date" className="input" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </div>

            <div className="fp-section">
              <div className="fp-title">Status</div>
              <div className="segmented full">
                <button className={statusFilter === 'open' ? 'active' : ''} onClick={() => setStatusFilter('open')}>Abertos</button>
                <button className={statusFilter === 'closed' ? 'active' : ''} onClick={() => setStatusFilter('closed')}>Fechados</button>
                <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>Todos</button>
              </div>
            </div>

            <div className="fp-section">
              <div className="fp-title">Prioridade</div>
              <div className="fp-checks">
                {['critical','high','medium','low'].map(p => (
                  <label key={p} className="checkbox">
                    <input type="checkbox" checked={priorityFilters.includes(p)} onChange={() => togglePrio(p)} />
                    <PriorityBadge p={p} />
                  </label>
                ))}
              </div>
            </div>

            <div className="fp-section">
              <div className="fp-title">Categoria</div>
              <div className="fp-checks">
                {Object.entries(CATEGORY_LABEL).map(([k, v]) => (
                  <label key={k} className="checkbox">
                    <input type="checkbox" checked={categoryFilters.includes(k)} onChange={() => toggleCat(k)} />
                    <CategoryTag c={k} />
                  </label>
                ))}
              </div>
            </div>

            <div className="fp-section">
              <div className="fp-title">Mecânico</div>
              <select className="select" value={selectedMech} onChange={e => setSelectedMech(e.target.value)}>
                <option value="">Todos</option>
                {MECHANICS.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>

            <div className="fp-section">
              <div className="fp-title">Supervisor</div>
              <select className="select">
                <option value="">Todos</option>
                {SUPERVISORS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>

            <div className="fp-foot">
              <button className="btn btn-primary btn-sm btn-full">Aplicar filtros</button>
              <button className="btn btn-ghost btn-sm btn-full" onClick={clearAll}>Limpar</button>
            </div>
          </aside>
        )}

        <div className="history-table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>Título</th>
                <th>Categoria</th>
                <th>Prioridade</th>
                <th>Mecânico</th>
                <th>Aberto por</th>
                <th>Abertura</th>
                <th>Fechamento</th>
                <th>Duração</th>
                <th>Status</th>
                <th className="actions"></th>
              </tr>
            </thead>
            <tbody>
              {paged.map((t, i) => (
                <tr key={t.id} onClick={() => setDrawer(t)} className="row">
                  <td className="num mono">#{t.id}</td>
                  <td className="title-cell"><span>{t.title}</span></td>
                  <td><CategoryTag c={t.category} /></td>
                  <td><PriorityBadge p={t.priority} /></td>
                  <td><AvatarRow name={t.mechanic} /></td>
                  <td className="muted">{t.supervisor}</td>
                  <td className="muted">{t.openedAt}</td>
                  <td className="muted">{t.closedAt || '—'}</td>
                  <td className="duration">{t.duration || '—'}</td>
                  <td><StatusBadge s={t.status} /></td>
                  <td className="actions" onClick={e => e.stopPropagation()}>
                    <button className="icon-btn" onClick={() => setDrawer(t)} title="Ver detalhes"><Icon name="eye" /></button>
                    <button className="icon-btn" title="Exportar"><Icon name="download" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <div className="page-info">
              Mostrando <strong>{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)}</strong> de <strong>{total}</strong>
            </div>
            <div className="spacer"></div>
            <div className="per-page">
              <span className="muted">Por página:</span>
              {[10, 25, 50].map(n => (
                <button key={n} className={`pp-btn ${perPage === n ? 'active' : ''}`} onClick={() => { setPerPage(n); setPage(1); }}>{n}</button>
              ))}
            </div>
            <div className="page-nav">
              <button className="icon-btn" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}><Icon name="chevron-left" /></button>
              <span className="page-num">Página <strong>{page}</strong> de {pages}</span>
              <button className="icon-btn" disabled={page === pages} onClick={() => setPage(p => Math.min(pages, p + 1))}><Icon name="chevron-right" /></button>
            </div>
          </div>
        </div>
      </div>

      {drawer && <HistoryDrawer ticket={drawer} onClose={() => setDrawer(null)} />}
    </div>
  );
};

// ---------- History detail drawer ----------
const HistoryDrawer = ({ ticket, onClose }) => {
  const isClosed = ticket.status === 'closed';
  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}></div>
      <div className="drawer history-drawer">
        <div className="drawer-head">
          <div>
            <div className="modal-eyebrow"><span className="mono">#{ticket.id}</span> · {isClosed ? 'Chamado fechado' : 'Chamado em aberto'}</div>
            <h2 className="drawer-title">{ticket.title}</h2>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="x" /></button>
        </div>

        <div className="drawer-body">
          <div className="drawer-badges">
            <CategoryTag c={ticket.category} />
            <PriorityBadge p={ticket.priority} />
            <StatusBadge s={ticket.status} />
          </div>

          <div className="drawer-section">
            <div className="ds-title">Detalhes</div>
            <div className="ds-grid">
              <div><span className="muted">Veículo</span><strong>{ticket.vehicle}</strong></div>
              <div><span className="muted">Mecânico</span><AvatarRow name={ticket.mechanic} /></div>
              <div><span className="muted">Aberto por</span><strong>{ticket.supervisor}</strong></div>
              <div><span className="muted">Duração</span><strong>{ticket.duration || 'Em andamento'}</strong></div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="ds-title">Linha do tempo</div>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-dot blue"></div>
                <div className="tl-content">
                  <div className="tl-line"><strong>Aberto por {ticket.supervisor}</strong></div>
                  <div className="tl-meta">{ticket.openedAt}</div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot amber"></div>
                <div className="tl-content">
                  <div className="tl-line"><strong>Atribuído a {ticket.mechanic}</strong></div>
                  <div className="tl-meta">Notificação enviada ao celular do mecânico</div>
                </div>
              </div>
              {isClosed && (
                <div className="tl-item">
                  <div className="tl-dot green"></div>
                  <div className="tl-content">
                    <div className="tl-line"><strong>Fechado por {ticket.mechanic}</strong></div>
                    <div className="tl-meta">{ticket.closedAt} · Resolução: Concluído</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="drawer-section">
            <div className="ds-title">Resolução</div>
            <div className="ds-text">
              {isClosed
                ? 'Substituição completa da peça com defeito, teste de rodagem por 30 minutos e validação dos sistemas auxiliares. Cliente notificado e veículo liberado.'
                : <span className="muted">Aguardando fechamento — chamado ainda está em andamento.</span>}
            </div>
          </div>

          <div className="drawer-section">
            <div className="ds-title">Observações adicionais</div>
            <div className="ds-text">
              {isClosed
                ? 'Recomendamos nova inspeção em 5.000 km para validar o reparo.'
                : <span className="muted">—</span>}
            </div>
          </div>

          <div className="drawer-section">
            <div className="ds-title">Anexos</div>
            <div className="attachments">
              <div className="attach"><Icon name="photo" /><div><div className="att-name">diagnostico_inicial.jpg</div><div className="muted">1.2 MB</div></div></div>
              <div className="attach"><Icon name="file-type-pdf" /><div><div className="att-name">checklist_servico.pdf</div><div className="muted">340 KB</div></div></div>
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn btn-secondary btn-sm"><Icon name="download" />Exportar PDF</button>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </>
  );
};

window.HistoryScreen = HistoryScreen;
