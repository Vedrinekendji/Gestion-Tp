import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface SeanceDisponible {
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
    professeur: string;
    statut: string;
    statutCalcul: 'AVAILABLE' | 'FULL' | 'RESERVED_BY_ME' | 'CANCELLED';
    nombreAssistantsRequis: number;
    placesPrises: number;
    placesRestantes: number;
    conflitHoraire: boolean;
    myAffectationId: number | null;
    myAffectationStatut: string | null;
    assistants: { id: number; nom: string; statut: string }[];
}

export default function PlanningDisponible() {
    const { token } = useAuth();
    const [seances, setSeances] = useState<SeanceDisponible[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Filters & Views
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMatiere, setSelectedMatiere] = useState<string>('ALL');
    const [onlyAvailable, setOnlyAvailable] = useState(false);

    // Modal State
    const [selectedSeanceModal, setSelectedSeanceModal] = useState<SeanceDisponible | null>(null);
    const [modalActionType, setModalActionType] = useState<'reserve' | 'cancel' | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchDisponibles = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await fetch(`${API_URL}/api/seances/disponibles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur de chargement des créneaux.');
            const data = await res.json();
            setSeances(data);
        } catch (err) {
            setError('Impossible de charger le planning des TPs.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDisponibles();
    }, []);

    // Filtered séances
    const filteredSeances = useMemo(() => {
        return seances.filter(s => {
            if (onlyAvailable && s.statutCalcul !== 'AVAILABLE') return false;
            if (selectedMatiere !== 'ALL' && s.matiereCode !== selectedMatiere && s.matiere !== selectedMatiere) return false;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const matchText = `${s.matiere} ${s.matiereCode} ${s.professeur} ${s.salle} ${s.groupe}`.toLowerCase();
                if (!matchText.includes(term)) return false;
            }
            return true;
        });
    }, [seances, onlyAvailable, selectedMatiere, searchTerm]);

    // Unique Matieres for filter dropdown
    const matieresList = useMemo(() => {
        const map = new Map<string, string>();
        seances.forEach(s => map.set(s.matiereCode || s.matiere, s.matiere));
        return Array.from(map.entries());
    }, [seances]);

    // Handle Reserve Action
    const handleConfirmReserve = async () => {
        if (!selectedSeanceModal) return;
        setSubmitting(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/seances/${selectedSeanceModal.id}/reserver`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de la réservation.');
            }

            setFeedback({ message: '🎉 Créneau réservé avec succès ! (En attente de confirmation/validation)', type: 'success' });
            setSelectedSeanceModal(null);
            setModalActionType(null);
            await fetchDisponibles();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Cancel Action
    const handleConfirmCancel = async () => {
        if (!selectedSeanceModal) return;
        setSubmitting(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/seances/${selectedSeanceModal.id}/annuler-reservation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ motif: 'Annulé par l\'assistant depuis l\'interface.' }),
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Erreur lors de l\'annulation.');
            }

            setFeedback({ message: 'Réservation annulée. Le créneau est à nouveau disponible.', type: 'success' });
            setSelectedSeanceModal(null);
            setModalActionType(null);
            await fetchDisponibles();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    // Grouping by Date for Calendar / Timeline view
    const datesGrouped = useMemo(() => {
        const groups: { [dateStr: string]: SeanceDisponible[] } = {};
        filteredSeances.forEach(s => {
            const dKey = new Date(s.date).toISOString().split('T')[0];
            if (!groups[dKey]) groups[dKey] = [];
            groups[dKey].push(s);
        });
        return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
    }, [filteredSeances]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    <span className="text-[14px] text-text-secondary font-medium">Chargement du planning de réservation...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-12">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-bg border border-border p-5 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-[24px] font-bold text-text-primary tracking-tight flex items-center gap-2">
                        <span>📅</span> Réservation des Créneaux TP
                    </h2>
                    <p className="text-[13.5px] text-text-secondary mt-1">
                        Sélectionnez les séances de TP attribuées par le planning pour prendre en charge vos créneaux.
                    </p>
                </div>

                {/* Action Toggle */}
                <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
                    <div className="inline-flex bg-content-bg p-1 rounded-xl border border-border">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-card-bg text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            📅 Vue Planning
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-card-bg text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            📋 Vue Liste
                        </button>
                    </div>
                </div>
            </div>

            {/* Feedback Banner */}
            {feedback && (
                <div className={`p-4 rounded-xl text-[13.5px] font-medium flex items-center justify-between gap-3 shadow-sm animate-fade-in ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}>
                    <div className="flex items-center gap-2">
                        <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-[12px] opacity-70 hover:opacity-100 border-none bg-transparent cursor-pointer">✕</button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between flex-wrap">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
                    {/* Search Box */}
                    <div className="relative flex-1 min-w-[220px]">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[14px]">🔍</span>
                        <input
                            type="text"
                            placeholder="Rechercher matière, prof, salle, groupe..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary transition-colors"
                        />
                    </div>

                    {/* Matière Filter */}
                    <select
                        value={selectedMatiere}
                        onChange={e => setSelectedMatiere(e.target.value)}
                        className="px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary cursor-pointer min-w-[160px]"
                    >
                        <option value="ALL">Toutes les matières</option>
                        {matieresList.map(([code, nom]) => (
                            <option key={code} value={code}>{code} - {nom}</option>
                        ))}
                    </select>

                    {/* Available Only Checkbox */}
                    <label className="flex items-center gap-2 text-[13px] font-medium text-text-secondary cursor-pointer bg-content-bg px-3 py-2 rounded-lg border border-border select-none">
                        <input
                            type="checkbox"
                            checked={onlyAvailable}
                            onChange={e => setOnlyAvailable(e.target.checked)}
                            className="rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                        />
                        🟢 Créneaux libres uniquement
                    </label>
                </div>

                <div className="text-[12.5px] text-text-muted font-medium self-end md:self-center">
                    {filteredSeances.length} séance(s) trouvée(s)
                </div>
            </div>

            {error && (
                <div className="bg-card-bg border border-border rounded-xl p-8 flex flex-col items-center text-center gap-3">
                    <div className="text-4xl">⚠️</div>
                    <p className="text-text-secondary">{error}</p>
                    <button onClick={fetchDisponibles} className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors border-none cursor-pointer">
                        Réessayer
                    </button>
                </div>
            )}

            {/* VIEW MODE: CALENDAR / TIMELINE */}
            {!error && viewMode === 'calendar' && (
                <div className="flex flex-col gap-6">
                    {datesGrouped.length === 0 ? (
                        <div className="bg-card-bg border border-border rounded-2xl p-12 text-center flex flex-col items-center gap-3">
                            <span className="text-4xl">🔍</span>
                            <h3 className="text-[16px] font-semibold text-text-primary">Aucun créneau correspondant</h3>
                            <p className="text-[13px] text-text-muted max-w-md">Essayer de modifier vos filtres ou la recherche pour afficher d'autres séances.</p>
                        </div>
                    ) : (
                        datesGrouped.map(([dateStr, items]) => {
                            const dateObj = new Date(dateStr);
                            const formattedDate = dateObj.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

                            return (
                                <div key={dateStr} className="flex flex-col gap-3">
                                    {/* Date Sticky Banner */}
                                    <div className="flex items-center gap-3 border-b border-border/60 pb-2">
                                        <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg font-bold text-[13px] capitalize">
                                            📆 {formattedDate}
                                        </span>
                                        <span className="text-[12px] text-text-muted font-medium">({items.length} créneau{items.length > 1 ? 'x' : ''})</span>
                                    </div>

                                    {/* Grid of Slots for this Date */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {items.map(s => {
                                            const isReservedByMe = s.statutCalcul === 'RESERVED_BY_ME';
                                            const isFull = s.statutCalcul === 'FULL';
                                            const isCancelled = s.statutCalcul === 'CANCELLED';
                                            const isAvailable = s.statutCalcul === 'AVAILABLE';

                                            return (
                                                <div
                                                    key={s.id}
                                                    className={`bg-card-bg border rounded-xl p-4 flex flex-col justify-between gap-4 transition-all hover:shadow-md relative overflow-hidden ${isReservedByMe
                                                            ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                                                            : isAvailable
                                                                ? 'border-border hover:border-primary/50'
                                                                : 'border-border opacity-85'
                                                        }`}
                                                >
                                                    {/* Color bar top */}
                                                    <div className="absolute top-0 left-0 right-0 h-1" style={{ background: s.matiereCouleur || '#4361ee' }}></div>

                                                    {/* Card Content */}
                                                    <div className="flex flex-col gap-2 mt-1">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1" style={{ background: (s.matiereCouleur || '#4361ee') + '20', color: s.matiereCouleur || '#4361ee' }}>
                                                                    {s.matiereCode}
                                                                </span>
                                                                <h4 className="text-[15px] font-bold text-text-primary leading-snug">{s.matiere}</h4>
                                                            </div>

                                                            {/* Capacity / Status Badge */}
                                                            {isCancelled ? (
                                                                <span className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded text-[11px] font-semibold border border-rose-500/20 shrink-0">
                                                                    Annulé
                                                                </span>
                                                            ) : isReservedByMe ? (
                                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-semibold border border-emerald-500/20 shrink-0 flex items-center gap-1">
                                                                    ✓ Réservé (Vous)
                                                                </span>
                                                            ) : isFull ? (
                                                                <span className="px-2.5 py-1 bg-slate-500/10 text-slate-600 dark:text-slate-400 rounded text-[11px] font-semibold border border-slate-500/20 shrink-0">
                                                                    Complet (0/{s.nombreAssistantsRequis})
                                                                </span>
                                                            ) : (
                                                                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-semibold border border-emerald-500/20 shrink-0">
                                                                    🟢 {s.placesRestantes}/{s.nombreAssistantsRequis} libre{s.placesRestantes > 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Details */}
                                                        <div className="text-[12.5px] text-text-secondary flex flex-col gap-1 mt-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-text-primary">⏰ {s.heureDebut} – {s.heureFin}</span>
                                                                <span className="text-text-muted">•</span>
                                                                <span>📍 {s.salle || 'Salle non spécifiée'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-text-muted">
                                                                <span>👥 {s.groupe}</span>
                                                                <span>•</span>
                                                                <span>👨‍🏫 {s.professeur}</span>
                                                            </div>
                                                        </div>

                                                        {/* Reserved Assistants list preview if multi */}
                                                        {s.assistants.length > 0 && (
                                                            <div className="mt-1 pt-2 border-t border-border/50 text-[11.5px] text-text-muted flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-medium">Assistants inscrits:</span>
                                                                {s.assistants.map(a => (
                                                                    <span key={a.id} className="bg-content-bg px-2 py-0.5 rounded text-[11px] font-medium text-text-secondary border border-border">
                                                                        {a.nom}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Schedule conflict warning */}
                                                        {s.conflitHoraire && !isReservedByMe && (
                                                            <div className="mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[11.5px] font-medium flex items-center gap-1.5">
                                                                <span>⚠️</span>
                                                                <span>Vous avez déjà une séance réservée aux mêmes heures.</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Footer Action Button */}
                                                    <div className="pt-3 border-t border-border flex items-center justify-between">
                                                        {isReservedByMe ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSeanceModal(s);
                                                                    setModalActionType('cancel');
                                                                }}
                                                                className="w-full py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-[13px] font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                                            >
                                                                <span>🗑️</span> Annuler ma réservation
                                                            </button>
                                                        ) : isAvailable ? (
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedSeanceModal(s);
                                                                    setModalActionType('reserve');
                                                                }}
                                                                disabled={s.conflitHoraire}
                                                                className={`w-full py-2 px-3 rounded-lg text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5 border-none cursor-pointer ${s.conflitHoraire
                                                                        ? 'bg-content-bg text-text-muted cursor-not-allowed border border-border'
                                                                        : 'bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow-[0_2px_8px_rgba(67,97,238,0.25)]'
                                                                    }`}
                                                            >
                                                                <span>👉</span> Prendre ce créneau
                                                            </button>
                                                        ) : (
                                                            <button
                                                                disabled
                                                                className="w-full py-2 px-3 bg-content-bg text-text-muted rounded-lg text-[13px] font-medium border border-border cursor-not-allowed text-center"
                                                            >
                                                                {isFull ? 'Créneau Complet' : 'Non disponible'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* VIEW MODE: LIST TABLE */}
            {!error && viewMode === 'list' && (
                <div className="bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-content-bg border-b border-border text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
                                    <th className="py-3 px-4">Matière</th>
                                    <th className="py-3 px-4">Date & Horaires</th>
                                    <th className="py-3 px-4">Groupe / Salle</th>
                                    <th className="py-3 px-4">Professeur</th>
                                    <th className="py-3 px-4">Places</th>
                                    <th className="py-3 px-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-[13px] text-text-primary">
                                {filteredSeances.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-text-muted">
                                            Aucun créneau trouvé dans la liste.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSeances.map(s => {
                                        const isReservedByMe = s.statutCalcul === 'RESERVED_BY_ME';
                                        const isAvailable = s.statutCalcul === 'AVAILABLE';
                                        const formattedDate = new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

                                        return (
                                            <tr key={s.id} className="hover:bg-content-bg/50 transition-colors">
                                                <td className="py-3.5 px-4 font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.matiereCouleur || '#4361ee' }}></span>
                                                        <div>
                                                            <div>{s.matiere}</div>
                                                            <div className="text-[11px] text-text-muted font-normal">{s.matiereCode} • {s.type}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium capitalize">{formattedDate}</div>
                                                    <div className="text-[12px] text-text-secondary font-mono">{s.heureDebut} – {s.heureFin}</div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium">{s.groupe}</div>
                                                    <div className="text-[12px] text-text-muted">{s.salle || 'Non spécifiée'}</div>
                                                </td>
                                                <td className="py-3.5 px-4 text-text-secondary">{s.professeur}</td>
                                                <td className="py-3.5 px-4">
                                                    {isReservedByMe ? (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-semibold border border-emerald-500/20">
                                                            ✓ Réservé (Vous)
                                                        </span>
                                                    ) : isAvailable ? (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-semibold">
                                                            🟢 {s.placesRestantes}/{s.nombreAssistantsRequis} libre
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-slate-500/10 text-slate-500 rounded text-[11px] font-medium">
                                                            Complet
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    {isReservedByMe ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSeanceModal(s);
                                                                setModalActionType('cancel');
                                                            }}
                                                            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 rounded-lg text-[12.5px] font-medium border border-rose-500/20 cursor-pointer"
                                                        >
                                                            Annuler
                                                        </button>
                                                    ) : isAvailable ? (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedSeanceModal(s);
                                                                setModalActionType('reserve');
                                                            }}
                                                            disabled={s.conflitHoraire}
                                                            className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium transition-colors border-none cursor-pointer ${s.conflitHoraire
                                                                    ? 'bg-content-bg text-text-muted cursor-not-allowed border border-border'
                                                                    : 'bg-primary hover:bg-primary-hover text-white'
                                                                }`}
                                                        >
                                                            Prendre
                                                        </button>
                                                    ) : (
                                                        <span className="text-[12px] text-text-muted font-medium">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* CONFIRMATION / RESERVATION MODAL */}
            {selectedSeanceModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-card-bg border border-border rounded-2xl p-6 max-w-lg w-full shadow-2xl flex flex-col gap-5">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-[17px] font-bold text-text-primary flex items-center gap-2">
                                {modalActionType === 'reserve' ? '📝 Confirmer la réservation' : '⚠️ Annuler la réservation'}
                            </h3>
                            <button
                                onClick={() => {
                                    setSelectedSeanceModal(null);
                                    setModalActionType(null);
                                }}
                                className="text-text-muted hover:text-text-primary text-[18px] bg-transparent border-none cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body Info */}
                        <div className="bg-content-bg p-4 rounded-xl border border-border flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: (selectedSeanceModal.matiereCouleur || '#4361ee') + '20', color: selectedSeanceModal.matiereCouleur || '#4361ee' }}>
                                    {selectedSeanceModal.matiereCode}
                                </span>
                                <span className="text-[12px] font-semibold text-text-secondary">
                                    {new Date(selectedSeanceModal.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </span>
                            </div>

                            <div className="text-[16px] font-bold text-text-primary">
                                {selectedSeanceModal.matiere}
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[13px] text-text-secondary pt-2 border-t border-border/60">
                                <div>⏰ <span className="font-semibold text-text-primary">{selectedSeanceModal.heureDebut} – {selectedSeanceModal.heureFin}</span></div>
                                <div>📍 <span className="font-semibold text-text-primary">{selectedSeanceModal.salle || 'Non spécifiée'}</span></div>
                                <div>👥 Groupe: <span className="font-semibold text-text-primary">{selectedSeanceModal.groupe}</span></div>
                                <div>👨‍🏫 Prof: <span className="font-semibold text-text-primary">{selectedSeanceModal.professeur}</span></div>
                            </div>
                        </div>

                        {/* Note / Disclaimer */}
                        {modalActionType === 'reserve' ? (
                            <p className="text-[13px] text-text-secondary leading-relaxed bg-primary/5 p-3 rounded-xl border border-primary/20">
                                📌 <strong>Engagement :</strong> En validant cette réservation, vous vous engagez à assurer l'encadrement de cette séance de TP. Un e-mail de confirmation et une notification vous seront transmis.
                            </p>
                        ) : (
                            <p className="text-[13px] text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 leading-relaxed">
                                ⚠️ <strong>Attention :</strong> L'annulation libérera immédiatement votre place pour d'autres assistants et sera enregistrée dans l'historique d'audit.
                            </p>
                        )}

                        {/* Modal Actions */}
                        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
                            <button
                                onClick={() => {
                                    setSelectedSeanceModal(null);
                                    setModalActionType(null);
                                }}
                                className="px-4 py-2 bg-content-bg hover:bg-border text-text-primary rounded-xl text-[13px] font-semibold border border-border cursor-pointer transition-colors"
                            >
                                Annuler
                            </button>

                            {modalActionType === 'reserve' ? (
                                <button
                                    onClick={handleConfirmReserve}
                                    disabled={submitting}
                                    className="px-5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Enregistrement...</>
                                    ) : (
                                        'Confirmer la réservation'
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleConfirmCancel}
                                    disabled={submitting}
                                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[13px] font-semibold border-none cursor-pointer transition-all shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                                >
                                    {submitting ? (
                                        <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Annulation...</>
                                    ) : (
                                        'Confirmer l\'annulation'
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
