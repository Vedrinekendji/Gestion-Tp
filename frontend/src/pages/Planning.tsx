import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface Seance {
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
    nombreAssistantsRequis: number;
    placesPrises: number;
    professeur: string;
    affectations: { id: number; assistantId: number; nom: string; email?: string; statut: string }[];
}

interface LogHistorique {
    id: number;
    seanceId?: number;
    action: string;
    dateAction: string;
    ancienStatut: string | null;
    nouveauStatut: string | null;
    effectuePar: string | null;
    commentaire: string | null;
    seance?: { matiere?: { nom: string }; groupe?: string; date?: string };
}

const JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const COLORS: Record<string, { bg: string; color: string }> = {
    PLANIFIEE: { bg: 'rgba(59, 130, 246, 0.12)', color: '#2563eb' },
    EN_COURS: { bg: 'rgba(245, 158, 11, 0.12)', color: '#d97706' },
    TERMINEE: { bg: 'rgba(34, 197, 94, 0.12)', color: '#16a34a' },
    ANNULEE: { bg: 'rgba(239, 68, 68, 0.12)', color: '#dc2626' },
};

export default function Planning() {
    const { token } = useAuth();
    const [seances, setSeances] = useState<Seance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Filter States
    const [search, setSearch] = useState('');
    const [filterMatiere, setFilterMatiere] = useState('');
    const [filterJour, setFilterJour] = useState('');
    const [filterStatut, setFilterStatut] = useState('');

    // Modals
    const [showImportModal, setShowImportModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Import State
    const [csvText, setCsvText] = useState('');
    const [importing, setImporting] = useState(false);

    // History State
    const [historyLogs, setHistoryLogs] = useState<LogHistorique[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const fetchSeances = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await window.fetch(`${API_URL}/api/seances`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur de chargement');
            setSeances(await res.json());
        } catch {
            setError('Impossible de charger le planning.');
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const res = await window.fetch(`${API_URL}/api/seances/historique`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                setHistoryLogs(await res.json());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchSeances();
    }, []);

    const matieres = useMemo(() => [...new Set(seances.map(s => s.matiere))].sort(), [seances]);

    const totalSeances = seances.length;
    const completeSeances = seances.filter(s => s.placesPrises >= (s.nombreAssistantsRequis || 1)).length;
    const partielSeances = seances.filter(s => s.placesPrises > 0 && s.placesPrises < (s.nombreAssistantsRequis || 1)).length;
    const vacantsSeances = seances.filter(s => s.placesPrises === 0).length;

    const filtered = useMemo(() => {
        return seances.filter(s => {
            const d = new Date(s.date);
            const jourStr = d.toLocaleDateString('fr-FR', { weekday: 'long' });
            const matchSearch = !search || [s.matiere, s.groupe, s.salle || '', s.professeur, s.matiereCode].join(' ').toLowerCase().includes(search.toLowerCase());
            const matchMatiere = !filterMatiere || s.matiere === filterMatiere;
            const matchJour = !filterJour || jourStr === filterJour;
            let matchStatut = true;
            if (filterStatut === 'vacant') matchStatut = s.placesPrises === 0;
            if (filterStatut === 'occupe') matchStatut = s.placesPrises > 0;
            if (filterStatut === 'complet') matchStatut = s.placesPrises >= (s.nombreAssistantsRequis || 1);
            return matchSearch && matchMatiere && matchJour && matchStatut;
        });
    }, [seances, search, filterMatiere, filterJour, filterStatut]);

    // Group by date
    const grouped = useMemo(() => {
        const map: Record<string, Seance[]> = {};
        for (const s of filtered) {
            const key = s.date.split('T')[0];
            if (!map[key]) map[key] = [];
            map[key].push(s);
        }
        return map;
    }, [filtered]);

    const sortedDays = useMemo(() => Object.keys(grouped).sort(), [grouped]);

    // Handle CSV Import
    const handleImportSubmit = async () => {
        if (!csvText.trim()) return;
        setImporting(true);
        setFeedback(null);
        try {
            // Parse CSV / Tab-separated lines
            const lines = csvText.trim().split('\n').map(l => l.trim()).filter(Boolean);
            const rows = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // detect separator: tab or semicolon or comma
                let parts = line.split('\t');
                if (parts.length < 3) parts = line.split(';');
                if (parts.length < 3) parts = line.split(',');

                if (parts.length >= 4) {
                    // If first row is header, skip
                    if (i === 0 && (parts[0].toLowerCase().includes('prof') || parts[0].toLowerCase().includes('nom') || parts[2].toLowerCase().includes('matiere'))) {
                        continue;
                    }

                    // Expected: Prof, Salle, Groupe, Matiere, Jour, Date, HeureDebut, HeureFin
                    const professeurNom = parts[0] ? parts[0].trim() : 'Professeur Inconnu';
                    const salle = parts[1] ? parts[1].trim() : 'Salle TP';
                    const groupe = parts[2] ? parts[2].trim() : 'Gr1';
                    const matiereNom = parts[3] ? parts[3].trim() : 'Matière TP';
                    const dateRaw = parts[5] ? parts[5].trim() : new Date().toISOString().split('T')[0];
                    const heureDebut = parts[6] ? parts[6].trim() : '08:30';
                    const heureFin = parts[7] ? parts[7].trim() : '10:30';

                    // Format Date dd/mm/yyyy -> yyyy-mm-dd
                    let formattedDate = dateRaw;
                    if (dateRaw.includes('/')) {
                        const [d, m, y] = dateRaw.split('/');
                        formattedDate = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                    }

                    rows.push({
                        professeurNom,
                        salle,
                        groupe,
                        matiereNom,
                        date: formattedDate,
                        heureDebut,
                        heureFin,
                        nombreAssistantsRequis: 1,
                    });
                }
            }

            if (rows.length === 0) {
                throw new Error('Aucune ligne valide reconnue. Formats supportés : CSV (tabulation, point-virgule ou virgule).');
            }

            const res = await window.fetch(`${API_URL}/api/seances/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ rows }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'import.');

            setFeedback({ message: `🎉 ${data.message}`, type: 'success' });
            setShowImportModal(false);
            setCsvText('');
            await fetchSeances();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        } finally {
            setImporting(false);
        }
    };

    // Handle Administrative Spot Liberation
    const handleLibererAssistant = async (seanceId: number, assistantId: number) => {
        if (!window.confirm('Voulez-vous vraiment désaffecter cet assistant de ce créneau ?')) return;
        try {
            const res = await window.fetch(`${API_URL}/api/seances/${seanceId}/annuler-reservation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ assistantId, motif: 'Libération administrative par l\'administrateur.' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la libération.');

            setFeedback({ message: 'Place libérée avec succès.', type: 'success' });
            await fetchSeances();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                    <span className="text-[14px] text-text-secondary">Chargement du planning global...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-12">
            {/* Header & Main Admin Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-bg border border-border p-5 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-[24px] font-bold text-text-primary tracking-tight">Gestion Globale du Planning TP</h2>
                    <p className="text-[13.5px] text-text-secondary mt-1">
                        Supervisez les créneaux de TP, importez les plannings et gérez les affectations des assistants.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
                    <button
                        onClick={() => {
                            fetchHistory();
                            setShowHistoryModal(true);
                        }}
                        className="px-3.5 py-2 bg-content-bg hover:bg-border text-text-primary rounded-xl text-[13px] font-semibold border border-border cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                        📜 Historique Audit
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                    >
                        📥 Importer Planning (CSV/Excel)
                    </button>
                </div>
            </div>

            {feedback && (
                <div className={`p-4 rounded-xl text-[13.5px] font-medium flex items-center justify-between gap-2 shadow-sm ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}>
                    <span>{feedback.type === 'success' ? '✅' : '⚠️'} {feedback.message}</span>
                    <button onClick={() => setFeedback(null)} className="border-none bg-transparent cursor-pointer text-text-muted">✕</button>
                </div>
            )}

            {/* KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
                    <div className="text-[24px] font-bold text-text-primary leading-none">{totalSeances}</div>
                    <div className="text-[12.5px] text-text-secondary mt-1 font-medium">Séances totales</div>
                </div>
                <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
                    <div className="text-[24px] font-bold text-emerald-600 leading-none">{completeSeances}</div>
                    <div className="text-[12.5px] text-text-secondary mt-1 font-medium">Complets (Places pourvues)</div>
                </div>
                <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
                    <div className="text-[24px] font-bold text-amber-600 leading-none">{partielSeances}</div>
                    <div className="text-[12.5px] text-text-secondary mt-1 font-medium">Partiellement pourvus</div>
                </div>
                <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4">
                    <div className="text-[24px] font-bold text-rose-600 leading-none">{vacantsSeances}</div>
                    <div className="text-[12.5px] text-text-secondary mt-1 font-medium">Vacants (Sans assistant)</div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-card-bg border border-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    placeholder="Rechercher matière, code, prof, salle, groupe..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="flex-1 min-w-[220px] py-2 px-3 rounded-lg border border-border text-[13px] bg-content-bg text-text-primary outline-none focus:border-primary transition-colors"
                />
                <select
                    value={filterMatiere}
                    onChange={e => setFilterMatiere(e.target.value)}
                    className="py-2 px-3 rounded-lg border border-border text-[13px] bg-content-bg text-text-primary outline-none cursor-pointer"
                >
                    <option value="">Toutes les matières</option>
                    {matieres.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                    value={filterJour}
                    onChange={e => setFilterJour(e.target.value)}
                    className="py-2 px-3 rounded-lg border border-border text-[13px] bg-content-bg text-text-primary outline-none cursor-pointer"
                >
                    <option value="">Tous les jours</option>
                    {JOURS.map(j => <option key={j} value={j}>{j.charAt(0).toUpperCase() + j.slice(1)}</option>)}
                </select>
                <select
                    value={filterStatut}
                    onChange={e => setFilterStatut(e.target.value)}
                    className="py-2 px-3 rounded-lg border border-border text-[13px] bg-content-bg text-text-primary outline-none cursor-pointer"
                >
                    <option value="">Tous les états de places</option>
                    <option value="vacant">Vacants (0 place prise)</option>
                    <option value="occupe">Occupés (&ge; 1 assistant)</option>
                    <option value="complet">Complets</option>
                </select>
                {(search || filterMatiere || filterJour || filterStatut) && (
                    <button
                        onClick={() => { setSearch(''); setFilterMatiere(''); setFilterJour(''); setFilterStatut(''); }}
                        className="text-[12px] text-rose-600 underline cursor-pointer bg-transparent border-none font-medium"
                    >
                        Effacer les filtres
                    </button>
                )}
            </div>

            {error ? (
                <div className="bg-card-bg border border-border rounded-xl py-10 flex flex-col items-center gap-3 text-center">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-text-secondary">{error}</p>
                    <button onClick={fetchSeances} className="bg-primary text-white px-4 py-2 rounded-lg text-[13px] font-medium border-none cursor-pointer">Réessayer</button>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {sortedDays.map(day => {
                        const date = new Date(day);
                        const label = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        const daySeances = grouped[day].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));

                        return (
                            <div key={day} className="flex flex-col gap-3">
                                <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                                    <span className="text-[14px] font-bold text-text-primary capitalize">📆 {label}</span>
                                    <span className="text-[11px] text-text-muted bg-content-bg border border-border rounded-full px-2 py-0.5 font-medium">
                                        {daySeances.length} séance{daySeances.length > 1 ? 's' : ''}
                                    </span>
                                </div>

                                <div className="flex flex-col gap-2.5">
                                    {daySeances.map(s => {
                                        const statutMeta = COLORS[s.statut] || COLORS.PLANIFIEE;
                                        const reqCount = s.nombreAssistantsRequis || 1;
                                        const takenCount = s.placesPrises;

                                        return (
                                            <div key={s.id} className="bg-card-bg border border-border rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-1.5 h-12 rounded-full shrink-0" style={{ background: s.matiereCouleur || '#4361ee' }}></div>
                                                    <div className="text-center shrink-0 w-[60px]">
                                                        <div className="text-[13px] font-bold text-text-primary">{s.heureDebut}</div>
                                                        <div className="text-[11px] text-text-muted font-medium">{s.heureFin}</div>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-[15px] font-bold text-text-primary truncate">{s.matiere}</span>
                                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold" style={{ background: (s.matiereCouleur || '#4361ee') + '20', color: s.matiereCouleur || '#4361ee' }}>
                                                                {s.matiereCode}
                                                            </span>
                                                            <span className="text-[11px] text-text-muted font-medium">• {s.type}</span>
                                                        </div>
                                                        <div className="text-[12.5px] text-text-secondary mt-0.5">
                                                            {s.groupe} • Salle: <span className="font-medium text-text-primary">{s.salle || 'Non définie'}</span>
                                                        </div>
                                                        <div className="text-[12px] text-text-muted mt-0.5">
                                                            Professeur: <span className="font-medium text-text-secondary">{s.professeur}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-border">
                                                    {/* Capacity Status */}
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: statutMeta.bg, color: statutMeta.color }}>
                                                            ● {s.statut}
                                                        </span>
                                                        <span className={`text-[11.5px] font-semibold px-2 py-0.5 rounded ${takenCount >= reqCount
                                                            ? 'bg-emerald-500/10 text-emerald-600'
                                                            : takenCount > 0
                                                                ? 'bg-amber-500/10 text-amber-600'
                                                                : 'bg-rose-500/10 text-rose-600'
                                                            }`}>
                                                            Assistants: {takenCount}/{reqCount}
                                                        </span>
                                                    </div>

                                                    {/* List of affectations with liberation button */}
                                                    {s.affectations.length > 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            {s.affectations.map(af => (
                                                                <div key={af.id} className="flex items-center gap-2 bg-content-bg px-2.5 py-1 rounded-lg border border-border text-[12px]">
                                                                    <span className="font-medium text-text-primary">👤 {af.nom}</span>
                                                                    <button
                                                                        onClick={() => handleLibererAssistant(s.id, af.assistantId)}
                                                                        title="Libérer la place cet assistant"
                                                                        className="text-rose-600 hover:text-rose-700 bg-transparent border-none cursor-pointer font-bold ml-1 text-[13px]"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}

                    {sortedDays.length === 0 && (
                        <div className="bg-card-bg border border-border rounded-xl py-12 flex flex-col items-center gap-2 text-center">
                            <span className="text-4xl">🔍</span>
                            <p className="text-[14px] text-text-muted">Aucune séance ne correspond aux critères sélectionnés.</p>
                        </div>
                    )}
                </div>
            )}

            {/* CSV IMPORT MODAL */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-card-bg border border-border rounded-2xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-[18px] font-bold text-text-primary flex items-center gap-2">
                                📥 Importer le Planning TP (CSV / Copier-Coller Excel)
                            </h3>
                            <button onClick={() => setShowImportModal(false)} className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer text-lg">✕</button>
                        </div>

                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] font-semibold text-text-primary">
                                Collez ici vos lignes de tableau Excel / CSV :
                            </label>
                            <p className="text-[12px] text-text-muted leading-relaxed">
                                Colonnes attendues (séparées par des tabulations ou des points-virgules) :<br />
                                <code>Nom Prof | Salle | Groupe | Matière | Jour | Date (JJ/MM/AAAA) | Heure début | Heure fin</code>
                            </p>
                            <textarea
                                rows={10}
                                value={csvText}
                                onChange={e => setCsvText(e.target.value)}
                                placeholder={`BENBEKHOUCHE SANA\tSalle EM216\tIng3 Gr05\tInitiation Réseaux APP\tjeudi\t26/03/2026\t14:00:00\t16:00:00\nMENTA ISSA\tSalle EM216\tIng3 Gr05\tLINUX APP\tjeudi\t26/03/2026\t16:15:00\t18:15:00`}
                                className="w-full p-3 font-mono text-[12px] bg-content-bg border border-border rounded-xl text-text-primary focus:outline-none focus:border-primary"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 bg-content-bg hover:bg-border text-text-primary rounded-xl text-[13px] font-semibold border border-border cursor-pointer">
                                Annuler
                            </button>
                            <button
                                onClick={handleImportSubmit}
                                disabled={importing || !csvText.trim()}
                                className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                            >
                                {importing ? (
                                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Importation en cours...</>
                                ) : (
                                    'Lancer l\'importation'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* HISTORY AUDIT MODAL */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-card-bg border border-border rounded-2xl p-6 max-w-4xl w-full shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-[18px] font-bold text-text-primary flex items-center gap-2">
                                📜 Historique des Actions & Réservations (Audit Trail)
                            </h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer text-lg">✕</button>
                        </div>

                        {loadingHistory ? (
                            <div className="py-12 text-center text-text-muted">Chargement de l'historique...</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[12.5px]">
                                    <thead>
                                        <tr className="bg-content-bg border-b border-border font-semibold text-text-secondary uppercase tracking-wider text-[11px]">
                                            <th className="py-2.5 px-3">Date Action</th>
                                            <th className="py-2.5 px-3">Action</th>
                                            <th className="py-2.5 px-3">Séance / Matière</th>
                                            <th className="py-2.5 px-3">Effectué par</th>
                                            <th className="py-2.5 px-3">Commentaire</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border text-text-primary">
                                        {historyLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-text-muted">Aucun historique enregistré pour le moment.</td>
                                            </tr>
                                        ) : (
                                            historyLogs.map(log => (
                                                <tr key={log.id} className="hover:bg-content-bg/50">
                                                    <td className="py-2.5 px-3 font-mono text-[11.5px] text-text-muted">
                                                        {new Date(log.dateAction).toLocaleString('fr-FR')}
                                                    </td>
                                                    <td className="py-2.5 px-3 font-bold">
                                                        <span className={`px-2 py-0.5 rounded text-[10.5px] ${log.action === 'RESERVATION'
                                                            ? 'bg-emerald-500/10 text-emerald-600'
                                                            : log.action === 'ANNULATION' || log.action === 'LIBERATION_ADMIN'
                                                                ? 'bg-rose-500/10 text-rose-600'
                                                                : 'bg-primary/10 text-primary'
                                                            }`}>
                                                            {log.action}
                                                        </span>
                                                    </td>
                                                    <td className="py-2.5 px-3 font-medium">
                                                        {log.seance?.matiere?.nom || 'Séance #' + log.seanceId} ({log.seance?.groupe || ''})
                                                    </td>
                                                    <td className="py-2.5 px-3 text-text-secondary">{log.effectuePar || 'Système'}</td>
                                                    <td className="py-2.5 px-3 text-text-muted italic">{log.commentaire || '—'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
