import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    FiUserCheck, FiSearch, FiFileText, FiCheck, FiX, FiMessageSquare, FiEye, FiDownload, FiAlertCircle
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Candidatures() {
    const { token, user } = useAuth();
    const [candidatures, setCandidatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatut, setFilterStatut] = useState<string>('TOUT');
    const [search, setSearch] = useState<string>('');

    // Modals
    const [selectedCandidature, setSelectedCandidature] = useState<any | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'accept' | 'refuse'; item: any } | null>(null);
    const [motifRefus, setMotifRefus] = useState<string>('');
    const [commentInput, setCommentInput] = useState<string>('');
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const canEdit = user?.role === 'responsable_pedagogique' || user?.role === 'professeur' || user?.role === 'admin';

    useEffect(() => {
        fetchCandidatures();
    }, [token, filterStatut, search]);

    const fetchCandidatures = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (filterStatut !== 'TOUT') query.append('statut', filterStatut);
            if (search) query.append('search', search);

            const res = await fetch(`${API_URL}/api/candidatures?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur lors du chargement des candidatures.');
            const data = await res.json();
            setCandidatures(data);
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

    const handleAccepter = async (id: number) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/candidatures/${id}/accepter`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ commentaire: commentInput }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur lors de l\'acceptation.');
            }

            showToast('Candidature acceptée ! Le compte assistant est actif.', 'success');
            setConfirmModal(null);
            setSelectedCandidature(null);
            fetchCandidatures();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefuser = async (id: number) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/candidatures/${id}/refuser`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ motifRefus }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur lors du refus.');
            }

            showToast('Candidature refusée.', 'success');
            setConfirmModal(null);
            setSelectedCandidature(null);
            fetchCandidatures();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toast Notification */}
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
                        <FiUserCheck className="text-primary" /> Gestion des Candidatures
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Examen et validation des demandes d'assistants TP.</p>
                </div>
            </div>

            {/* Filters & Search Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher nom, email, formation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    {['TOUT', 'EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'].map(stat => (
                        <button
                            key={stat}
                            onClick={() => setFilterStatut(stat)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${filterStatut === stat
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {stat === 'TOUT' ? 'Toutes les candidatures' :
                                stat === 'EN_ATTENTE' ? 'En attente' :
                                    stat === 'ACCEPTEE' ? 'Acceptées' : 'Refusées'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Chargement des candidatures...</div>
                ) : candidatures.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <FiFileText size={36} className="mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">Aucune candidature trouvée</p>
                        <p className="text-xs text-slate-400">Essayez de modifier vos filtres ou termes de recherche.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Candidat</th>
                                    <th className="py-3.5 px-4">Formation & Niveau</th>
                                    <th className="py-3.5 px-4">Date dépôt</th>
                                    <th className="py-3.5 px-4">Disponibilités</th>
                                    <th className="py-3.5 px-4">CV</th>
                                    <th className="py-3.5 px-4">Statut</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {candidatures.map((c) => (
                                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800">{c.prenom} {c.nom}</div>
                                            <div className="text-xs text-slate-400">{c.email}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className="font-semibold text-slate-700">{c.formation}</span>
                                            <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{c.niveau}</span>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-500 text-xs">
                                            {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-slate-600 max-w-[200px] truncate" title={c.disponibilites}>
                                            {c.disponibilites || 'Non spécifié'}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            {c.cvUrl ? (
                                                <a href={c.cvUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline">
                                                    <FiDownload size={14} /> CV.pdf
                                                </a>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Non fourni</span>
                                            )}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${c.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-800' :
                                                    c.statut === 'ACCEPTEE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                {c.statut === 'EN_ATTENTE' ? 'En attente' : c.statut === 'ACCEPTEE' ? 'Acceptée' : 'Refusée'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedCandidature(c)}
                                                    className="p-2 text-slate-600 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                                    title="Consulter profil"
                                                >
                                                    <FiEye size={16} />
                                                </button>

                                                {canEdit && c.statut === 'EN_ATTENTE' && (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setCommentInput(c.commentaire || '');
                                                                setConfirmModal({ open: true, type: 'accept', item: c });
                                                            }}
                                                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                                                            title="Accepter la candidature"
                                                        >
                                                            <FiCheck size={14} /> Accepter
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setMotifRefus('');
                                                                setConfirmModal({ open: true, type: 'refuse', item: c });
                                                            }}
                                                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                                                            title="Refuser la candidature"
                                                        >
                                                            <FiX size={14} /> Refuser
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Consultation Détails */}
            {selectedCandidature && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 relative">
                        <button onClick={() => setSelectedCandidature(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
                            <FiX size={20} />
                        </button>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">Détails de la Candidature</h3>
                        <p className="text-xs text-slate-400 mb-4">Candidat #{selectedCandidature.id}</p>

                        <div className="space-y-3 text-sm">
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Nom & Prénom</span>
                                <p className="font-bold text-slate-800 text-base">{selectedCandidature.prenom} {selectedCandidature.nom}</p>
                                <p className="text-xs text-slate-500">{selectedCandidature.email} • {selectedCandidature.telephone || 'Sans téléphone'}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <span className="text-xs text-slate-400 uppercase font-semibold">Formation</span>
                                    <p className="font-semibold text-slate-700">{selectedCandidature.formation}</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-xl">
                                    <span className="text-xs text-slate-400 uppercase font-semibold">Niveau d'études</span>
                                    <p className="font-semibold text-slate-700">{selectedCandidature.niveau}</p>
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs text-slate-400 uppercase font-semibold">Disponibilités déclarées</span>
                                <p className="text-slate-700 text-xs mt-1">{selectedCandidature.disponibilites || 'Aucune précision'}</p>
                            </div>

                            {selectedCandidature.commentaire && (
                                <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                                    <span className="text-xs text-blue-600 uppercase font-semibold flex items-center gap-1"><FiMessageSquare size={12} /> Commentaire Pédagogique</span>
                                    <p className="text-slate-700 text-xs mt-1">{selectedCandidature.commentaire}</p>
                                </div>
                            )}

                            {selectedCandidature.motifRefus && (
                                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                    <span className="text-xs text-rose-600 uppercase font-semibold">Motif de refus</span>
                                    <p className="text-slate-700 text-xs mt-1">{selectedCandidature.motifRefus}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setSelectedCandidature(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirmation Modal (Accept or Refuse) */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            {confirmModal.type === 'accept' ? 'Voulez-vous accepter cette candidature ?' : 'Voulez-vous refuser cette candidature ?'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Candidat : <strong className="text-slate-800">{confirmModal.item.prenom} {confirmModal.item.nom}</strong> ({confirmModal.item.formation})
                        </p>

                        {confirmModal.type === 'accept' ? (
                            <div className="space-y-3">
                                <p className="text-xs text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                    En acceptant, le statut sera mis à jour, le compte assistant sera automatiquement créé et activé, et l'assistant recevra une notification.
                                </p>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Ajouter un commentaire (optionnel)</label>
                                    <textarea
                                        rows={2}
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="ex: Excellent profil pour les TP d'Algorithmique."
                                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
                                    Le statut sera mis à jour en Refusé et l'assistant en sera informé.
                                </p>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1">Motif du refus (obligatoire)</label>
                                    <textarea
                                        rows={3}
                                        value={motifRefus}
                                        onChange={(e) => setMotifRefus(e.target.value)}
                                        placeholder="Saisissez le motif du refus..."
                                        className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-400/20"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmModal(null)}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200"
                            >
                                Annuler
                            </button>
                            <button
                                disabled={actionLoading}
                                onClick={() => {
                                    if (confirmModal.type === 'accept') handleAccepter(confirmModal.item.id);
                                    else handleRefuser(confirmModal.item.id);
                                }}
                                className={`px-5 py-2 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer ${confirmModal.type === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                    }`}
                            >
                                {actionLoading ? 'Traitement...' : confirmModal.type === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
