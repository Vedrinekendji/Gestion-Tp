import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const routeTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: "Vue d'ensemble du département" },
  '/candidatures': { title: 'Candidatures TP', sub: 'Gestion et étude des dossiers de candidature' },
  '/seances': { title: 'Séances de TP', sub: 'Planning et gestion des séances de TP' },
  '/affectation': { title: 'Affectation & Créneaux', sub: 'Attribution des assistants et validation des réservations' },
  '/demandes-creneaux': { title: 'Demandes de Créneaux', sub: 'Validation des créneaux sélectionnés par les assistants' },
  '/validation-heures': { title: 'Validation des Heures', sub: 'Suivi et validation des heures d\'assistant effectuées' },
  '/historique': { title: 'Historique & Audit', sub: 'Journal complet des actions et modifications' },
  '/rapports': { title: 'Rapports Mensuels & Exports', sub: 'Exportation PDF / Excel pour le Service Administratif' },
  '/professeurs': { title: 'Gestion des Professeurs', sub: 'Gérez les comptes professeurs' },
  '/matieres': { title: 'Gestion des Matières', sub: 'Gérez le catalogue des matières' },
  '/assistants': { title: 'Gestion des Assistants', sub: 'Gérez vos assistants de TP' },
  '/disponibilites': { title: 'Disponibilités', sub: 'Planning hebdomadaire interactif' },
  '/mes-disponibilites': { title: 'Mes disponibilités', sub: 'Gérez vos créneaux disponibles' },
  '/mes-seances': { title: 'Mes séances', sub: 'Vos séances de TP affectées' },
  '/tps-disponibles': { title: 'TPs Disponibles', sub: 'Réservation de créneaux de TP' },
  '/profil': { title: 'Mon profil', sub: 'Informations personnelles' },
  '/parametres': { title: 'Paramètres', sub: 'Configuration du compte' },
};

export default function Header() {
  const location = useLocation();
  const { user } = useAuth();
  const pageInfo = routeTitles[location.pathname] || { title: 'GestionTP', sub: '' };

  const avatarColors = ['#4361ee', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#f97316'];
  const colorIndex = (user?.name?.charCodeAt(0) || 0) % avatarColors.length;

  const roleLabel =
    user?.role === 'admin' ? 'Administrateur' :
      user?.role === 'responsable_pedagogique' ? 'Responsable Pédagogique' :
        user?.role === 'service_administratif' ? 'Service Administratif' :
          user?.role === 'professeur' ? 'Professeur' : 'Assistant TP';

  return (
    <header className="flex items-center justify-between py-3.5 px-8 bg-white border-b border-border min-h-[72px] shrink-0 z-10">
      <div>
        <h1 className="text-[18px] font-bold text-text-primary tracking-[-0.3px] leading-[1.2]">{pageInfo.title}</h1>
        <p className="text-[12px] text-text-secondary mt-0.5">{pageInfo.sub}</p>
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* Avatar */}
        <div className="flex items-center gap-2.5 cursor-pointer py-1 px-2.5 rounded-lg transition-colors hover:bg-content-bg">
          <div
            className="flex items-center justify-center rounded-full font-semibold shrink-0 w-9 h-9 text-[13px] text-white"
            style={{ background: avatarColors[colorIndex] }}
          >
            {user?.initials || 'U'}
          </div>
          {user && (
            <div className="flex flex-col">
              <span className="text-[13px] font-semibold text-text-primary leading-[1.2]">{user.name}</span>
              <span className="text-[11px] text-text-muted">
                {roleLabel}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
