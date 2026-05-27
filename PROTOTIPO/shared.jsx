// Shared components, helpers, and sample data for Metalsider

// ---------- Icon helper (Tabler) ----------
const Icon = ({ name, size, style, className }) => (
  <i className={`ti ti-${name}${className ? ' ' + className : ''}`} style={{ fontSize: size, ...style }} />
);

// ---------- Avatar ----------
const AVATAR_COLORS = [
  '#1D6FE8', '#E8A020', '#1D9E75', '#7C5CFC', '#E24B4A', '#0AA89D', '#D95C9A', '#3C7CE0'
];
function avatarColor(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')).toUpperCase();
}
const Avatar = ({ name, size = 'md' }) => {
  const cls = size === 'sm' ? 'avatar avatar-sm' : size === 'lg' ? 'avatar avatar-lg' : 'avatar';
  return <span className={cls} style={{ background: avatarColor(name) }}>{initials(name)}</span>;
};
const AvatarRow = ({ name, size = 'sm' }) => (
  <span className="avatar-row"><Avatar name={name} size={size} /><span className="name">{name}</span></span>
);

// ---------- Badge ----------
const PRIORITY_LABEL = { low: 'Baixa', medium: 'Média', high: 'Alta', critical: 'Crítica' };
const PriorityBadge = ({ p, lg }) => (
  <span className={`badge badge-${p}${lg ? ' badge-lg' : ''}`}>
    <span className="dot"></span>{PRIORITY_LABEL[p]}
  </span>
);

const STATUS_MAP = {
  open:    { label: 'Aberto', cls: 'badge-blue' },
  closed:  { label: 'Fechado', cls: 'badge-green' },
  overdue: { label: 'Atrasado', cls: 'badge-red' },
  partial: { label: 'Parcial', cls: 'badge-amber' },
};
const StatusBadge = ({ s, lg }) => (
  <span className={`badge ${STATUS_MAP[s].cls}${lg ? ' badge-lg' : ''}`}>
    <span className="dot"></span>{STATUS_MAP[s].label}
  </span>
);

const CATEGORY_LABEL = {
  engine: 'Motor', transmission: 'Transmissão', electrical: 'Elétrica',
  brakes: 'Freios', suspension: 'Suspensão', bodywork: 'Funilaria',
  preventive: 'Manutenção Preventiva', other: 'Outros'
};
const CATEGORY_COLOR = {
  engine: '#1D6FE8', transmission: '#7C5CFC', electrical: '#E8A020',
  brakes: '#E24B4A', suspension: '#0AA89D', bodywork: '#D95C9A',
  preventive: '#1D9E75', other: '#6b7689'
};
const CategoryTag = ({ c }) => (
  <span className="tag" style={{ background: CATEGORY_COLOR[c] + '1a', color: CATEGORY_COLOR[c] }}>
    <span style={{ width: 6, height: 6, borderRadius: 99, background: 'currentColor' }}></span>
    {CATEGORY_LABEL[c]}
  </span>
);

// ---------- Sidebar ----------
const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'chart-bar' },
  { id: 'tickets',   label: 'Chamados Abertos', icon: 'clipboard-list', badge: true },
  { id: 'new',       label: 'Novo Chamado', icon: 'plus', supervisorOnly: true },
  { id: 'history',   label: 'Histórico', icon: 'archive' },
  { id: 'settings',  label: 'Configurações', icon: 'settings' },
];

const Sidebar = ({ route, setRoute, role, user, openCount, onLogout }) => {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-mark">M</div>
        <div className="wordmark">Metalsider<small>Ordens de Serviço</small></div>
      </div>
      <nav className="nav">
        <div className="nav-section">Operação</div>
        {NAV_ITEMS.map(item => {
          const isSupOnly = item.supervisorOnly && role !== 'supervisor';
          if (isSupOnly) return null;
          const active = route === item.id;
          return (
            <button
              key={item.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => setRoute(item.id)}
            >
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{openCount}</span>}
            </button>
          );
        })}
      </nav>
      <div className="user">
        <Avatar name={user.name} />
        <div className="user-meta">
          <div className="name">{user.name}</div>
          <div className="role">
            <span className={`role-pill ${role}`}>{role === 'supervisor' ? 'Supervisor' : 'Mecânico'}</span>
          </div>
        </div>
        <button className="icon-btn" onClick={onLogout} title="Sair">
          <Icon name="logout" />
        </button>
      </div>
    </aside>
  );
};

