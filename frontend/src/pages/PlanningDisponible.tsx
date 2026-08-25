import { useState, useEffect, useMemo } from 'react';
import { FiCalendar, FiList, FiCheckCircle, FiAlertTriangle, FiSearch, FiInfo, FiCheck, FiXCircle, FiClock, FiMapPin, FiUsers, FiUser, FiX, FiCheckSquare } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

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
    const [modalActionType, setModalActionType] = useState<'reserve' | 'cancel' | 'info' | null>(null);
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

            setFeedback({ message: 'Créneau réservé avec succès ! (En attente de confirmation/validation)', type: 'success' });
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

    // Map to Calendar Events
    const calendarEvents = useMemo(() => {
        return filteredSeances.map(s => {
            const isReservedByMe = s.statutCalcul === 'RESERVED_BY_ME';
            const isFull = s.statutCalcul === 'FULL';
            const isCancelled = s.statutCalcul === 'CANCELLED';
            const isAvailable = s.statutCalcul === 'AVAILABLE';

            let bgColor = '#4361ee';
            if (isReservedByMe) bgColor = '#10b981'; // emerald
            else if (isCancelled) bgColor = '#ef4444'; // rose
            else if (isFull) bgColor = '#64748b'; // slate
            else if (s.matiereCouleur) bgColor = s.matiereCouleur;

            // Generate event datetime
            const dateStr = new Date(s.date).toISOString().split('T')[0];

            return {
                id: s.id.toString(),
                title: `${s.matiereCode} - ${s.type} - G:${s.groupe}`,
                start: `${dateStr}T${s.heureDebut}`,
                end: `${dateStr}T${s.heureFin}`,
                backgroundColor: bgColor,
                borderColor: bgColor,
                textColor: '#ffffff',
                extendedProps: { ...s, isReservedByMe, isFull, isCancelled, isAvailable }
            };
        });
    }, [filteredSeances]);

    const handleEventClick = (info: any) => {
        const eventId = Number(info.event.id);
        const seance = filteredSeances.find(s => s.id === eventId);
        if (seance) {
            setSelectedSeanceModal(seance);
            if (seance.statutCalcul === 'RESERVED_BY_ME') {
                setModalActionType('cancel');
            } else if (seance.statutCalcul === 'AVAILABLE') {
                setModalActionType('reserve');
            } else {
                setModalActionType('info');
            }
        }
    };

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
                        <FiCalendar className="text-primary" /> Réservation des Créneaux TP
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
                            <FiCalendar className="text-[15px]" /> Vue Planning
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-all cursor-pointer border-none flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-card-bg text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                                }`}
                        >
                            <FiList className="text-[15px]" /> Vue Liste
                        </button>
                    </div>
                </div>
            </div>

            {/* Feedback Banner */}
            {feedback && (
                <div className={`p-4 rounded-xl text-[13.5px] font-medium flex items-center justify-between gap-3 shadow-sm animate-fade-in ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                    }`}>
                    <div className="flex items-center gap-2">
                        {feedback.type === 'success' ? <FiCheckCircle className="text-lg" /> : <FiAlertTriangle className="text-lg" />}
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-[12px] opacity-70 hover:opacity-100 border-none bg-transparent cursor-pointer flex items-center justify-center"><FiX /></button>
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between flex-wrap">
                <div className="flex items-center gap-3 w-full md:w-auto flex-1 flex-wrap">
                    {/* Search Box */}
                    <div className="relative flex-1 min-w-[220px]">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[14px]" />
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
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1 shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                        Créneaux libres uniquement
                    </label>
                </div>

                <div className="text-[12.5px] text-text-muted font-medium self-end md:self-center">
                    {filteredSeances.length} séance(s) trouvée(s)
                </div>
            </div>

            {error && (
                <div className="bg-card-bg border border-border rounded-xl p-8 flex flex-col items-center text-center gap-3">
                    <FiAlertTriangle className="text-4xl text-rose-500 mb-2" />
                    <p className="text-text-secondary">{error}</p>
                    <button onClick={fetchDisponibles} className="px-4 py-2 bg-primary text-white text-[13px] font-medium rounded-lg hover:bg-primary-hover transition-colors border-none cursor-pointer">
                        Réessayer
                    </button>
                </div>
            )}

            {/* VIEW MODE: CALENDAR / TIMELINE */}
            {!error && viewMode === 'calendar' && (
                <div className="bg-card-bg border border-border rounded-xl shadow-sm p-4 overflow-hidden relative" style={{ minHeight: '600px' }}>
                    <style>{`
                        .fc {
                            --fc-border-color: rgba(0,0,0,0.08);
                            --fc-page-bg-color: transparent;
                            --fc-neutral-bg-color: rgba(0,0,0,0.02);
                        }
                        .dark .fc {
                            --fc-border-color: rgba(255,255,255,0.08);
                            --fc-neutral-bg-color: rgba(255,255,255,0.02);
                        }
                        .fc-theme-standard th, .fc-theme-standard td, .fc-theme-standard .fc-scrollgrid {
                            border-color: var(--fc-border-color);
                        }
                        .fc .fc-toolbar-title {
                            font-size: 1.25rem;
                            font-weight: 700;
                            color: var(--text-primary, inherit);
                        }
                        .fc .fc-button-primary {
                            background-color: #4361ee;
                            border-color: #4361ee;
                        }
                        .fc .fc-button-primary:not(:disabled):active, .fc .fc-button-primary:not(:disabled).fc-button-active {
                            background-color: #3b82f6;
                            border-color: #3b82f6;
                        }
                        .fc-event {
                            cursor: pointer;
                            transition: opacity 0.2s;
                            padding: 2px;
                            border-radius: 4px;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                        }
                        .fc-event:hover {
                            opacity: 0.9;
                        }
                        .fc-timegrid-event-harness > .fc-timegrid-event {
                            z-index: 10 !important;
                        }
                        .fc-event-title {
                            font-weight: 700;
                            font-size: 0.8em;
                            white-space: normal;
                            line-height: 1.2;
                        }
                        .fc-event-time {
                            font-size: 0.75em;
                            opacity: 0.9;
                            margin-bottom: 2px;
                        }
                    `}</style>
                    <FullCalendar
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="timeGridWeek"
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        locale="fr"
                        slotMinTime="08:00:00"
                        slotMaxTime="20:00:00"
                        allDaySlot={false}
                        events={calendarEvents}
                        height="auto"
                        eventClick={handleEventClick}
                        firstDay={1}
                        eventContent={(eventInfo) => {
                            const { isReservedByMe, isAvailable, placesRestantes, nombreAssistantsRequis, isCancelled } = eventInfo.event.extendedProps;
                            return (
                                <div className="flex flex-col h-full overflow-hidden">
                                    <div className="fc-event-time">{eventInfo.timeText}</div>
                                    <div className="fc-event-title">{eventInfo.event.title}</div>
                                    <div className="mt-auto text-[10px] font-semibold tracking-wider pt-1">
                                        {isReservedByMe ? (
                                            <span className="flex items-center gap-1"><FiCheck /> Réservé (Vous)</span>
                                        ) : isCancelled ? (
                                            <span>Annulé</span>
                                        ) : isAvailable ? (
                                            <span>{placesRestantes}/{nombreAssistantsRequis} libre</span>
                                        ) : (
                                            <span>Complet</span>
                                        )}
                                    </div>
                                </div>
                            );
                        }}
                    />
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
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-semibold border border-emerald-500/20 flex flex-row items-center gap-1.5 w-fit">
                                                            <FiCheck /> Réservé (Vous)
                                                        </span>
                                                    ) : isAvailable ? (
                                                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[11px] font-semibold flex flex-row items-center gap-1.5 w-fit">
                                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span> {s.placesRestantes}/{s.nombreAssistantsRequis} libre
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
                                {modalActionType === 'reserve' ? <FiCheckCircle className="text-emerald-500 text-xl" /> : <FiXCircle className="text-rose-500 text-xl" />}
                                {modalActionType === 'reserve' ? 'Confirmer la réservation' : 'Annuler la réservation'}
                            </h3>
                            <button
                                onClick={() => {
                                    setSelectedSeanceModal(null);
                                    setModalActionType(null);
                                }}
                                className="text-text-muted hover:text-text-primary text-[18px] bg-transparent border-none cursor-pointer"
                            >
                                <FiX />
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
                                <div><FiClock className="inline -mt-0.5 mr-1" /> <span className="font-semibold text-text-primary">{selectedSeanceModal.heureDebut} – {selectedSeanceModal.heureFin}</span></div>
                                <div><FiMapPin className="inline -mt-0.5 mr-1" /> <span className="font-semibold text-text-primary">{selectedSeanceModal.salle || 'Non spécifiée'}</span></div>
                                <div><FiUsers className="inline -mt-0.5 mr-1" /> Groupe: <span className="font-semibold text-text-primary">{selectedSeanceModal.groupe}</span></div>
                                <div><FiUser className="inline -mt-0.5 mr-1" /> Prof: <span className="font-semibold text-text-primary">{selectedSeanceModal.professeur}</span></div>
                            </div>
                        </div>

                        {/* Note / Disclaimer */}
                        {modalActionType === 'reserve' ? (
                            <p className="text-[13px] text-text-secondary leading-relaxed bg-primary/5 p-3 rounded-xl border border-primary/20">
                                <FiCheckSquare className="inline -mt-0.5 mr-1 text-primary" /> <strong>Engagement :</strong> En validant cette réservation, vous vous engagez à assurer l'encadrement de cette séance de TP. Un e-mail de confirmation et une notification vous seront transmitted.
                            </p>
                        ) : modalActionType === 'cancel' ? (
                            <p className="text-[13px] text-rose-600 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 leading-relaxed">
                                <FiAlertTriangle className="inline -mt-0.5 mr-1 text-rose-600" /> <strong>Attention :</strong> L'annulation libérera immédiatement votre place pour d'autres assistants et sera enregistrée dans l'historique d'audit.
                            </p>
                        ) : (
                            <div className="text-[13px] text-text-secondary p-3 rounded-xl border border-border bg-content-bg">
                                <FiInfo className="inline -mt-0.5 mr-1" /> Cette séance ne peut être réservée ni annulée pour le moment.
                                {selectedSeanceModal.conflitHoraire && !selectedSeanceModal.myAffectationId && (
                                    <div className="mt-2 text-amber-600 font-medium flex items-center gap-1.5"><FiAlertTriangle /> Vous avez déjà un TP prévu à ces horaires.</div>
                                )}
                            </div>
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
                            ) : modalActionType === 'cancel' ? (
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
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
