import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const MATIERE_COLORS: Record<string, { bg: string, color: string, label: string }> = {
  'ALGO': { bg: '#eef0fd', color: '#4361ee', label: 'Algorithmique' },
  'BDD': { bg: '#fdf4ff', color: '#d946ef', label: 'Base de données' },
  'SE': { bg: '#ccfbf1', color: '#0d9488', label: "Systèmes d'exploitation" },
  'SYSEX': { bg: '#ccfbf1', color: '#0d9488', label: "Systèmes d'exploitation" },
  'ARCH': { bg: '#d1fae5', color: '#059669', label: 'Architecture' },
  'WEB': { bg: '#fffbeb', color: '#f59e0b', label: 'Développement Web' },
  'ALG': { bg: '#fce7f3', color: '#db2777', label: 'Algèbre linéaire' },
  'ML': { bg: '#fef2f2', color: '#ef4444', label: 'Machine Learning' },
  'CRYPT': { bg: '#e0e7ff', color: '#4f46e5', label: 'Cryptographie' },
  'POO': { bg: '#fae8ff', color: '#c026d3', label: 'Programmation objet' },
  'OS': { bg: '#f1f5f9', color: '#64748b', label: 'Operating Systems' },
  'NET': { bg: '#ecfeff', color: '#0ea5e9', label: 'Réseaux' },
};