// ---------- TopBar ----------
const TopBar = ({ title, crumb, children }) => (
  <header className="topbar">
    <div>
      {crumb && <div className="crumb">{crumb}</div>}
      <h1>{title}</h1>
    </div>
    <div className="spacer"></div>
    {children}
  </header>
);

// ---------- Sample data ----------
const MECHANICS = [
  { id: 'm1', name: 'Pedro Mota' },
  { id: 'm2', name: 'Carlos Souza' },
  { id: 'm3', name: 'Rafael Lima' },
  { id: 'm4', name: 'Lucas Pereira' },
  { id: 'm5', name: 'Bruno Alves' },
  { id: 'm6', name: 'Diego Ramos' },
];
const SUPERVISORS = [
  { id: 's1', name: 'João Silva' },
  { id: 's2', name: 'Marina Costa' },
];
const VEHICLES = [
  { id: 'V-1042', name: 'Volvo FH 540 — Placa NXR-1042' },
  { id: 'V-2210', name: 'Scania R450 — Placa BPT-2210' },
  { id: 'V-3318', name: 'Mercedes Actros — Placa GVR-3318' },
  { id: 'V-4501', name: 'Ford Cargo 2429 — Placa LLD-4501' },
  { id: 'V-5077', name: 'Iveco Tector — Placa MMK-5077' },
  { id: 'V-6190', name: 'VW Constellation 24.280 — Placa OPS-6190' },
];

// Open tickets (Mechanic workspace)
const OPEN_TICKETS = [
  {
    id: '0042', title: 'Vazamento de óleo na caixa de transmissão',
    category: 'transmission', priority: 'high', vehicle: 'V-1042',
    mechanic: 'Pedro Mota', supervisor: 'João Silva',
    openedAt: '14/05 09:30', openedHoursAgo: 2,
    deadline: '15/05 18:00', overdue: false, progress: 35
  },
  {
    id: '0041', title: 'Troca de pastilhas dianteiras e revisão de discos',
    category: 'brakes', priority: 'medium', vehicle: 'V-2210',
    mechanic: 'Carlos Souza', supervisor: 'João Silva',
    openedAt: '13/05 14:20', openedHoursAgo: 22,
    deadline: '14/05 17:00', overdue: true, progress: 60
  },
  {
    id: '0040', title: 'Falha intermitente no painel elétrico — luz de bateria',
    category: 'electrical', priority: 'high', vehicle: 'V-3318',
    mechanic: 'Pedro Mota', supervisor: 'Marina Costa',
    openedAt: '14/05 08:10', openedHoursAgo: 3,
    deadline: '16/05 12:00', overdue: false, progress: 0
  },
  {
    id: '0039', title: 'Manutenção preventiva 60.000 km',
    category: 'preventive', priority: 'low', vehicle: 'V-4501',
    mechanic: 'Rafael Lima', supervisor: 'João Silva',
    openedAt: '14/05 07:45', openedHoursAgo: 4,
    deadline: '17/05 18:00', overdue: false, progress: 20
  },
  {
    id: '0038', title: 'Suspensão dianteira com ruído em baixa velocidade',
    category: 'suspension', priority: 'medium', vehicle: 'V-5077',
    mechanic: 'Pedro Mota', supervisor: 'Marina Costa',
    openedAt: '13/05 17:15', openedHoursAgo: 19,
    deadline: '16/05 18:00', overdue: false, progress: 0
  },
  {
    id: '0037', title: 'Superaquecimento do motor — diagnóstico urgente',
    category: 'engine', priority: 'critical', vehicle: 'V-6190',
    mechanic: 'Lucas Pereira', supervisor: 'João Silva',
    openedAt: '13/05 11:00', openedHoursAgo: 25,
    deadline: '14/05 11:00', overdue: true, progress: 45
  },
  {
    id: '0036', title: 'Substituição de farol dianteiro lado esquerdo',
    category: 'bodywork', priority: 'low', vehicle: 'V-2210',
    mechanic: 'Bruno Alves', supervisor: 'Marina Costa',
    openedAt: '13/05 10:30', openedHoursAgo: 25,
    deadline: '15/05 18:00', overdue: false, progress: 80
  },
  {
    id: '0035', title: 'Embreagem patinando em subida — investigar',
    category: 'transmission', priority: 'high', vehicle: 'V-1042',
    mechanic: 'Diego Ramos', supervisor: 'João Silva',
    openedAt: '12/05 16:00', openedHoursAgo: 43,
    deadline: '14/05 18:00', overdue: false, progress: 50
  },
];

