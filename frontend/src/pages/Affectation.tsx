import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  FiStar,
  FiCheck,
  FiX,
  FiClock,
  FiCheckCircle,
  FiAlertTriangle,
  FiUser,
  FiSearch,
  FiTrash2,
  FiBell,
  FiUsers,
  FiMapPin,
  FiCalendar,
  FiCheckSquare,
  FiXSquare
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const AVATAR_COLORS = ['#4361ee', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9'];

interface AffectationItem {
  id: number;
  assistantId: number;
  nom: string;
  email?: string;
  statut: 'EN_ATTENTE' | 'VALIDEE' | 'REFUSEE' | 'ANNULEE';
}

interface SeanceData {
  id: number;
  matiere: string;
  matiereCode: string;
  matiereCouleur: string;
  groupe: string;
  date: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  type: string;
  niveau: string;
  nombreAssistantsRequis: number;
  placesPrises: number;
  professeur: string;
  affectations: AffectationItem[];
}

interface AssistantDispoData {
  id: number;
  nom: string;
  email: string;
  matieres: string[];
  heuresTotal: number;
  heuresMax: number;
  heuresValidees: number;
  statut: string;
}

export default function Affectation() {
  const { token } = useAuth();
  const [seances, setSeances] = useState<SeanceData[]>([]);
  const [assistants, setAssistants] = useState<AssistantDispoData[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSeances = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/seances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement des séances');
      const data = await res.json();
      setSeances(data);
    } catch (err: any) {
      console.error('Erreur chargement séances:', err);
      setFeedback({ message: err.message || 'Impossible de charger les séances.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistants = async () => {
    try {
      const res = await fetch(`${API_URL}/api/assistants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement des assistants');
      const data = await res.json();
      setAssistants(data);
    } catch (err) {
      console.error('Erreur chargement assistants:', err);
    }
  };

  useEffect(() => {
    fetchSeances();
    fetchAssistants();
  }, []);

  const handleUpdateStatus = async (affectationId: number, statut: 'VALIDEE' | 'REFUSEE' | 'ANNULEE') => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/affectations/${affectationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ statut }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de statut');

      const labels = {
        VALIDEE: 'Réservation validée avec succès.',
        REFUSEE: 'Réservation refusée.',
        ANNULEE: 'Affectation annulée.'
      };

      setFeedback({ message: labels[statut] || 'Mise à jour effectuée.', type: 'success' });
      await fetchSeances();
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAffecter = async (seanceId: number, assistantId: number) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/affectations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seanceId, assistantId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'affectation');

      setFeedback({ message: 'Assistant affecté avec succès.', type: 'success' });
      await fetchSeances();
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAffectation = async (affectationId: number) => {
    if (!window.confirm('Voulez-vous vraiment retirer cet assistant de cette séance ?')) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${API_URL}/api/affectations/${affectationId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors de la suppression');
      setFeedback({ message: 'Affectation supprimée.', type: 'success' });
      await fetchSeances();
    } catch (err: any) {
      setFeedback({ message: err.message, type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingRequests = useMemo(() => {
    const requests: { seance: SeanceData; affectation: AffectationItem }[] = [];
    seances.forEach(s => {
      s.affectations?.forEach(af => {
        if (af.statut === 'EN_ATTENTE') {
          requests.push({ seance: s, affectation: af });
        }
      });
    });
    return requests;
  }, [seances]);

  const filteredSeances = useMemo(() => {
    return seances.filter(s => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query ||
        s.matiere.toLowerCase().includes(query) ||
        s.groupe.toLowerCase().includes(query) ||
        s.salle.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const activeAffs = s.affectations?.filter(a => a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE') || [];
      const hasPending = s.affectations?.some(a => a.statut === 'EN_ATTENTE');
      const isAssigned = activeAffs.length >= (s.nombreAssistantsRequis || 1);

      if (filterStatus === 'PENDING') return hasPending;
      if (filterStatus === 'ASSIGNED') return isAssigned;
      if (filterStatus === 'UNASSIGNED') return activeAffs.length === 0;

      return true;
    });
  }, [seances, searchQuery, filterStatus]);

  const selectedSeance = seances.find(s => s.id === selected);

  // Parse HH:MM helper
  const parseMin = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Compute availability & schedule conflict for candidates
  const candidatesList = useMemo(() => {
    if (!selectedSeance) return [];

    const targetDate = new Date(selectedSeance.date).toISOString().split('T')[0];
    const targetStart = parseMin(selectedSeance.heureDebut);
    const targetEnd = parseMin(selectedSeance.heureFin);

    return assistants.map(ast => {
      const alreadyAssigned = selectedSeance.affectations?.some(
        af => af.assistantId === ast.id && af.statut !== 'ANNULEE' && af.statut !== 'REFUSEE'
      );

      // Check schedule conflict with other sessions assigned to this assistant
      let hasConflict = false;
      let conflictReason = '';

      if (ast.statut !== 'ACTIF') {
        hasConflict = true;
        conflictReason = 'Compte inactif';
      } else {
        seances.forEach(otherSeance => {
          if (otherSeance.id === selectedSeance.id) return;
          const otherDate = new Date(otherSeance.date).toISOString().split('T')[0];
          if (otherDate !== targetDate) return;

          const isAssignedToOther = otherSeance.affectations?.some(
            af => af.assistantId === ast.id && af.statut !== 'ANNULEE' && af.statut !== 'REFUSEE'
          );

          if (isAssignedToOther) {
            const oStart = parseMin(otherSeance.heureDebut);
            const oEnd = parseMin(otherSeance.heureFin);
            if (oStart < targetEnd && oEnd > targetStart) {
              hasConflict = true;
              conflictReason = `Conflit horaire avec ${otherSeance.matiere} (${otherSeance.heureDebut}-${otherSeance.heureFin})`;
            }
          }
        });
      }

      const matiereMatch = ast.matieres.includes(selectedSeance.matiereCode);

      return {
        ...ast,
        alreadyAssigned,
        hasConflict,
        conflictReason,
        matiereMatch,
      };
    }).filter(a => !a.alreadyAssigned);
  }, [selectedSeance, assistants, seances]);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[14px] text-text-secondary">Chargement de la gestion des affectations...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card-bg border border-border p-5 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.3px]">Validation & Affectation des TPs</h2>
          <p className="text-[13px] text-text-secondary mt-[3px]">
            Validez les réservations des assistants et vérifiez automatiquement leurs disponibilités sans conflit.
          </p>
        </div>

        {pendingRequests.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-600 px-3.5 py-2 rounded-xl text-[13px] font-semibold self-start sm:self-auto">
            <FiBell className="text-amber-500 animate-bounce" />
            <span>{pendingRequests.length} demande{pendingRequests.length > 1 ? 's' : ''} en attente</span>
          </div>
        )}
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className={`p-4 rounded-xl text-[13.5px] font-medium flex items-center justify-between gap-2 shadow-sm ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
          <span className="flex items-center gap-2">{feedback.type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />} {feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="border-none bg-transparent cursor-pointer text-text-muted flex items-center justify-center"><FiX /></button>
        </div>
      )}

      {/* PENDING RESERVATIONS QUICK VALIDATION BAR */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-text-primary flex items-center gap-2">
              <FiClock className="text-amber-500" /> Demandes de réservation à valider ({pendingRequests.length})
            </h3>
            <span className="text-[12px] text-text-muted">Action requise de votre part</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingRequests.map(({ seance, affectation }) => (
              <div key={affectation.id} className="bg-white border border-amber-500/20 rounded-xl p-3.5 shadow-xs flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[13.5px] font-bold text-text-primary truncate">{seance.matiere}</span>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <FiClock /> En attente
                    </span>
                  </div>
                  <div className="text-[12px] text-text-secondary flex items-center gap-1.5 mt-1">
                    <FiUser className="text-primary shrink-0" />
                    <span className="font-semibold text-text-primary">{affectation.nom}</span>
                  </div>
                  <div className="text-[11.5px] text-text-muted mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                    <span>{seance.groupe}</span> ·
                    <span>{new Date(seance.date).toLocaleDateString('fr-FR')}</span> ·
                    <span>{seance.heureDebut}–{seance.heureFin}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(affectation.id, 'VALIDEE')}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                  >
                    <FiCheck /> Valider
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpdateStatus(affectation.id, 'REFUSEE')}
                    className="flex-1 py-1.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[12px] font-semibold border border-rose-200 cursor-pointer transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <FiX /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 min-h-[550px]">
        {/* Left Column — Session Selector */}
        <div className="bg-card-bg border border-border rounded-2xl shadow-sm p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-text-primary">Séances ({filteredSeances.length})</h3>
            <span className="text-[11px] text-text-muted">Sélectionnez pour gérer</span>
          </div>

          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Rechercher matière, groupe, salle..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-content-bg border border-border rounded-xl text-[12.5px] text-text-primary focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setFilterStatus('ALL')} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap cursor-pointer ${filterStatus === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-content-bg text-text-secondary border-border hover:bg-border'}`}>Toutes</button>
            <button onClick={() => setFilterStatus('PENDING')} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap cursor-pointer ${filterStatus === 'PENDING' ? 'bg-amber-500 text-white border-amber-500' : 'bg-content-bg text-text-secondary border-border hover:bg-border'}`}>En attente</button>
            <button onClick={() => setFilterStatus('ASSIGNED')} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap cursor-pointer ${filterStatus === 'ASSIGNED' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-content-bg text-text-secondary border-border hover:bg-border'}`}>Pourvues</button>
            <button onClick={() => setFilterStatus('UNASSIGNED')} className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap cursor-pointer ${filterStatus === 'UNASSIGNED' ? 'bg-rose-500 text-white border-rose-500' : 'bg-content-bg text-text-secondary border-border hover:bg-border'}`}>Libres</button>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px] pr-1">
            {filteredSeances.map(s => {
              const activeAffs = s.affectations?.filter(a => a.statut !== 'ANNULEE' && a.statut !== 'REFUSEE') || [];
              const hasPending = s.affectations?.some(a => a.statut === 'EN_ATTENTE');
              const isSelected = selected === s.id;

              return (
                <div
                  key={s.id}
                  onClick={() => setSelected(s.id)}
                  className={`p-3.5 border rounded-xl cursor-pointer transition-all border-l-[4px] hover:shadow-sm ${isSelected ? 'border-l-primary bg-primary-light border-primary/30' : 'border-border border-l-transparent bg-white hover:bg-content-bg'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13.5px] font-bold text-text-primary truncate">{s.matiere}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold" style={{
                      background: s.type === 'TP' ? '#eef0fd' : '#ecfdf5',
                      color: s.type === 'TP' ? '#4361ee' : '#10b981'
                    }}>
                      <FiStar className="inline -mt-0.5 mr-1" /> {s.type}
                    </span>
                  </div>

                  <div className="text-[11.5px] text-text-secondary mt-1">
                    {s.groupe} · {new Date(s.date).toLocaleDateString('fr-FR')} · {s.heureDebut}–{s.heureFin}
                  </div>
                  <div className="text-[11.5px] text-text-muted mt-0.5">
                    {s.salle} · {s.niveau}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50">
                    <span className="text-[11px] font-medium text-text-muted">
                      Places : {activeAffs.length} / {s.nombreAssistantsRequis || 1}
                    </span>

                    {hasPending ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <FiClock /> Valider demande
                      </span>
                    ) : activeAffs.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <FiCheck /> Affecté
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                        Non affecté
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column — Details & Assistant Management */}
        <div className="bg-card-bg border border-border rounded-2xl shadow-sm p-6 flex flex-col">
          {!selectedSeance ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-[80px] px-5 text-center">
              <div className="w-[72px] h-[72px] bg-content-bg rounded-2xl flex items-center justify-center text-text-muted border border-border">
                <FiUsers className="text-3xl" />
              </div>
              <h3 className="text-[18px] font-bold text-text-primary">Gestion d'une séance</h3>
              <p className="text-[13px] text-text-secondary max-w-[340px]">
                Cliquez sur une séance dans la colonne de gauche pour valider ses réservations ou lui attribuer un assistant.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Session Overview Box */}
              <div className="bg-content-bg border border-border p-4 rounded-xl flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[17px] font-bold text-text-primary">{selectedSeance.matiere}</h3>
                  <span className="text-[11px] font-bold px-2.5 py-1 bg-primary-light text-primary rounded-lg">
                    {selectedSeance.type}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12.5px] text-text-secondary mt-1 pt-2 border-t border-border/60">
                  <div><FiUsers className="inline -mt-0.5 mr-1" /> Groupe: <strong>{selectedSeance.groupe}</strong></div>
                  <div><FiCalendar className="inline -mt-0.5 mr-1" /> Date: <strong>{new Date(selectedSeance.date).toLocaleDateString('fr-FR')}</strong></div>
                  <div><FiClock className="inline -mt-0.5 mr-1" /> Horaires: <strong>{selectedSeance.heureDebut}–{selectedSeance.heureFin}</strong></div>
                  <div><FiMapPin className="inline -mt-0.5 mr-1" /> Salle: <strong>{selectedSeance.salle}</strong></div>
                </div>
              </div>

              {/* Current Affectations / Reservations Section */}
              <div className="flex flex-col gap-3">
                <h4 className="text-[14px] font-bold text-text-primary flex items-center gap-2">
                  <FiCheckCircle className="text-emerald-600" /> Affectations actuelles & Demandes
                </h4>

                {selectedSeance.affectations && selectedSeance.affectations.length > 0 ? (
                  <div className="flex flex-col gap-2.5">
                    {selectedSeance.affectations.map(af => (
                      <div key={af.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-border rounded-xl shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-[12.5px]">
                            {getInitials(af.nom)}
                          </div>
                          <div>
                            <span className="text-[13.5px] font-bold text-text-primary block">{af.nom}</span>
                            {af.email && <span className="text-[11.5px] text-text-muted">{af.email}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          {af.statut === 'VALIDEE' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                              <FiCheck /> Validée
                            </span>
                          )}
                          {af.statut === 'EN_ATTENTE' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                              <FiClock /> En attente
                            </span>
                          )}
                          {af.statut === 'REFUSEE' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                              <FiX /> Refusée
                            </span>
                          )}

                          {af.statut === 'EN_ATTENTE' && (
                            <>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(af.id, 'VALIDEE')}
                                className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11.5px] font-semibold border-none cursor-pointer transition-all flex items-center gap-1"
                              >
                                <FiCheck /> Valider
                              </button>
                              <button
                                disabled={actionLoading}
                                onClick={() => handleUpdateStatus(af.id, 'REFUSEE')}
                                className="py-1 px-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[11.5px] font-semibold border border-rose-200 cursor-pointer transition-all flex items-center gap-1"
                              >
                                <FiX /> Refuser
                              </button>
                            </>
                          )}

                          <button
                            disabled={actionLoading}
                            onClick={() => handleDeleteAffectation(af.id)}
                            title="Retirer cet assistant"
                            className="p-1.5 text-text-muted hover:text-rose-600 bg-transparent border-none cursor-pointer rounded transition-colors ml-1"
                          >
                            <FiTrash2 className="text-[15px]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-border bg-content-bg text-center text-text-muted text-[13px]">
                    Aucune affectation ni demande pour cette séance.
                  </div>
                )}
              </div>

              {/* Manual Assignment Section with Real-time Conflict Verification */}
              <div className="flex flex-col gap-3 pt-4 border-t border-border">
                <div>
                  <h4 className="text-[14px] font-bold text-text-primary">Affecter un assistant disponible</h4>
                  <p className="text-[12px] text-text-secondary mt-0.5">
                    Vérification automatique de disponibilité et des conflits d'emploi du temps.
                  </p>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {candidatesList.map(a => (
                    <div key={a.id} className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 border rounded-xl transition-all ${a.hasConflict ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-border hover:shadow-sm'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full font-semibold text-[12px] flex items-center justify-center shrink-0 text-white" style={{ background: getColor(a.id) }}>
                          {getInitials(a.nom)}
                        </div>
                        <div>
                          <span className="text-[13px] font-bold text-text-primary flex items-center gap-1.5">
                            {a.nom}
                            {a.matiereMatch && (
                              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.2 rounded flex items-center gap-1">
                                <FiStar /> Recommandé
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-text-muted">Charge: {a.heuresTotal}h/{a.heuresMax}h</span>
                            {/* Availability status badge */}
                            {!a.hasConflict ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <FiCheckSquare /> Assistant disponible
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full flex items-center gap-1" title={a.conflictReason}>
                                <FiXSquare /> Impossible : conflit horaire
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={actionLoading || a.hasConflict}
                        onClick={() => handleAffecter(selectedSeance.id, a.id)}
                        className={`py-1.5 px-3 rounded-lg text-[12px] font-semibold border-none cursor-pointer transition-all shrink-0 flex items-center gap-1 shadow-xs ${a.hasConflict
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-primary hover:bg-primary-dark text-white'
                          }`}
                      >
                        <FiCheck /> {a.hasConflict ? 'Conflit' : 'Affecter'}
                      </button>
                    </div>
                  ))}

                  {candidatesList.length === 0 && (
                    <div className="text-center py-6 text-text-muted text-[12.5px]">
                      Tous les assistants actifs sont déjà affectés à cette séance.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