const AVATAR_COLORS = ['#4361ee', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9'];

interface AssistantData {
  id: number;
  nom: string;
  email: string;
  telephone: string;
  formation: string;
  niveau: string;
  statut: string;
  note: string;
  inscription: string;
  heuresValidees: number;
  heuresAttente: number;
  heuresTotal: number;
  heuresMax: number;
  matieres: string[];
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Assistants() {
  const { token } = useAuth();
  const [assistants, setAssistants] = useState<AssistantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedAssistant, setSelectedAssistant] = useState<AssistantData | null>(null);
  const perPage = 5;

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/assistants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setAssistants(data);
    } catch (err) {
      setError('Impossible de charger les assistants.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAssistants(); }, []);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

  const filtered = assistants.filter(a =>
    a.nom.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase())
  );

  const actifs = filtered.filter(a => a.statut === 'ACTIF').length;
  const inactifs = filtered.filter(a => a.statut !== 'ACTIF').length;
  const avgHeures = Math.round(filtered.reduce((s, a) => s + (a.heuresMax - a.heuresTotal), 0) / (filtered.length || 1));

  const paginated = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[14px] text-text-secondary">Chargement des assistants...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-[36px]">⚠️</div>
          <p className="text-text-secondary">{error}</p>
          <button onClick={fetchAssistants} className="btn btn-primary px-4 py-2 text-[13px]">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.3px]">Assistants de TP</h2>
          <p className="text-[13px] text-text-secondary mt-[3px]">{filtered.length} assistant{filtered.length > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2.5 items-center">
          <button className="inline-flex items-center gap-2 py-2 px-4 bg-transparent border border-border text-text-secondary rounded-md text-[13.5px] font-medium transition-all hover:bg-content-bg hover:border-gray-300 cursor-pointer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><polyline points="7 10 12 15 17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Export Excel
          </button>
          <Link to="/ajouter-assistant" className="inline-flex items-center gap-2 py-2 px-4 bg-primary text-white border-none rounded-md text-[13.5px] font-medium shadow-[0_2px_8px_rgba(67,97,238,0.3)] transition-all hover:bg-primary-dark hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(67,97,238,0.4)] no-underline">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Ajouter un assistant
          </Link>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-card-bg border border-border flex items-center gap-3.5 p-4 rounded-xl shadow-sm">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0" style={{ color: '#4361ee', background: '#eef0fd' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/></svg>
          </div>
          <div><div className="text-[22px] font-bold text-text-primary leading-[1.1]">{filtered.length}</div><div className="text-[12px] text-text-secondary mt-[1px]">Total</div></div>
        </div>
        <div className="bg-card-bg border border-border flex items-center gap-3.5 p-4 rounded-xl shadow-sm">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0" style={{ color: '#10b981', background: '#ecfdf5' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div><div className="text-[22px] font-bold text-text-primary leading-[1.1]">{actifs}</div><div className="text-[12px] text-text-secondary mt-[1px]">Actifs</div></div>
        </div>
        <div className="bg-card-bg border border-border flex items-center gap-3.5 p-4 rounded-xl shadow-sm">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0" style={{ color: '#ef4444', background: '#fef2f2' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/></svg>
          </div>
          <div><div className="text-[22px] font-bold text-text-primary leading-[1.1]">{inactifs}</div><div className="text-[12px] text-text-secondary mt-[1px]">Inactifs</div></div>
        </div>
        <div className="bg-card-bg border border-border flex items-center gap-3.5 p-4 rounded-xl shadow-sm">
          <div className="w-[42px] h-[42px] rounded-[10px] flex items-center justify-center shrink-0" style={{ color: '#f59e0b', background: '#fffbeb' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </div>
          <div><div className="text-[22px] font-bold text-text-primary leading-[1.1]">{avgHeures}h</div><div className="text-[12px] text-text-secondary mt-[1px]">Moy. heures restantes</div></div>
        </div>
      </div>

      {/* Search & table */}
      <div className="bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-white">
          <div className="relative flex items-center w-full max-w-[340px]">
            <svg className="absolute left-3 text-text-muted pointer-events-none z-10" width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input
              type="text"
              className="w-full pl-[38px] pr-3 py-[7px] border border-border rounded-md text-[13px] text-text-primary bg-white outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all placeholder:text-text-muted"
              placeholder="Rechercher par nom, prénom ou email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-transparent border border-border text-text-secondary rounded-md text-[12.5px] font-medium hover:bg-content-bg hover:border-gray-300 transition-all cursor-pointer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Filtres
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">PHOTO</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">NOM ↑</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">FORMATION</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">MATIÈRES</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">HEURES</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">STATUT</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em] whitespace-nowrap">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(a => {
                const initials = getInitials(a.nom);
                const color = getColor(a.id);
                const statutLabel = a.statut === 'ACTIF' ? 'Actif' : a.statut === 'INACTIF' ? 'Inactif' : 'Congé';
                const isActif = a.statut === 'ACTIF';
                return (
                <tr key={a.id} className="border-b border-border last:border-b-0 hover:bg-[#fafbff] transition-colors">
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center justify-center rounded-full font-semibold text-[13px] shrink-0 w-[36px] h-[36px]" style={{ background: color, color: '#fff' }}>{initials}</div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="text-[13.5px] font-semibold text-text-primary">{a.nom}</div>
                    <div className="text-[11.5px] text-text-muted mt-0.5">✉ {a.email}</div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="text-[13px] text-text-primary">{a.formation || '—'}</div>
                    <div className="text-[11.5px] text-text-muted mt-[1px]">{a.niveau || '—'}</div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex gap-1.5 flex-wrap">
                      {a.matieres.slice(0, 2).map(m => (
                        <span key={m} className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.02em]" style={{ background: MATIERE_COLORS[m]?.bg || '#f4f5f9', color: MATIERE_COLORS[m]?.color || '#6b7280' }}>{m}</span>
                      ))}
                      {a.matieres.length > 2 && <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-[0.02em] bg-[#f4f5f9] text-[#6b7280]">+{a.matieres.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div>
                      <span className="text-[12.5px] text-text-primary font-medium">{a.heuresTotal}h / {a.heuresMax}h</span>
                      <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden w-[80px] mt-1.5">
                        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(a.heuresTotal / a.heuresMax) * 100}%`, background: color }}/>
                      </div>
                      <span className="text-[11px] text-text-muted">{Math.round((a.heuresTotal / a.heuresMax) * 100)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium ${isActif ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                      ● {statutLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex gap-1 items-center">
                      <button className="p-2 rounded-md bg-transparent border-none cursor-pointer text-text-secondary transition-colors flex items-center justify-center hover:bg-content-bg hover:text-text-primary" title="Voir" onClick={() => setSelectedAssistant(a)}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                      <button className="p-2 rounded-md bg-transparent border-none cursor-pointer text-text-secondary transition-colors flex items-center justify-center hover:bg-content-bg hover:text-text-primary" title="Modifier">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/></svg>
                      </button>
                      <button className="p-2 rounded-md bg-transparent border-none cursor-pointer text-[#f59e0b] transition-colors flex items-center justify-center hover:bg-content-bg" title="Désactiver">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                      <button className="p-2 rounded-md bg-transparent border-none cursor-pointer text-[#4361ee] transition-colors flex items-center justify-center hover:bg-content-bg" title="Affecter">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="2"/><rect x="8" y="2" width="8" height="4" rx="1" stroke="currentColor" strokeWidth="2"/><path d="M9 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-white rounded-b-xl">
          <span className="text-[12.5px] text-text-muted">Affichage {(page-1)*perPage+1}–{Math.min(page*perPage, filtered.length)} sur {filtered.length}</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`w-[30px] h-[30px] rounded-md border text-[12.5px] cursor-pointer transition-all flex items-center justify-center ${page === i + 1 ? 'bg-primary text-white border-primary' : 'bg-transparent border-border text-text-secondary hover:bg-content-bg'}`}
                onClick={() => setPage(i + 1)}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slide-over Detail Panel via Portal */}
      {selectedAssistant && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] transition-opacity animate-fade-in" onClick={() => setSelectedAssistant(null)}></div>
          <div className="bg-white w-[420px] max-w-full h-full shadow-2xl relative z-10 flex flex-col animate-[slideInRight_0.3s_ease-out]">
            
            {/* Header */}
            <div className="p-5 pb-0 flex gap-3 relative shrink-0">
              <button className="absolute top-4 right-4 w-7 h-7 rounded-full bg-content-bg border border-border flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer" onClick={() => setSelectedAssistant(null)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center font-bold text-[20px] shrink-0" style={{ background: `${getColor(selectedAssistant.id)}15`, color: getColor(selectedAssistant.id), border: `1px solid ${getColor(selectedAssistant.id)}30` }}>
                {getInitials(selectedAssistant.nom)}
              </div>
              <div className="flex flex-col pt-0.5">
                <h3 className="text-[18px] font-bold text-text-primary leading-tight">{selectedAssistant.nom}</h3>
                <p className="text-[12.5px] text-text-secondary">{selectedAssistant.formation}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold ${selectedAssistant.statut === 'ACTIF' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                    ● {selectedAssistant.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-content-bg text-text-secondary border border-border">
                    {selectedAssistant.niveau}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              
              {/* Progression Section */}
              <div className="bg-[#fafbfc] rounded-lg p-3.5 border border-border/50">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[11.5px] font-bold text-text-primary">Progression des heures</span>
                  <span className="text-[11.5px] font-bold text-primary">{selectedAssistant.heuresTotal}h / {selectedAssistant.heuresMax}h</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full w-full mb-3 flex overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(selectedAssistant.heuresTotal / selectedAssistant.heuresMax) * 100}%` }}></div>
                </div>
                <div className="flex justify-between gap-4">
                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-success">{selectedAssistant.heuresValidees}h</span>
                    <span className="text-[10px] text-text-muted leading-none">Validées</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-warning">{selectedAssistant.heuresAttente}h</span>
                    <span className="text-[10px] text-text-muted leading-none">En attente</span>
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[15px] font-bold text-primary">{selectedAssistant.heuresMax - selectedAssistant.heuresTotal}h</span>
                    <span className="text-[10px] text-text-muted leading-none">Restantes</span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white border border-border rounded-lg overflow-hidden shrink-0">
                <button className="flex-1 py-1.5 text-[12px] font-bold bg-primary text-white border-r border-border">Informations</button>
                <button className="flex-1 py-1.5 text-[12px] font-medium text-text-secondary border-r border-border hover:bg-content-bg">Planning</button>
                <button className="flex-1 py-1.5 text-[12px] font-medium text-text-secondary hover:bg-content-bg">Statistiques</button>
              </div>

              <hr className="border-t border-border w-full m-0 shrink-0" />

              {/* Coordonnées */}
              <div>
                <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2">Coordonnées</h4>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5 bg-[#f8f9fa] px-3 py-2.5 rounded-lg">
                    <svg className="text-primary w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <div>
                      <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Email</div>
                      <div className="text-[12.5px] text-text-primary font-medium">{selectedAssistant.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 bg-[#f8f9fa] px-3 py-2.5 rounded-lg">
                    <svg className="text-primary w-[16px] h-[16px]" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <div>
                      <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Téléphone</div>
                      <div className="text-[12.5px] text-text-primary font-medium">{selectedAssistant.telephone || '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Académique */}
              <div>
                <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2">Académique</h4>
                <div className="grid grid-cols-2 gap-1.5 mb-1.5">
                  <div className="bg-[#f8f9fa] px-3 py-2.5 rounded-lg">
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Formation</div>
                    <div className="text-[12.5px] text-text-primary font-medium">{selectedAssistant.formation || '—'}</div>
                  </div>
                  <div className="bg-[#f8f9fa] px-3 py-2.5 rounded-lg">
                    <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Niveau</div>
                    <div className="text-[12.5px] text-text-primary font-medium">{selectedAssistant.niveau || '—'}</div>
                  </div>
                </div>
                <div className="bg-[#f8f9fa] px-3 py-2.5 rounded-lg w-[calc(50%-3px)]">
                  <div className="text-[9px] font-bold text-text-muted uppercase tracking-wider mb-0.5">Inscription</div>
                  <div className="text-[12.5px] text-text-primary font-medium">{selectedAssistant.inscription ? new Date(selectedAssistant.inscription).toLocaleDateString('fr-FR') : '—'}</div>
                </div>
              </div>

              {/* Matières */}
              <div>
                <h4 className="text-[10px] font-bold text-text-muted tracking-widest uppercase mb-2">Matières maîtrisées</h4>
                <div className="flex gap-1.5 flex-wrap">
                  {selectedAssistant.matieres.map(m => {
                    const color = MATIERE_COLORS[m]?.color || '#6b7280';
                    return (
                      <span key={m} className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold border" style={{ color: color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                        {MATIERE_COLORS[m]?.label || m}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Note */}
              {selectedAssistant.note && (
                <div className="bg-[#fffbeb] border border-[#fde68a] p-3 rounded-lg mt-1 shrink-0">
                  <h4 className="text-[9px] font-bold text-[#b45309] tracking-widest uppercase mb-1">Note du responsable</h4>
                  <p className="text-[12px] text-[#92400e] leading-snug">{selectedAssistant.note}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto p-4 flex items-center justify-between gap-3 border-t border-border bg-white shrink-0">
              <button className="flex-1 py-2.5 px-4 bg-white border border-border rounded-lg text-text-primary font-medium text-[13.5px] hover:bg-content-bg transition-colors cursor-pointer" onClick={() => setSelectedAssistant(null)}>
                Fermer
              </button>
              <button className="flex-1 py-2.5 px-4 bg-primary text-white border-none rounded-lg font-medium text-[13.5px] flex items-center justify-center gap-2 hover:bg-primary-dark transition-colors cursor-pointer shadow-md">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2"/></svg>
                Modifier
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Slide-in animation for tailwind via global CSS */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
