import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface MonAffectation {
  id: number;
  seanceId: number;
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
  EN_ATTENTE: { label: 'En attente', bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706' },
  VALIDEE: { label: 'Validée', bg: 'rgba(16, 185, 129, 0.12)', color: '#059669' },
  REFUSEE: { label: 'Refusée', bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
  ANNULEE: { label: 'Annulée', bg: 'rgba(107, 114, 128, 0.12)', color: '#6b7280' },
};

export default function MesSeances() {
  const { token } = useAuth();
  const [affectations, setAffectations] = useState<MonAffectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filter, setFilter] = useState<'toutes' | 'avenir' | 'passees'>('avenir');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Cancel Modal
  const [cancelModalItem, setCancelModalItem] = useState<MonAffectation | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      setFeedback({ message: 'Impossible de charger vos séances.', type: 'error' });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffectations();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = useMemo(() => {
    return affectations.filter(a => {
      if (filter === 'toutes') return true;
      const d = new Date(a.date);
      return filter === 'avenir' ? d >= today : d < today;
    });
  }, [affectations, filter]);

  const valideesCount = affectations.filter(a => a.statut === 'VALIDEE').length;
  const enAttenteCount = affectations.filter(a => a.statut === 'EN_ATTENTE').length;
  const heuresTotal = affectations
    .filter(a => a.statut === 'VALIDEE')
    .reduce((sum, a) => sum + a.heuresCount, 0);

  const handleCancelReservation = async () => {
    if (!cancelModalItem) return;
    setSubmitting(true);
    try {
      const seanceId = cancelModalItem.seanceId || cancelModalItem.id;
      const res = await fetch(`${API_URL}/api/seances/${seanceId}/annuler-reservation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ motif: 'Annulé par l\'assistant depuis Mes séances' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'annulation.');

      setFeedback({ message: 'Réservation annulée avec succès.', type: 'success' });
      setCancelModalItem(null);
      await fetchAffectations();
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[14px] text-text-secondary">Chargement de votre planning...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-12">
      {/* Title & View Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[24px] font-bold text-text-primary tracking-tight">Mes Séances de TP</h2>
          <p className="text-[13.5px] text-text-secondary mt-1">
            Consultez votre historique et le calendrier de vos séances d'encadrement.
          </p>
        </div>

        <div className="inline-flex bg-content-bg p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-all ${viewMode === 'list' ? 'bg-card-bg text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            📋 Liste
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold border-none cursor-pointer transition-all ${viewMode === 'calendar' ? 'bg-card-bg text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            📅 Calendrier
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-[13px] font-medium flex items-center justify-between gap-2 shadow-sm ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
          }`}>
          <span>{feedback.type === 'success' ? '✅' : '⚠️'} {feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="border-none bg-transparent cursor-pointer text-text-muted">✕</button>
        </div>
      )}

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl shrink-0">
            ✅
          </div>
          <div>
            <div className="text-[24px] font-bold text-text-primary leading-none">{valideesCount}</div>
            <div className="text-[12.5px] text-text-secondary mt-1 font-medium">Séances validées</div>
          </div>
        </div>

        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl shrink-0">
            ⏳
          </div>
          <div>
            <div className="text-[24px] font-bold text-text-primary leading-none">{enAttenteCount}</div>
            <div className="text-[12.5px] text-text-secondary mt-1 font-medium">En attente de validation</div>
          </div>
        </div>

        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
            ⏱️
          </div>
          <div>
            <div className="text-[24px] font-bold text-text-primary leading-none">{heuresTotal}h</div>
            <div className="text-[12.5px] text-text-secondary mt-1 font-medium">Heures d'encadrement validées</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        {([
          { key: 'avenir', label: 'À venir' },
          { key: 'passees', label: 'Passées' },
          { key: 'toutes', label: 'Toutes les séances' },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`py-1.5 px-4 rounded-xl text-[13px] font-medium transition-all cursor-pointer border ${filter === t.key
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-card-bg text-text-secondary border-border hover:bg-content-bg'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List / Cards */}
      <div className="flex flex-col gap-3">
        {filtered.map(a => {
          const statutMeta = STATUT_LABELS[a.statut] || STATUT_LABELS.EN_ATTENTE;
          const isFuture = new Date(a.date) >= today;
          const canCancel = isFuture && a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE';

          return (
            <div key={a.id} className="bg-card-bg border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: a.matiereCouleur || '#4361ee' }}></div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[15px] font-bold text-text-primary">{a.matiere}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: (a.matiereCouleur || '#4361ee') + '20', color: a.matiereCouleur || '#4361ee' }}>
                      {a.matiereCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-content-bg text-text-secondary">
                      {a.type}
                    </span>
                  </div>
                  <div className="text-[13px] text-text-secondary mt-1 flex items-center gap-3 flex-wrap">
                    <span>📍 {a.salle || 'Salle non spécifiée'}</span>
                    <span>👥 {a.groupe}</span>
                    <span>⏱️ {a.heuresCount}h</span>
                  </div>
                  <div className="text-[12.5px] text-text-muted mt-0.5 font-medium">
                    📅 {new Date(a.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} • ⏰ {a.heureDebut} – {a.heureFin}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                <span className="px-3 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1.5" style={{ background: statutMeta.bg, color: statutMeta.color }}>
                  <span>●</span> {statutMeta.label}
                </span>

                {canCancel && (
                  <button
                    onClick={() => setCancelModalItem(a)}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-lg text-[12.5px] font-semibold border border-rose-500/20 cursor-pointer transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-card-bg border border-border rounded-xl py-12 flex flex-col items-center gap-2 text-center">
            <span className="text-4xl">📅</span>
            <p className="text-[14px] text-text-secondary font-medium mt-2">Aucune séance dans cette vue.</p>
            <p className="text-[12.5px] text-text-muted">Vous pouvez vous inscrire à de nouveaux TP depuis l'onglet "TPs Disponibles".</p>
          </div>
        )}
      </div>

      {/* Cancel Confirmation Modal */}
      {cancelModalItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-card-bg border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
            <h3 className="text-[17px] font-bold text-text-primary">Confirmer l'annulation</h3>
            <p className="text-[13px] text-text-secondary">
              Voulez-vous vraiment annuler votre réservation pour <strong>{cancelModalItem.matiere}</strong> ({cancelModalItem.groupe}) le {new Date(cancelModalItem.date).toLocaleDateString('fr-FR')} ?
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button onClick={() => setCancelModalItem(null)} className="px-4 py-2 bg-content-bg hover:bg-border text-text-primary rounded-xl text-[13px] font-medium border border-border cursor-pointer">
                Conserver
              </button>
              <button onClick={handleCancelReservation} disabled={submitting} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer">
                {submitting ? 'Annulation...' : 'Confirmer l\'annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
