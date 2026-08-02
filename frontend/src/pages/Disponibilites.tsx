import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AVATAR_COLORS = ['#4361ee', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9'];

const CRENEAUX = ['08:00', '10:00', '14:00', '16:00'];
const CRENEAUX_FIN = ['10:00', '12:00', '16:00', '18:00'];
const CRENEAUX_LABELS = ['08h - 10h', '10h - 12h', '14h - 16h', '16h - 18h'];
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
// jourSemaine mapping: 1=Lundi, 2=Mardi, 3=Mercredi, 4=Jeudi, 5=Vendredi

interface AssistantSummary {
  id: number;
  nom: string;
  initials: string;
  statut: string;
  libres: number;
  disponibilites: DispoSlot[];
  seances: SeanceSlot[];
}

interface DispoSlot {
  id: number;
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  estDisponible: boolean;
}

interface SeanceSlot {
  jourSemaine: number;
  heureDebut: string;
  heureFin: string;
  matiere: string;
  groupe: string;
  salle: string;
  statut: string;
}

export default function Disponibilites() {
  const { token, user } = useAuth();
  const isAssistant = user?.role === 'assistant';
  const [assistants, setAssistants] = useState<AssistantSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/disponibilites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setAssistants(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement disponibilités:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const selectedAssistant = assistants.find(a => a.id === selectedId);

  const getCell = (jourIdx: number, creneauIdx: number) => {
    if (!selectedAssistant) return null;
    const jourSemaine = jourIdx + 1; // 1=Lundi...5=Vendredi
    const hd = CRENEAUX[creneauIdx];

    // Check séances (occupé / en attente)
    const seance = selectedAssistant.seances.find(
      s => s.jourSemaine === jourSemaine && s.heureDebut === hd
    );
    if (seance) {
      return {
        type: seance.statut === 'EN_ATTENTE' ? 'attente' : 'occupé',
        matiere: seance.matiere,
        groupe: seance.groupe,
        salle: seance.salle,
      };
    }

    // Check disponibilités
    const dispo = selectedAssistant.disponibilites.find(
      d => d.jourSemaine === jourSemaine && d.heureDebut === hd
    );
    if (dispo && dispo.estDisponible) {
      return { type: 'disponible', dispoId: dispo.id };
    }

    return null;
  };

  const handleAddDispo = async (jourIdx: number, creneauIdx: number) => {
    if (!selectedAssistant) return;
    try {
      const res = await fetch(`${API_URL}/api/disponibilites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assistantId: selectedAssistant.id,
          jourSemaine: jourIdx + 1,
          heureDebut: CRENEAUX[creneauIdx],
          heureFin: CRENEAUX_FIN[creneauIdx],
        }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Erreur ajout disponibilité:', err);
    }
  };

  const handleDeleteDispo = async (dispoId: number) => {
    try {
      const res = await fetch(`${API_URL}/api/disponibilites/${dispoId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Erreur suppression disponibilité:', err);
    }
  };

  const getColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

  // Stats
  const dispoCount = selectedAssistant?.disponibilites.filter(d => d.estDisponible).length || 0;
  const occupeCount = selectedAssistant?.seances.filter(s => s.statut === 'VALIDEE').length || 0;
  const attenteCount = selectedAssistant?.seances.filter(s => s.statut === 'EN_ATTENTE').length || 0;

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
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.3px]">{isAssistant ? 'Mes disponibilités' : 'Gestion des disponibilités'}</h2>
          <p className="text-[13px] text-text-secondary mt-[3px]">{isAssistant ? 'Cliquez sur un créneau pour indiquer vos disponibilités' : 'Planning hebdomadaire interactif par assistant'}</p>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[12.5px] font-medium text-success">● Disponible</span>
          <span className="text-[12.5px] font-medium text-danger">● Occupé</span>
          <span className="text-[12.5px] font-medium text-warning">● En attente</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3.5">
        <div className="py-4 px-5 rounded-xl border bg-green-50 border-green-200">
          <div className="text-[28px] font-bold leading-none text-success">{dispoCount}</div>
          <div className="text-[13px] text-text-secondary mt-1">Disponible</div>
        </div>
        <div className="py-4 px-5 rounded-xl border bg-red-50 border-red-200">
          <div className="text-[28px] font-bold leading-none text-danger">{occupeCount}</div>
          <div className="text-[13px] text-text-secondary mt-1">Occupé</div>
        </div>
        <div className="py-4 px-5 rounded-xl border bg-yellow-50 border-yellow-200">
          <div className="text-[28px] font-bold leading-none text-warning">{attenteCount}</div>
          <div className="text-[13px] text-text-secondary mt-1">En attente</div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAssistant ? '' : 'lg:grid-cols-[200px_1fr]'} gap-3.5 min-h-0`}>
        {/* Left: assistant list (masqué pour un assistant, qui ne voit que son propre planning) */}
        {!isAssistant && (
          <div className="bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden p-0">
            <p className="text-[12px] font-semibold text-text-muted tracking-[0.04em] py-3.5 px-3.5 pb-2 uppercase">Assistants</p>
            {assistants.map(a => (
              <div
                key={a.id}
                className={`flex items-center gap-2 py-2.5 px-3 cursor-pointer transition-all border-l-[3px] hover:bg-content-bg ${selectedId === a.id ? 'bg-primary-light border-primary' : 'border-transparent'}`}
                onClick={() => setSelectedId(a.id)}
              >
                <div className="flex items-center justify-center rounded-full font-semibold text-[11px] shrink-0 w-[30px] h-[30px]" style={{ background: getColor(a.id), color: '#fff' }}>{a.initials}</div>
                <div className="flex-1 min-w-0">
                  <span className="block text-[12.5px] font-semibold text-text-primary whitespace-nowrap overflow-hidden text-ellipsis">{a.nom}</span>
                  <span className="block text-[10.5px] text-text-muted mt-[1px]">{a.libres} créneau{a.libres > 1 ? 'x' : ''} libre{a.libres > 1 ? 's' : ''}</span>
                </div>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${a.statut === 'ACTIF' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                  ● {a.statut === 'ACTIF' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Right: calendar */}
        <div className="bg-card-bg border border-border rounded-xl shadow-sm overflow-auto p-0">
          <table className="w-full border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-[#0d1421]">
                <th className="py-3 px-2.5 text-left pl-4 text-[12px] font-semibold text-white tracking-[0.02em]">CRÉNEAU</th>
                {JOURS.map(j => (
                  <th key={j} className="py-3 px-2.5 text-center text-[12px] font-semibold text-white tracking-[0.02em]">{j}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CRENEAUX_LABELS.map((cr, crIdx) => (
                <tr key={cr}>
                  <td className="py-2.5 px-4 text-[12px] font-semibold text-text-secondary whitespace-nowrap border border-border bg-[#f8f9fc]">{cr}</td>
                  {JOURS.map((j, jIdx) => {
                    const cell = getCell(jIdx, crIdx);
                    return (
                      <td key={j} className="p-1.5 border border-border w-[180px] min-h-[70px] align-top">
                        {cell ? (
                          <div className={`relative rounded-md py-2 px-2.5 min-h-[60px] text-[11.5px] ${cell.type === 'occupé' ? 'bg-red-50 border border-red-200' : cell.type === 'disponible' ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                            {cell.matiere && (
                              <>
                                <div className="text-text-primary text-[11px] mb-[3px]">★ <strong>{cell.matiere}</strong></div>
                                <div className="text-[10.5px] text-text-secondary">{cell.groupe}</div>
                                <div className="text-[10.5px] text-text-secondary">{cell.salle}</div>
                                <div className={`mt-1 text-[10px] font-bold ${cell.type === 'occupé' ? 'text-danger' : 'text-warning'}`}>
                                  {cell.type === 'occupé' ? 'Occupé' : 'En attente'}
                                </div>
                              </>
                            )}
                            {cell.type === 'disponible' && (
                              <div className="text-success text-[11px] font-semibold py-1">● Disponible</div>
                            )}
                            {cell.type === 'disponible' && cell.dispoId && (
                              <button
                                className="absolute top-1 right-1.5 bg-transparent border-none cursor-pointer text-[14px] text-text-muted leading-none p-0 hover:text-danger transition-colors"
                                onClick={() => handleDeleteDispo(cell.dispoId!)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ) : (
                          <div
                            className="min-h-[60px] flex items-center justify-center text-border text-[18px] cursor-pointer rounded-md transition-all hover:bg-primary-light hover:text-primary"
                            onClick={() => handleAddDispo(jIdx, crIdx)}
                          >
                            +
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
