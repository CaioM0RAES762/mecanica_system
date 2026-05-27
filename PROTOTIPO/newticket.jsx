// Screen 2: Open New Service Ticket (Supervisor)
const NewTicketScreen = ({ user, onToast }) => {
  const [form, setForm] = React.useState({
    title: '', category: '', priority: 'medium', vehicle: '', mechanicId: '',
    startDate: '2026-05-14', duration: 4, durationUnit: 'hours', deadline: '2026-05-15',
    description: '', internalNotes: '',
  });
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const mech = MECHANICS.find(m => m.id === form.mechanicId);
  const vehObj = VEHICLES.find(v => v.id === form.vehicle);

  const submit = () => {
    if (!form.title || !form.category || !form.mechanicId) {
      onToast('Preencha título, categoria e mecânico para abrir o chamado.', 'error');
      return;
    }
    onToast('Chamado #0043 aberto com sucesso e atribuído.', 'success');
  };

  return (
    <div className="screen-enter newticket">
      <div className="newticket-grid">
        <div className="newticket-form">
          {/* Section 1 */}
          <div className="card card-pad">
            <div className="card-section">
              <h3 className="section-title">Identificação do serviço</h3>
              <p className="section-sub">Informações que aparecem no card do chamado.</p>
            </div>
            <div className="form-grid">
              <div className="field span-2">
                <label>Título do chamado <span className="req">*</span></label>
                <input className="input" placeholder="Ex.: Vazamento de óleo na caixa de transmissão"
                  value={form.title} onChange={e => update('title', e.target.value)} />
              </div>

              <div className="field">
                <label>Categoria <span className="req">*</span></label>
                <select className="select" value={form.category} onChange={e => update('category', e.target.value)}>
                  <option value="">Selecione…</option>
                  {Object.entries(CATEGORY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              <div className="field">
                <label>Prioridade <span className="req">*</span></label>
                <div className="prio-seg">
                  {['low', 'medium', 'high', 'critical'].map(p => (
                    <button key={p} type="button"
                      className={`prio-opt prio-${p} ${form.priority === p ? 'active' : ''}`}
                      onClick={() => update('priority', p)}>
                      <span className="dot"></span>{PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label>Veículo / Ativo <span className="req">*</span></label>
                <div className="input-wrap">
                  <Icon name="truck" className="lead" />
                  <select className="select with-icon" value={form.vehicle} onChange={e => update('vehicle', e.target.value)} style={{ paddingLeft: 36 }}>
                    <option value="">Buscar veículo…</option>
                    {VEHICLES.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Mecânico responsável <span className="req">*</span></label>
                <div className="input-wrap">
                  <Icon name="search" className="lead" />
                  <select className="select with-icon" value={form.mechanicId} onChange={e => update('mechanicId', e.target.value)} style={{ paddingLeft: 36 }}>
                    <option value="">Atribuir a um mecânico…</option>
                    {MECHANICS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2 */}
          <div className="card card-pad">
            <div className="card-section">
              <h3 className="section-title">Programação</h3>
              <p className="section-sub">Quando o serviço deve iniciar e qual o prazo final.</p>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Início previsto</label>
                <div className="input-wrap">
                  <Icon name="calendar" className="lead" />
                  <input type="date" className="input with-icon" value={form.startDate} onChange={e => update('startDate', e.target.value)} />
                </div>
              </div>
              <div className="field">
                <label>Duração estimada</label>
                <div className="duration-row">
                  <input type="number" className="input" min="1" value={form.duration} onChange={e => update('duration', +e.target.value)} />
                  <div className="segmented">
                    <button type="button" className={form.durationUnit === 'hours' ? 'active' : ''} onClick={() => update('durationUnit', 'hours')}>horas</button>
                    <button type="button" className={form.durationUnit === 'days' ? 'active' : ''} onClick={() => update('durationUnit', 'days')}>dias</button>
                  </div>
                </div>
              </div>
              <div className="field">
                <label>Prazo final</label>
                <div className="input-wrap">
                  <Icon name="flag" className="lead" />
                  <input type="date" className="input with-icon" value={form.deadline} onChange={e => update('deadline', e.target.value)} />
                </div>
                <div className="hint">Calculado automaticamente — você pode ajustar.</div>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div className="card card-pad">
            <div className="card-section">
              <h3 className="section-title">Descrição & anexos</h3>
              <p className="section-sub">Detalhes técnicos e arquivos de apoio (opcional).</p>
            </div>
            <div className="form-grid">
              <div className="field span-2">
                <label>Descrição detalhada</label>
                <textarea className="textarea" rows="4"
                  placeholder="Sintomas, peças envolvidas, histórico relevante, instruções específicas…"
                  value={form.description} onChange={e => update('description', e.target.value)} />
              </div>

              <div className="field span-2">
                <label>Anexos</label>
                <div className="dropzone">
                  <Icon name="cloud-upload" size={26} />
                  <div className="dz-text">
                    <strong>Arraste arquivos aqui</strong> ou clique para selecionar
                    <div className="hint">Imagens (JPG, PNG) e PDFs até 10MB cada</div>
                  </div>
                </div>
              </div>

              <div className="field span-2">
                <label>
                  Notas internas
                  <span className="badge badge-amber" style={{ marginLeft: 8, padding: '2px 6px', fontSize: 10 }}>
                    <Icon name="eye-off" size={11} />&nbsp;Apenas supervisores
                  </span>
                </label>
                <textarea className="textarea" rows="3"
                  placeholder="Observações restritas ao time de supervisão (não visíveis ao mecânico)…"
                  value={form.internalNotes} onChange={e => update('internalNotes', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Section 4: Actions */}
          <div className="newticket-actions">
            <button type="button" className="btn btn-ghost">
              <Icon name="device-floppy" />Salvar rascunho
            </button>
            <button type="button" className="btn btn-secondary">Limpar formulário</button>
            <button type="button" className="btn btn-primary btn-lg" onClick={submit} style={{ marginLeft: 'auto' }}>
              <Icon name="send" />Abrir Chamado
            </button>
          </div>
        </div>

        {/* Sticky preview sidebar */}
        <aside className="newticket-preview">
          <div className="preview-card">
            <div className="preview-eyebrow">
              <Icon name="eye" size={14} />Pré-visualização ao vivo
            </div>

            <div className="preview-id">
              <span className="mono">#0043</span>
              <PriorityBadge p={form.priority} />
            </div>

            <h3 className="preview-title">
              {form.title || <span className="placeholder">Título do chamado…</span>}
            </h3>

            <div className="preview-row">
              {form.category ? <CategoryTag c={form.category} /> : <span className="placeholder tag">Categoria</span>}
            </div>

            <div className="divider"></div>

            <div className="preview-meta">
              <div className="meta-row">
                <span className="meta-label"><Icon name="truck" size={14} /> Veículo</span>
                <span className="meta-val">{vehObj ? vehObj.name.split(' — ')[0] : <span className="placeholder">—</span>}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label"><Icon name="user" size={14} /> Mecânico</span>
                <span className="meta-val">
                  {mech ? <AvatarRow name={mech.name} /> : <span className="placeholder">Não atribuído</span>}
                </span>
              </div>
              <div className="meta-row">
                <span className="meta-label"><Icon name="user-shield" size={14} /> Aberto por</span>
                <span className="meta-val"><AvatarRow name={user.name} /></span>
              </div>
              <div className="meta-row">
                <span className="meta-label"><Icon name="clock" size={14} /> Duração</span>
                <span className="meta-val">{form.duration} {form.durationUnit === 'hours' ? 'horas' : 'dias'}</span>
              </div>
              <div className="meta-row">
                <span className="meta-label"><Icon name="flag" size={14} /> Prazo</span>
                <span className="meta-val">{new Date(form.deadline).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>

            <div className="divider"></div>

            <div className="preview-footer">
              <Icon name="info-circle" size={14} />
              <span>O mecânico será notificado assim que o chamado for aberto.</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

window.NewTicketScreen = NewTicketScreen;