// History tickets (mix of closed + open)
const HISTORY_TICKETS = [
  ...OPEN_TICKETS.map(t => ({ ...t, status: t.overdue ? 'overdue' : 'open', closedAt: null, duration: null })),
  { id: '0034', title: 'Alinhamento e balanceamento completo', category: 'suspension', priority: 'low',
    vehicle: 'V-3318', mechanic: 'Rafael Lima', supervisor: 'Marina Costa',
    openedAt: '12/05 09:00', closedAt: '12/05 11:30', duration: '2h 30min', status: 'closed' },
  { id: '0033', title: 'Troca de óleo e filtros', category: 'preventive', priority: 'low',
    vehicle: 'V-4501', mechanic: 'Carlos Souza', supervisor: 'João Silva',
    openedAt: '12/05 08:00', closedAt: '12/05 09:45', duration: '1h 45min', status: 'closed' },
  { id: '0032', title: 'Reparo no sistema de ar-condicionado da cabine', category: 'electrical', priority: 'medium',
    vehicle: 'V-5077', mechanic: 'Pedro Mota', supervisor: 'Marina Costa',
    openedAt: '11/05 14:00', closedAt: '11/05 17:20', duration: '3h 20min', status: 'closed' },
  { id: '0031', title: 'Substituição de bomba de combustível', category: 'engine', priority: 'high',
    vehicle: 'V-1042', mechanic: 'Lucas Pereira', supervisor: 'João Silva',
    openedAt: '10/05 09:15', closedAt: '11/05 16:00', duration: '1d 6h', status: 'closed' },
  { id: '0030', title: 'Recuperação de para-choque após colisão leve', category: 'bodywork', priority: 'medium',
    vehicle: 'V-6190', mechanic: 'Bruno Alves', supervisor: 'Marina Costa',
    openedAt: '09/05 10:00', closedAt: '10/05 18:00', duration: '2 dias', status: 'closed' },
  { id: '0029', title: 'Calibragem do sistema de freios ABS', category: 'brakes', priority: 'high',
    vehicle: 'V-2210', mechanic: 'Diego Ramos', supervisor: 'João Silva',
    openedAt: '09/05 08:30', closedAt: '09/05 13:00', duration: '4h 30min', status: 'closed' },
  { id: '0028', title: 'Troca de correia dentada e tensor', category: 'engine', priority: 'medium',
    vehicle: 'V-3318', mechanic: 'Rafael Lima', supervisor: 'Marina Costa',
    openedAt: '08/05 09:00', closedAt: '08/05 15:40', duration: '6h 40min', status: 'closed' },
  { id: '0027', title: 'Inspeção do sistema de escape', category: 'preventive', priority: 'low',
    vehicle: 'V-4501', mechanic: 'Carlos Souza', supervisor: 'João Silva',
    openedAt: '08/05 08:00', closedAt: '08/05 09:30', duration: '1h 30min', status: 'closed' },
];

// Expose globally
Object.assign(window, {
  Icon, Avatar, AvatarRow, PriorityBadge, StatusBadge, CategoryTag,
  Sidebar, TopBar, NAV_ITEMS, MECHANICS, SUPERVISORS, VEHICLES,
  OPEN_TICKETS, HISTORY_TICKETS, CATEGORY_LABEL, CATEGORY_COLOR, PRIORITY_LABEL,
  avatarColor, initials,
});
