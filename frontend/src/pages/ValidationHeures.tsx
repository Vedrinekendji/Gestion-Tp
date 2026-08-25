import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    FiCheckCircle, FiXCircle, FiClock, FiAlertCircle, FiUser, FiCalendar
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ValidationHeures() {
    const { token, user } = useAuth();
    const [fiches, setFiches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statutFilter, setStatutFilter] = useState('EN_ATTENTE');
    const [commentaireInput, setCommentaireInput] = useState('');
    const [selectedFiche, setSelectedFiche] = useState<any | null>(null);
    const [actionType, setActionType] = useState<'valider' | 'refuser' | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const canEdit = user?.role === 'responsable_pedagogique' || user?.role === 'professeur' || user?.role === 'admin';

    useEffect(() => {
        fetchFiches();
    }, [token, statutFilter]);

    const fetchFiches = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/heures/validation?statut=${statutFilter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur lors du chargement des heures.');
            const data = await res.json();
            setFiches(data);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleAction = async () => {
        if (!selectedFiche || !actionType) return;
        try {
            setActionLoading(true);
            const endpoint = `${API_URL}/api/heures/validation/${selectedFiche.id}/${actionType}`;
            const res = await fetch(endpoint, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ commentaire: commentaireInput }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur lors du traitement.');
            }

            showToast(
                actionType === 'valider'
                    ? 'Heures validées et comptabilisées pour la paie !'
                    : 'Validation des heures refusée.',
                'success'
            );
            setSelectedFiche(null);
            setActionType(null);
            setCommentaireInput('');
            fetchFiches();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
                    }`}>
                    <FiAlertCircle size={18} /> {toast.message}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FiCheckCircle className="text-emerald-500" /> Validation & Suivi des Heures
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Validation pédagogique des heures de TP effectuées avant transmission à la paie.</p>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <FiAlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-amber-800 leading-relaxed">
                    <strong>Important :</strong> Seules les heures ayant le statut <strong>"VALIDÉE"</strong> seront comptabilisées dans les fiches de paie et rapports mensuels transmis au Service Administratif.
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                {['EN_ATTENTE', 'VALIDEE', 'REFUSEE', 'TOUT'].map((st) => (
                    <button
                        key={st}
                        onClick={() => setStatutFilter(st)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${statutFilter === st
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                    >
                        {st === 'EN_ATTENTE' ? 'Heures en attente' :
                            st === 'VALIDEE' ? 'Heures validées' :
                                st === 'REFUSEE' ? 'Heures refusées' : 'Toutes les heures'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Chargement des fiches d'heures...</div>
                ) : fiches.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <FiClock size={36} className="mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">Aucune fiche d'heures dans ce statut</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Assistant</th>
                                    <th className="py-3.5 px-4">Séance TP & Groupe</th>
                                    <th className="py-3.5 px-4">Professeur</th>
                                    <th className="py-3.5 px-4">Date & Horaire</th>
                                    <th className="py-3.5 px-4">Durée</th>
                                    <th className="py-3.5 px-4">Statut Validation</th>
                                    <th className="py-3.5 px-4">Commentaire</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {fiches.map((f) => (
                                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <FiUser className="text-slate-400" size={14} /> {f.assistantNom}
                                            </div>
                                            <div className="text-xs text-slate-400">{f.assistantFormation}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800">{f.matiere}</div>
                                            <div className="text-xs text-slate-500">{f.groupe} • Salle {f.salle}</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                                            {f.professeurNom}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                                                <FiCalendar size={12} className="text-primary" /> {new Date(f.date).toLocaleDateString('fr-FR')}
                                            </div>
                                            <div className="text-[11px] text-slate-500">{f.heureDebut} - {f.heureFin}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-mono">
                                                {f.duree} h
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${f.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-800' :
                                                f.statut === 'VALIDEE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                {f.statut === 'EN_ATTENTE' ? 'En attente' : f.statut === 'VALIDEE' ? 'Validée' : 'Refusée'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-slate-500 max-w-[180px] truncate" title={f.commentaire}>
                                            {f.commentaire || 'Aucun'}
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            {canEdit && (
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFiche(f);
                                                            setActionType('valider');
                                                            setCommentaireInput(f.commentaire || '');
                                                        }}
                                                        className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <FiCheckCircle size={14} /> Valider
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedFiche(f);
                                                            setActionType('refuser');
                                                            setCommentaireInput(f.commentaire || '');
                                                        }}
                                                        className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                                                    >
                                                        <FiXCircle size={14} /> Refuser
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {selectedFiche && actionType && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {actionType === 'valider' ? 'Valider les heures de TP' : 'Refuser la validation des heures'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Assistant : <strong className="text-slate-800">{selectedFiche.assistantNom}</strong> ({selectedFiche.duree} heures de {selectedFiche.matiere})
                        </p>

                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Commentaire / Observation (optionnel)</label>
                            <textarea
                                rows={3}
                                value={commentaireInput}
                                onChange={(e) => setCommentaireInput(e.target.value)}
                                placeholder="Ajouter une remarque..."
                                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                            />
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => { setSelectedFiche(null); setActionType(null); }}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200"
                            >
                                Annuler
                            </button>
                            <button
                                disabled={actionLoading}
                                onClick={handleAction}
                                className={`px-5 py-2 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer ${actionType === 'valider' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                            >
                                {actionLoading ? 'Traitement...' : actionType === 'valider' ? 'Confirmer la Validation' : 'Confirmer le Refus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
