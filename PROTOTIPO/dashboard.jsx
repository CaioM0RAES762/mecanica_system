// Screen 5: Analytics Dashboard
const DashboardScreen = ({ user, onToast }) => {
  const [range, setRange] = React.useState('30d');

  return (
    <div className="screen-enter dashboard">
      {/* Header row */}
      <div className="dash-head">
        <div>
          <h2 className="dash-title">Dashboard de Análise</h2>
          <p className="dash-sub">Visão consolidada das operações de oficina · atualizado há 4 minutos</p>
        </div>
        <div className="dash-actions">
          <div className="segmented">
            {[
              { id: '7d', label: '7 dias' },
              { id: '30d', label: '30 dias' },
              { id: '90d', label: '90 dias' },
              { id: 'custom', label: 'Personalizado' },
            ].map(r => (
              <button key={r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>{r.label}</button>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => onToast('Dados atualizados.', 'success')}>
            <Icon name="refresh" />Atualizar
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => onToast('Relatório exportado.', 'success')}>
            <Icon name="download" />Exportar relatório
          </button>
        </div>
      </div>

      {/* Row 1: KPIs */}
      <div className="kpi-row">
        <KpiCard color="var(--blue-500)" icon="ticket" label="Chamados abertos no período" value="284" sub="+18 vs período anterior" trend="up" />
        <KpiCard color="var(--green-500)" icon="circle-check" label="Chamados fechados" value="261" sub="92% do total aberto" trend="up" />
        <KpiCard color="var(--amber-500)" icon="clock" label="Tempo médio de resolução" value="5h 42min" sub="−38min vs período anterior" trend="up" />
        <KpiCard color="var(--red-500)" icon="target" label="SLA cumprido" value="91.4%" sub="−2.1% vs período anterior" trend="down" />
      </div>

      {/* Row 2: Bar chart + Line chart */}
      <div className="dash-grid-2">
        <ChartCard title="Chamados por categoria" subtitle="Volume total no período por área de serviço">
          <BarChart />
        </ChartCard>
        <ChartCard title="Aberturas vs fechamentos" subtitle="Evolução diária — últimos 14 dias">
          <LineChart />
        </ChartCard>
      </div>

      {/* Row 3: Donut + Leaderboard */}
      <div className="dash-grid-2">
        <ChartCard title="Distribuição por prioridade" subtitle="Quanto dos chamados é crítico, alto, médio, baixo">
          <DonutChart />
        </ChartCard>
        <ChartCard title="Performance dos mecânicos" subtitle="Top 6 por chamados fechados no período" pad="0">
          <Leaderboard />
        </ChartCard>
      </div>

      {/* Row 4: Heatmap full width */}
      <ChartCard title="Volume de chamados por dia" subtitle="Densidade visual — cada quadrado representa um dia">
        <Heatmap />
      </ChartCard>

      {/* Row 5: Bottom insights */}
      <div className="dash-grid-2">
        <ChartCard title="Chamados mais longos" subtitle="Top 5 chamados por duração até o fechamento" pad="0">
          <LongestTable />
        </ChartCard>
        <ChartCard title="Categorias críticas" subtitle="Categorias com mais chamados atrasados nos últimos 30 dias" pad="0">
          <CriticalCategories />
        </ChartCard>
      </div>
    </div>
  );
};

// ----- KPI Card -----
const KpiCard = ({ color, icon, label, value, sub, trend }) => (
  <div className="kpi-card" style={{ '--c': color }}>
    <div className="kpi-row-top">
      <div className="kpi-icon"><Icon name={icon} /></div>
      <div className={`kpi-trend ${trend === 'up' ? 'up' : 'down'}`}>
        <Icon name={trend === 'up' ? 'trending-up' : 'trending-down'} size={13} />
      </div>
    </div>
    <div className="kpi-value">{value}</div>
    <div className="kpi-label">{label}</div>
    <div className="kpi-sub">{sub}</div>
  </div>
);

// ----- Chart Card -----
const ChartCard = ({ title, subtitle, children, pad = '20' }) => (
  <div className="chart-card">
    <div className="chart-head">
      <div>
        <h3 className="chart-title">{title}</h3>
        <p className="chart-sub">{subtitle}</p>
      </div>
      <button className="icon-btn"><Icon name="dots" /></button>
    </div>
    <div className="chart-body" style={{ padding: `${pad}px` }}>
      {children}
    </div>
  </div>
);

// ----- Bar Chart -----
const BarChart = () => {
  const data = [
    { cat: 'engine', value: 68 },
    { cat: 'electrical', value: 54 },
    { cat: 'brakes', value: 47 },
    { cat: 'preventive', value: 41 },
    { cat: 'transmission', value: 32 },
    { cat: 'suspension', value: 24 },
    { cat: 'bodywork', value: 14 },
    { cat: 'other', value: 4 },
  ];
  const max = 70;
  return (
    <div className="bar-chart">
      {data.map(d => (
        <div key={d.cat} className="bar-row">
          <div className="bar-label">{CATEGORY_LABEL[d.cat]}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: (d.value / max * 100) + '%', background: CATEGORY_COLOR[d.cat] }}></div>
          </div>
          <div className="bar-value">{d.value}</div>
        </div>
      ))}
    </div>
  );
};

