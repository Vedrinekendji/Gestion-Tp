import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface MonAffectation {
  id: number;
  matiere: string;
  matiereCode: string;
  matiereCouleur: string | null;
  groupe: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  salle: string | null;
  type: string;
  niveau: string | null;
  statut: string;
  heuresCount: number;
}

const STATUT_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  EN_ATTENTE: { label: 'En attente', bg: '#fffbeb', color: '#f59e0b' },
  VALIDEE: { label: 'Validée', bg: '#ecfdf5', color: '#10b981' },
  REFUSEE: { label: 'Refusée', bg: '#fef2f2', color: '#ef4444' },
  ANNULEE: { label: 'Annulée', bg: '#f4f5f9', color: '#6b7280' },
};

export default function MesSeances() {
  const { token } = useAuth();
  const [affectations, setAffectations] = useState<MonAffectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'toutes' | 'avenir' | 'passees'>('avenir');

  const fetchAffectations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/affectations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setAffectations(data);
    } catch (err) {
      setError('Impossible de charger vos séances.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAffectations(); }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = affectations.filter(a => {
    if (filter === 'toutes') return true;
    const d = new Date(a.date);
    return filter === 'avenir' ? d >= today : d < today;
  });

  const validees = affectations.filter(a => a.statut === 'VALIDEE').length;
  const enAttente = affectations.filter(a => a.statut === 'EN_ATTENTE').length;
  const heuresTotal = affectations
    .filter(a => a.statut === 'VALIDEE')
    .reduce((sum, a) => sum + a.heuresCount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[14px] text-text-secondary">Chargement de vos séances...</span>
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
          <button onClick={fetchAffectations} className="btn btn-primary px-4 py-2 text-[13px]">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div>
        <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.3px]">Mes séances</h2>
        <p className="text-[13px] text-text-secondary mt-[3px]">Les séances de TP/TD auxquelles vous avez été affecté(e)</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
          <div className="text-[22px] font-bold text-success leading-none">{validees}</div>
          <div className="text-[12.5px] text-text-secondary mt-1.5">Séances validées</div>
        </div>
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
          <div className="text-[22px] font-bold text-warning leading-none">{enAttente}</div>
          <div className="text-[12.5px] text-text-secondary mt-1.5">En attente de validation</div>
        </div>
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
          <div className="text-[22px] font-bold text-primary leading-none">{heuresTotal}h</div>
          <div className="text-[12.5px] text-text-secondary mt-1.5">Heures validées</div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: 'avenir', label: 'À venir' },
          { key: 'passees', label: 'Passées' },
          { key: 'toutes', label: 'Toutes' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`py-1.5 px-3.5 rounded-md text-[12.5px] font-medium border cursor-pointer transition-all ${filter === t.key ? 'bg-primary text-white border-primary' : 'bg-white text-text-secondary border-border hover:bg-content-bg'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {filtered.map(a => {
          const statutMeta = STATUT_LABELS[a.statut] || STATUT_LABELS.EN_ATTENTE;
          return (
            <div key={a.id} className="bg-card-bg border border-border rounded-xl shadow-sm p-4 flex items-center gap-4">
              <div className="w-1 h-14 rounded-full shrink-0" style={{ background: a.matiereCouleur || '#4361ee' }}></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[14px] font-semibold text-text-primary">{a.matiere}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide" style={{ background: (a.matiereCouleur || '#4361ee') + '20', color: a.matiereCouleur || '#4361ee' }}>{a.matiereCode}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide bg-content-bg text-text-secondary">★ {a.type}</span>
                </div>
                <div className="text-[12.5px] text-text-secondary mt-1">
                  {a.groupe} · {a.niveau || '—'} · {a.salle || 'Salle non définie'}
                </div>
                <div className="text-[12.5px] text-text-muted mt-0.5">
                  {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} · {a.heureDebut}–{a.heureFin}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-medium shrink-0" style={{ background: statutMeta.bg, color: statutMeta.color }}>
                ● {statutMeta.label}
              </span>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-card-bg border border-border rounded-xl shadow-sm py-10 flex flex-col items-center gap-2 text-center">
            <span className="text-[32px]">📅</span>
            <p className="text-[13px] text-text-muted">Aucune séance {filter === 'avenir' ? 'à venir' : filter === 'passees' ? 'passée' : ''} pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
