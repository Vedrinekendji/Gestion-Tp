import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const profMenu = [
  {
    to: '/dashboard', label: 'Tableau de bord', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    to: '/assistants', label: 'Assistants', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    to: '/disponibilites', label: 'Disponibilités', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    to: '/affectation', label: 'Affectation', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="2" /><path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
];

const adminMenu = [
  {
    to: '/dashboard', label: 'Tableau de bord', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    to: '/professeurs', label: 'Professeurs', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
    )
  },
  {
    to: '/matieres', label: 'Matières', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
  {
    to: '/planning', label: 'Planning', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
];

const assistantMenu = [
  {
    to: '/dashboard', label: 'Mon tableau de bord', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /><rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    to: '/mes-disponibilites', label: 'Mes disponibilités', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" /></svg>
    )
  },
  {
    to: '/mes-seances', label: 'Mes séances', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
  {
    to: '/tps-disponibles', label: 'TPs disponibles', icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2" /><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 16l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
    )
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menu = user?.role === 'admin' ? adminMenu : user?.role === 'professeur' ? profMenu : assistantMenu;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`bg-sidebar-bg flex flex-col h-screen shrink-0 transition-all duration-250 ease-in-out overflow-hidden relative z-50 ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}>
      {/* Header */}
      <div className="flex items-center justify-between py-4 px-3.5 border-b border-sidebar-border min-h-[62px]">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-[34px] h-[34px] bg-primary rounded-lg flex items-center justify-center shrink-0 shadow-[0_3px_8px_rgba(67,97,238,0.35)]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && <span className="text-[15.5px] font-bold text-white whitespace-nowrap tracking-[-0.2px]">GestionTP</span>}
        </div>
        <button className="text-sidebar-text p-1.5 rounded-md shrink-0 hover:bg-sidebar-hover hover:text-white transition-colors cursor-pointer border-none bg-transparent" onClick={onToggle}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            {collapsed
              ? <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              : <polyline points="15 18 9 12 15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            }
          </svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && <span className="block text-[10px] font-semibold text-white/25 tracking-[0.08em] pt-2 px-1.5 pb-1.5">MENU</span>}
        <ul className="flex flex-col gap-0.5">
          {menu.map(item => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) => `flex items-center gap-2.5 py-[9px] px-2.5 rounded-lg text-[13.5px] font-medium transition-all whitespace-nowrap overflow-hidden ${isActive ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--color-primary)]' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`}
                title={collapsed ? item.label : ''}
              >
                <span className="flex items-center justify-center shrink-0 w-5">{item.icon}</span>
                {!collapsed && <span className="flex-1 overflow-hidden text-ellipsis">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="py-2 px-2.5 border-t border-sidebar-border flex flex-col gap-0.5">
        <NavLink to="/profil" className={({ isActive }) => `flex items-center gap-2.5 py-[9px] px-2.5 rounded-lg text-[13.5px] font-medium transition-all whitespace-nowrap overflow-hidden ${isActive ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--color-primary)]' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`} title={collapsed ? 'Profil' : ''}>
          <span className="flex items-center justify-center shrink-0 w-5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" /></svg>
          </span>
          {!collapsed && <span className="flex-1 overflow-hidden text-ellipsis">Profil</span>}
        </NavLink>
        <NavLink to="/parametres" className={({ isActive }) => `flex items-center gap-2.5 py-[9px] px-2.5 rounded-lg text-[13.5px] font-medium transition-all whitespace-nowrap overflow-hidden ${isActive ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--color-primary)]' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`} title={collapsed ? 'Paramètres' : ''}>
          <span className="flex items-center justify-center shrink-0 w-5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" /></svg>
          </span>
          {!collapsed && <span className="flex-1 overflow-hidden text-ellipsis">Paramètres</span>}
        </NavLink>

        {/* Cookies bar */}
        {!collapsed && (
          <div className="flex items-center justify-between py-2 px-1.5 pb-1 text-[11px] text-white/20">
            <span>Accepter ou refuser les cookies</span>
            <button onClick={handleLogout} className="bg-white/5 border-none rounded-md cursor-pointer text-sidebar-text flex items-center py-1 px-1.5 transition-colors hover:bg-red-500/15 hover:text-red-500" title="Déconnexion">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={handleLogout} className="flex items-center gap-2.5 py-[9px] px-2.5 rounded-lg text-[13.5px] font-medium transition-all text-sidebar-text hover:bg-red-500/15 hover:text-red-500 bg-transparent border-none cursor-pointer w-full" title="Déconnexion">
            <span className="flex items-center justify-center shrink-0 w-5">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" /><polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" /></svg>
            </span>
          </button>
        )}
      </div>
    </aside>
  );
}