// ----- Line Chart -----
const LineChart = () => {
  const W = 460, H = 220, P = 32;
  const opened = [12, 14, 11, 18, 16, 22, 19, 21, 17, 23, 20, 25, 22, 27];
  const closed = [10, 11, 13, 14, 17, 16, 20, 18, 19, 21, 22, 23, 24, 24];
  const max = 30;
  const stepX = (W - P * 2) / (opened.length - 1);
  const pt = (arr) => arr.map((v, i) => [P + i * stepX, H - P - (v / max) * (H - P * 2)]);
  const toPath = (pts) => {
    let d = `M ${pts[0][0]} ${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` Q ${cx} ${y0}, ${cx} ${(y0 + y1) / 2} T ${x1} ${y1}`;
    }
    return d;
  };
  const oPts = pt(opened), cPts = pt(closed);
  const oArea = `${toPath(oPts)} L ${oPts[oPts.length - 1][0]} ${H - P} L ${oPts[0][0]} ${H - P} Z`;
  return (
    <div className="line-chart">
      <div className="line-legend">
        <span><span className="dot" style={{ background: 'var(--blue-500)' }}></span> Abertos</span>
        <span><span className="dot" style={{ background: 'var(--green-500)' }}></span> Fechados</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height="220">
        <defs>
          <linearGradient id="oGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1D6FE8" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1D6FE8" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Y grid */}
        {[0, 1, 2, 3].map(i => {
          const y = P + (H - P * 2) * (i / 3);
          return <line key={i} x1={P} y1={y} x2={W - P} y2={y} stroke="#eef0f5" strokeWidth="1" />;
        })}
        {/* Y labels */}
        {[30, 20, 10, 0].map((v, i) => (
          <text key={v} x={P - 8} y={P + (H - P * 2) * (i / 3) + 4} textAnchor="end" fill="#9099a8" fontSize="11">{v}</text>
        ))}
        {/* X labels */}
        {opened.map((_, i) => i % 2 === 0 && (
          <text key={i} x={P + i * stepX} y={H - 8} textAnchor="middle" fill="#9099a8" fontSize="10">{i + 1}/5</text>
        ))}
        <path d={oArea} fill="url(#oGrad)" />
        <path d={toPath(oPts)} fill="none" stroke="#1D6FE8" strokeWidth="2.5" strokeLinecap="round" />
        <path d={toPath(cPts)} fill="none" stroke="#1D9E75" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="0" />
        {oPts.map(([x, y], i) => <circle key={'o'+i} cx={x} cy={y} r="3" fill="white" stroke="#1D6FE8" strokeWidth="2" />)}
        {cPts.map(([x, y], i) => <circle key={'c'+i} cx={x} cy={y} r="3" fill="white" stroke="#1D9E75" strokeWidth="2" />)}
      </svg>
    </div>
  );
};

// ----- Donut Chart -----
const DonutChart = () => {
  const data = [
    { id: 'critical', label: 'Crítica', value: 18, color: '#1a2030' },
    { id: 'high', label: 'Alta', value: 56, color: '#E24B4A' },
    { id: 'medium', label: 'Média', value: 124, color: '#E8A020' },
    { id: 'low', label: 'Baixa', value: 86, color: '#1D9E75' },
  ];
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="#eef0f5" strokeWidth="22" />
        {data.map(d => {
          const frac = d.value / total;
          const len = frac * c;
          const el = (
            <circle key={d.id} cx="90" cy="90" r={r} fill="none" stroke={d.color} strokeWidth="22"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
              transform="rotate(-90 90 90)" strokeLinecap="butt" />
          );
          offset += len;
          return el;
        })}
        <text x="90" y="86" textAnchor="middle" fontSize="28" fontWeight="700" fill="#1a2030">{total}</text>
        <text x="90" y="106" textAnchor="middle" fontSize="11" fill="#6b7689" letterSpacing="1.5">CHAMADOS</text>
      </svg>
      <div className="donut-legend">
        {data.map(d => (
          <div key={d.id} className="dl-row">
            <span className="dl-swatch" style={{ background: d.color }}></span>
            <span className="dl-label">{d.label}</span>
            <span className="dl-val">{d.value}</span>
            <span className="dl-pct">{Math.round(d.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ----- Leaderboard -----
const Leaderboard = () => {
  const rows = [
    { name: 'Pedro Mota', closed: 42, avg: '4h 20min', sla: 96, trend: 'up' },
    { name: 'Carlos Souza', closed: 38, avg: '5h 10min', sla: 93, trend: 'up' },
    { name: 'Rafael Lima', closed: 34, avg: '4h 45min', sla: 91, trend: 'flat' },
    { name: 'Lucas Pereira', closed: 29, avg: '6h 20min', sla: 87, trend: 'down' },
    { name: 'Bruno Alves', closed: 24, avg: '5h 55min', sla: 85, trend: 'up' },
    { name: 'Diego Ramos', closed: 21, avg: '6h 40min', sla: 81, trend: 'down' },
  ];
  return (
    <table className="leaderboard">
      <thead>
        <tr><th>#</th><th>Mecânico</th><th>Fechados</th><th>Tempo médio</th><th>SLA</th><th></th></tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.name}>
            <td className="rank">{i + 1}</td>
            <td><AvatarRow name={r.name} /></td>
            <td><strong>{r.closed}</strong></td>
            <td className="muted">{r.avg}</td>
            <td>
              <div className="sla-bar">
                <div className="sla-fill" style={{ width: r.sla + '%', background: r.sla >= 90 ? 'var(--green-500)' : r.sla >= 85 ? 'var(--amber-500)' : 'var(--red-500)' }}></div>
              </div>
              <span className="sla-text">{r.sla}%</span>
            </td>
            <td>
              <span className={`trend-pill ${r.trend}`}>
                <Icon name={r.trend === 'up' ? 'trending-up' : r.trend === 'down' ? 'trending-down' : 'minus'} size={12} />
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ----- Heatmap -----
const Heatmap = () => {
  // 7 rows (weekdays) × 14 cols (last 14 days)
  const days = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'];
  // Pseudo-random but stable
  const data = [];
  for (let r = 0; r < 7; r++) {
    const row = [];
    for (let c = 0; c < 14; c++) {
      const seed = (r * 31 + c * 17 + 7) % 100;
      let v;
      if (r >= 5) v = Math.floor(seed / 30); // weekend low
      else v = Math.floor(seed / 10);
      row.push(Math.min(9, v));
    }
    data.push(row);
  }
  const scale = (v) => {
    if (v === 0) return 'rgba(15,27,45,0.04)';
    const a = 0.15 + (v / 9) * 0.75;
    return `rgba(29,111,232,${a})`;
  };
  return (
    <div className="heatmap">
      <div className="hm-grid">
        <div className="hm-rowlabels">
          {days.map(d => <div key={d} className="hm-rowlabel">{d}</div>)}
        </div>
        <div className="hm-cells">
          {data.map((row, r) => (
            <div key={r} className="hm-row">
              {row.map((v, c) => (
                <div key={c} className="hm-cell" style={{ background: scale(v) }} title={`${v} chamados`}></div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="hm-foot">
        <span className="muted">Menos</span>
        {[0,2,4,6,9].map(v => <div key={v} className="hm-cell sm" style={{ background: scale(v) }}></div>)}
        <span className="muted">Mais</span>
        <div className="spacer"></div>
        <span className="muted">Últimos 14 dias · 7 dias da semana</span>
      </div>
    </div>
  );
};

// ----- Longest tickets -----
const LongestTable = () => {
  const rows = [
    { id: '0014', title: 'Reforma completa de motor — bloco e cabeçote', cat: 'engine', dur: '4d 12h' },
    { id: '0019', title: 'Retífica da caixa de marcha automatizada', cat: 'transmission', dur: '3d 6h' },
    { id: '0022', title: 'Pintura geral pós-acidente lateral', cat: 'bodywork', dur: '2d 18h' },
    { id: '0008', title: 'Substituição da chicotaria elétrica completa', cat: 'electrical', dur: '2d 4h' },
    { id: '0031', title: 'Substituição de bomba de combustível', cat: 'engine', dur: '1d 6h' },
  ];
  return (
    <table className="mini-table">
      <tbody>
        {rows.map(r => (
          <tr key={r.id}>
            <td className="mono">#{r.id}</td>
            <td className="mt-title">{r.title}</td>
            <td><CategoryTag c={r.cat} /></td>
            <td className="mt-dur"><Icon name="clock" size={13} />{r.dur}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// ----- Critical categories -----
const CriticalCategories = () => {
  const rows = [
    { cat: 'engine', overdue: 8, total: 68, pct: 12 },
    { cat: 'electrical', overdue: 6, total: 54, pct: 11 },
    { cat: 'transmission', overdue: 3, total: 32, pct: 9 },
    { cat: 'brakes', overdue: 3, total: 47, pct: 6 },
    { cat: 'suspension', overdue: 1, total: 24, pct: 4 },
  ];
  return (
    <div className="cc-list">
      {rows.map((r, i) => (
        <div key={r.cat} className="cc-row">
          <div className="cc-rank">{i + 1}</div>
          <CategoryTag c={r.cat} />
          <div className="cc-stat">
            <strong>{r.overdue}</strong> atrasados de {r.total}
          </div>
          <div className="cc-bar"><div className="cc-fill" style={{ width: r.pct * 4 + '%' }}></div></div>
          <span className="badge badge-red"><Icon name="alert-triangle" size={11} />{r.pct}%</span>
        </div>
      ))}
    </div>
  );
};

window.DashboardScreen = DashboardScreen;
