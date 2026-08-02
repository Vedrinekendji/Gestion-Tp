import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AVATAR_COLORS = ['#4361ee', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9'];

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
  affecte: {
    id: number;
    assistantId: number;
    nom: string;
    statut: string;
  } | null;
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
  const [affectLoading, setAffectLoading] = useState(false);

  const fetchSeances = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/seances`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setSeances(data);
    } catch (err) {
      console.error('Erreur chargement séances:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssistants = async () => {
    try {
      const res = await fetch(`${API_URL}/api/assistants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
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

  const handleAffecter = async (seanceId: number, assistantId: number) => {
    try {
      setAffectLoading(true);
      const res = await fetch(`${API_URL}/api/affectations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seanceId, assistantId }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur lors de l\'affectation');
        return;
      }

      // Rafraîchir les séances
      await fetchSeances();
      setSelected(null);
    } catch (err) {
      console.error('Erreur affectation:', err);
    } finally {
      setAffectLoading(false);
    }
  };

  const selectedSeance = seances.find(s => s.id === selected);

  // Filtrer les assistants disponibles pour la séance sélectionnée
  const assistantsDispo = selectedSeance
    ? assistants.filter(a => a.statut === 'ACTIF').map(a => {
        const matiereMatch = a.matieres.includes(selectedSeance.matiereCode);
        return { ...a, matiereMatch, dispo: true };
      }).sort((a, b) => (b.matiereMatch ? 1 : 0) - (a.matiereMatch ? 1 : 0))
    : [];

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
          <span className="text-[14px] text-text-secondary">Chargement...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.3px]">Affectation intelligente</h2>
          <p className="text-[13px] text-text-secondary mt-[3px]">
            Sélection automatique avec{' '}
            <a href="#" className="text-primary no-underline">détection de conflits et recommandations</a>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-3.5 min-h-[500px]">
        {/* Left panel — séances */}
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5 flex flex-col">
          <p className="text-[13.5px] font-semibold text-text-primary mb-3">Séances à affecter</p>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {seances.map(s => (
              <div
                key={s.id}
                className={`p-3 border rounded-md cursor-pointer transition-all border-l-[3px] hover:bg-content-bg ${selected === s.id ? 'border-l-primary bg-primary-light border-primary/20' : 'border-border border-l-transparent'}`}
                onClick={() => setSelected(s.id)}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[13.5px] font-semibold text-text-primary">{s.matiere}</span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide" style={{
                    background: s.type === 'TP' ? '#eef0fd' : '#ecfdf5',
                    color: s.type === 'TP' ? '#4361ee' : '#10b981'
                  }}>★ {s.type}</span>
                </div>
                <div className="text-[11.5px] text-text-muted mt-0.5">{s.groupe} · {new Date(s.date).toLocaleDateString('fr-FR')} · {s.heureDebut}–{s.heureFin}</div>
                <div className="text-[11.5px] text-text-muted mt-0.5">{s.salle} · {s.niveau}</div>
                {s.affecte ? (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-success-light text-success mt-1.5">✓ {s.affecte.nom}</span>
                ) : (
                  <span className="inline-block text-[12px] text-warning font-medium mt-1.5">Non affecté</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — assistants disponibles */}
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5 flex flex-col">
          {!selectedSeance ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-[60px] px-5">
              <div className="w-[72px] h-[72px] bg-content-bg rounded-[18px] flex items-center justify-center text-text-muted">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.5"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
              </div>
              <h3 className="text-[17px] font-semibold text-text-primary">Sélectionnez une séance</h3>
              <p className="text-[13px] text-text-secondary text-center">Choisissez une séance pour voir les assistants disponibles</p>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <h3 className="text-[15px] font-semibold text-text-primary">Assistants disponibles</h3>
                <p className="text-[12.5px] text-text-secondary mt-[3px]">Pour : <strong>{selectedSeance.matiere}</strong> · {selectedSeance.heureDebut}–{selectedSeance.heureFin}</p>
              </div>
              {selectedSeance.affecte ? (
                <div className="bg-success-light border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-success font-semibold text-[14px]">✓ Déjà affecté à {selectedSeance.affecte.nom}</p>
                  <p className="text-[12px] text-text-secondary mt-1">Statut : {selectedSeance.affecte.statut}</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {assistantsDispo.map(a => (
                    <div key={a.id} className={`flex items-center gap-3.5 p-3.5 border border-border rounded-md transition-all hover:shadow-md bg-white`}>
                      <div className="flex items-center justify-center rounded-full font-semibold text-[13px] shrink-0 w-9 h-9" style={{ background: getColor(a.id), color: '#fff' }}>{getInitials(a.nom)}</div>
                      <div className="flex-1">
                        <span className="text-[13.5px] font-semibold text-text-primary block mb-1.5">
                          {a.nom}
                          {a.matiereMatch && <span className="ml-2 text-[10px] text-success font-bold bg-success-light px-1.5 py-0.5 rounded">★ Recommandé</span>}
                        </span>
                        <div className="flex gap-1.5 flex-wrap mb-1.5">
                          {a.matieres.map((m: string) => (
                            <span key={m} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold tracking-wide bg-content-bg text-text-secondary">{m}</span>
                          ))}
                        </div>
                        <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden w-[120px] mt-1.5">
                          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${(a.heuresTotal / a.heuresMax) * 100}%`, background: getColor(a.id) }}/>
                        </div>
                        <span className="text-[11px] text-text-muted">{a.heuresTotal}h / {a.heuresMax}h</span>
                      </div>
                      <button
                        className="inline-flex items-center justify-center gap-1.5 py-1 px-3 text-[12.5px] font-medium rounded transition-all bg-primary text-white border-none cursor-pointer hover:bg-primary-dark disabled:opacity-50 disabled:cursor-wait"
                        disabled={affectLoading}
                        onClick={() => handleAffecter(selectedSeance.id, a.id)}
                      >
                        Affecter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
