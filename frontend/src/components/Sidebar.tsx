import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  FiGrid,
  FiUserCheck,
  FiCalendar,
  FiUsers,
  FiCheckCircle,
  FiFileText,
  FiActivity,
  FiBook,
  FiUser,
  FiSettings,
  FiLogOut,
  FiSliders,
  FiUploadCloud,
} from 'react-icons/fi';

// Menu Professeur (et Admin en tant que prof)
const professeurMenu = [
  { to: '/dashboard', label: 'Tableau de bord', icon: <FiGrid size={18} /> },
  { to: '/candidatures', label: 'Candidatures', icon: <FiUserCheck size={18} /> },
  { to: '/seances', label: 'Séances TP', icon: <FiCalendar size={18} /> },
  { to: '/affectation', label: 'Affectations', icon: <FiUsers size={18} /> },
  { to: '/validation-heures', label: 'Validation Heures', icon: <FiCheckCircle size={18} /> },
  { to: '/assistants', label: 'Assistants', icon: <FiUser size={18} /> },
  { to: '/historique', label: 'Historique', icon: <FiActivity size={18} /> },
];

// Menu Admin (accès total)
const adminMenu = [
  { to: '/dashboard', label: 'Tableau de bord', icon: <FiGrid size={18} /> },
  { to: '/candidatures', label: 'Candidatures', icon: <FiUserCheck size={18} /> },
  { to: '/seances', label: 'Séances TP', icon: <FiCalendar size={18} /> },
  { to: '/affectation', label: 'Affectations', icon: <FiUsers size={18} /> },
  { to: '/validation-heures', label: 'Validation Heures', icon: <FiCheckCircle size={18} /> },
  { to: '/assistants', label: 'Assistants', icon: <FiUser size={18} /> },
  { to: '/import-planning', label: 'Import Planning', icon: <FiUploadCloud size={18} /> },
  { to: '/rapports', label: 'Rapports', icon: <FiFileText size={18} /> },
  { to: '/historique', label: 'Logs d\'Audit', icon: <FiActivity size={18} /> },
  { to: '/admin/utilisateurs', label: 'Utilisateurs', icon: <FiSettings size={18} /> },
];

// Menu Assistant
const assistantMenu = [
  { to: '/dashboard', label: 'Mon tableau de bord', icon: <FiGrid size={18} /> },
  { to: '/mes-disponibilites', label: 'Mes disponibilités', icon: <FiSliders size={18} /> },
  { to: '/mes-seances', label: 'Mes séances', icon: <FiBook size={18} /> },
  { to: '/tps-disponibles', label: 'TPs disponibles', icon: <FiCalendar size={18} /> },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  let menu = assistantMenu;
  if (user?.role === 'admin') {
    menu = adminMenu;
  } else if (user?.role === 'professeur') {
    menu = professeurMenu;
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className={`bg-sidebar-bg flex flex-col h-screen shrink-0 transition-all duration-250 ease-in-out overflow-hidden relative z-50 ${collapsed ? 'w-[60px]' : 'w-[230px]'}`}>
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

      {/* Role Badge */}
      {!collapsed && (
        <div className="px-3.5 py-2 border-b border-sidebar-border/40 bg-white/5 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-[11px] font-semibold text-white/70 uppercase tracking-wider">
            {user?.role === 'professeur' ? 'Professeur' :
              user?.role === 'admin' ? 'Administrateur' : 'Assistant TP'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 px-2.5 overflow-y-auto overflow-x-hidden">
        {!collapsed && <span className="block text-[10px] font-semibold text-white/25 tracking-[0.08em] pt-2 px-1.5 pb-1.5">MENU PRINCIPAL</span>}
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
          <span className="flex items-center justify-center shrink-0 w-5"><FiUser size={17} /></span>
          {!collapsed && <span className="flex-1 overflow-hidden text-ellipsis">Profil</span>}
        </NavLink>
        <NavLink to="/parametres" className={({ isActive }) => `flex items-center gap-2.5 py-[9px] px-2.5 rounded-lg text-[13.5px] font-medium transition-all whitespace-nowrap overflow-hidden ${isActive ? 'bg-sidebar-active text-white shadow-[inset_3px_0_0_var(--color-primary)]' : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'}`} title={collapsed ? 'Paramètres' : ''}>
          <span className="flex items-center justify-center shrink-0 w-5"><FiSettings size={17} /></span>
          {!collapsed && <span className="flex-1 overflow-hidden text-ellipsis">Paramètres</span>}
        </NavLink>

        {!collapsed && (
          <div className="flex items-center justify-between py-2 px-1.5 text-[11px] text-white/30">
            <span>GestionTP v2.0</span>
            <button onClick={handleLogout} className="bg-white/5 border-none rounded-md cursor-pointer text-sidebar-text flex items-center p-1.5 transition-colors hover:bg-red-500/20 hover:text-red-400" title="Déconnexion">
              <FiLogOut size={14} />
            </button>
          </div>
        )}
        {collapsed && (
          <button onClick={handleLogout} className="flex items-center gap-2.5 py-[9px] px-2.5 rounded-lg text-[13.5px] font-medium transition-all text-sidebar-text hover:bg-red-500/15 hover:text-red-400 bg-transparent border-none cursor-pointer w-full" title="Déconnexion">
            <span className="flex items-center justify-center shrink-0 w-5"><FiLogOut size={17} /></span>
          </button>
        )}
      </div>
    </aside>
  );
}
