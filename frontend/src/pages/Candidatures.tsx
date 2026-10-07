import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    FiUserCheck, FiSearch, FiFileText, FiCheck, FiX, FiMessageSquare,
    FiEye, FiDownload, FiAlertCircle, FiUser, FiPhone, FiMail,
    FiCheckCircle, FiClock, FiKey
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const statutConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    EN_ATTENTE: { label: 'En attente', cls: 'bg-amber-100 text-amber-800 border-amber-200', icon: <FiClock size={11} /> },
    ACCEPTEE: { label: 'Acceptée', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <FiCheckCircle size={11} /> },
    REFUSEE: { label: 'Refusée', cls: 'bg-rose-100 text-rose-800 border-rose-200', icon: <FiX size={11} /> },
};

export default function Candidatures() {
    const { token, user } = useAuth();
    const [candidatures, setCandidatures] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatut, setFilterStatut] = useState<string>('TOUT');
    const [search, setSearch] = useState<string>('');
    const [selectedCandidature, setSelectedCandidature] = useState<any | null>(null);
    const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: 'accept' | 'refuse'; item: any } | null>(null);
    const [motifRefus, setMotifRefus] = useState<string>('');
    const [commentInput, setCommentInput] = useState<string>('');
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [acceptedLogin, setAcceptedLogin] = useState<string | null>(null);

    const canEdit = user?.role === 'professeur' || user?.role === 'admin';

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
            setCandidatures(await res.json());
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const handleAccepter = async (id: number) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/candidatures/${id}/accepter`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ commentaire: commentInput }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'acceptation.');
            setAcceptedLogin(data.loginGenere || null);
            showToast(`✅ Candidature acceptée ! Login généré : ${data.loginGenere}`, 'success');
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
        if (!motifRefus.trim()) {
            showToast('Le motif de refus est obligatoire.', 'error');
            return;
        }
        try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/candidatures/${id}/refuser`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ motifRefus }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors du refus.');
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

    const downloadCV = async (cvUrl: string) => {
        // cvUrl = "/uploads/cv/cv_123456.pdf"
        const filename = cvUrl.split('/').pop()!;
        const res = await fetch(`${API_URL}/api/candidatures/cv/${filename}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) { showToast('CV introuvable.', 'error'); return; }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const statsCount = {
        total: candidatures.length,
        attente: candidatures.filter(c => c.statut === 'EN_ATTENTE').length,
        acceptee: candidatures.filter(c => c.statut === 'ACCEPTEE').length,
        refusee: candidatures.filter(c => c.statut === 'REFUSEE').length,
    };

    return (
        <div className="space-y-6">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium flex items-center gap-2 border max-w-sm ${toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'
                    }`}>
                    <FiAlertCircle size={18} /> {toast.message}
                </div>
            )}

            {/* Login info banner (après acceptation) */}
            {acceptedLogin && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 flex items-start gap-3">
                    <FiKey className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <p className="font-bold text-emerald-800">Compte assistant créé avec succès !</p>
                        <p className="text-sm text-emerald-700 mt-0.5">
                            Login généré : <code className="bg-emerald-100 px-2 py-0.5 rounded font-mono">{acceptedLogin}</code>
                            {' '}— Un email a été envoyé automatiquement avec les identifiants de connexion.
                        </p>
                    </div>
                    <button onClick={() => setAcceptedLogin(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
                        <FiX size={18} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                            <FiUserCheck className="text-primary" /> Gestion des Candidatures
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">Examen et validation des demandes d'assistants TP</p>
                    </div>
                    {/* Stats rapides */}
                    <div className="flex items-center gap-3">
                        <StatBadge label="Total" value={statsCount.total} cls="bg-slate-100 text-slate-700" />
                        <StatBadge label="En attente" value={statsCount.attente} cls="bg-amber-100 text-amber-800" />
                        <StatBadge label="Acceptées" value={statsCount.acceptee} cls="bg-emerald-100 text-emerald-800" />
                        <StatBadge label="Refusées" value={statsCount.refusee} cls="bg-rose-100 text-rose-800" />
                    </div>
                </div>
            </div>

            {/* Filtres */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher nom, email, formation..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {['TOUT', 'EN_ATTENTE', 'ACCEPTEE', 'REFUSEE'].map(stat => (
                        <button
                            key={stat}
                            onClick={() => setFilterStatut(stat)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${filterStatut === stat
                                    ? 'bg-primary text-white border-primary shadow-sm'
                                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {stat === 'TOUT' ? 'Toutes' : stat === 'EN_ATTENTE' ? 'En attente' : stat === 'ACCEPTEE' ? 'Acceptées' : 'Refusées'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-10 text-center text-slate-400">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
                        Chargement des candidatures...
                    </div>
                ) : candidatures.length === 0 ? (
                    <div className="p-14 text-center text-slate-400">
                        <FiFileText size={38} className="mx-auto mb-3 opacity-30" />
                        <p className="font-semibold text-slate-600">Aucune candidature trouvée</p>
                        <p className="text-xs mt-1">Modifiez vos filtres ou attendez de nouvelles soumissions.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Candidat</th>
                                    <th className="py-3.5 px-4">Formation / Niveau</th>
                                    <th className="py-3.5 px-4">Date dépôt</th>
                                    <th className="py-3.5 px-4">CV</th>
                                    <th className="py-3.5 px-4">Statut</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {candidatures.map((c) => {
                                    const cfg = statutConfig[c.statut] || statutConfig['EN_ATTENTE'];
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-800">{c.prenom} {c.deuxiemePrenom} {c.nom}</div>
                                                <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <FiMail size={11} />{c.email}
                                                    {c.telephone && <><span className="text-slate-200">•</span><FiPhone size={11} />{c.telephone}</>}
                                                </div>
                                                <div className="flex gap-1 mt-1">
                                                    {(c.specialties || []).map((s: any) => (
                                                        <span key={s.specialty || s} className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                                            (s.specialty || s) === 'INFORMATIQUE' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                        }`}>
                                                            {s.specialty || s}
                                                        </span>
                                                    ))}
                                                </div>
                                                {c.assistant?.user?.login && (
                                                    <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                                        <FiKey size={11} /> Login : {c.assistant.user.login}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-semibold text-slate-700">{c.formation}</span>
                                                <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">{c.niveau}</span>
                                            </td>
                                            <td className="py-3.5 px-4 text-slate-500 text-xs">
                                                {new Date(c.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {c.cvUrl ? (
                                                    <button
                                                        onClick={() => downloadCV(c.cvUrl)}
                                                        className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
                                                    >
                                                        <FiDownload size={13} /> Télécharger
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Non fourni</span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-bold border ${cfg.cls}`}>
                                                    {cfg.icon} {cfg.label}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setSelectedCandidature(c)}
                                                        className="p-2 text-slate-500 hover:text-primary hover:bg-slate-100 rounded-lg transition-colors"
                                                        title="Consulter"
                                                    >
                                                        <FiEye size={16} />
                                                    </button>
                                                    {canEdit && c.statut === 'EN_ATTENTE' && (
                                                        <>
                                                            <button
                                                                onClick={() => { setCommentInput(''); setConfirmModal({ open: true, type: 'accept', item: c }); }}
                                                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1"
                                                            >
                                                                <FiCheck size={13} /> Accepter
                                                            </button>
                                                            <button
                                                                onClick={() => { setMotifRefus(''); setConfirmModal({ open: true, type: 'refuse', item: c }); }}
                                                                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 flex items-center gap-1"
                                                            >
                                                                <FiX size={13} /> Refuser
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal Détail */}
            {selectedCandidature && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 relative max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Dossier de candidature</h3>
                                <p className="text-xs text-slate-400">#{selectedCandidature.id} — {new Date(selectedCandidature.createdAt).toLocaleDateString('fr-FR')}</p>
                            </div>
                            <button onClick={() => setSelectedCandidature(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {/* Identité */}
                            <div className="p-4 bg-slate-50 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1"><FiUser size={11} />Identité</p>
                                <p className="text-xl font-bold text-slate-800">
                                    {selectedCandidature.prenom} {selectedCandidature.deuxiemePrenom} {selectedCandidature.nom}
                                </p>
                                <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                                    <FiMail size={13} />{selectedCandidature.email}
                                    {selectedCandidature.telephone && <><FiPhone size={13} />{selectedCandidature.telephone}</>}
                                </p>
                                {selectedCandidature.assistant?.user?.login && (
                                    <div className="mt-2 inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">
                                        <FiKey size={12} />Login : {selectedCandidature.assistant.user.login}
                                    </div>
                                )}
                            </div>

                            {/* Formation */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Formation</p>
                                    <p className="font-semibold text-slate-700">{selectedCandidature.formation}</p>
                                </div>
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Niveau</p>
                                    <p className="font-semibold text-slate-700">{selectedCandidature.niveau}</p>
                                </div>
                            </div>

                            {selectedCandidature.disponibilites && (
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Disponibilités</p>
                                    <p className="text-sm text-slate-600">{selectedCandidature.disponibilites}</p>
                                </div>
                            )}

                            {selectedCandidature.motivation && (
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                        <FiMessageSquare size={11} />Lettre de motivation
                                    </p>
                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedCandidature.motivation}</p>
                                </div>
                            )}

                            {selectedCandidature.cvUrl && (
                                <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-9 h-9 bg-rose-100 rounded-xl flex items-center justify-center">
                                            <FiFileText className="text-rose-600" size={18} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-700">Curriculum Vitæ</p>
                                            <p className="text-xs text-slate-400">{selectedCandidature.cvUrl.split('/').pop()}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => downloadCV(selectedCandidature.cvUrl)}
                                        className="flex items-center gap-1.5 bg-primary text-white px-3.5 py-2 rounded-xl text-xs font-semibold hover:bg-primary/90"
                                    >
                                        <FiDownload size={14} /> Télécharger
                                    </button>
                                </div>
                            )}

                            {selectedCandidature.commentaire && (
                                <div className="p-4 bg-violet-50 border border-violet-100 rounded-2xl">
                                    <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                        <FiMessageSquare size={11} />Commentaire
                                    </p>
                                    <p className="text-sm text-slate-700">{selectedCandidature.commentaire}</p>
                                </div>
                            )}

                            {selectedCandidature.motifRefus && (
                                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
                                    <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Motif de refus</p>
                                    <p className="text-sm text-rose-800">{selectedCandidature.motifRefus}</p>
                                </div>
                            )}
                        </div>

                        <div className="border-t border-slate-100 px-6 py-4 flex justify-end gap-3 bg-white rounded-b-3xl">
                            {canEdit && selectedCandidature.statut === 'EN_ATTENTE' && (
                                <>
                                    <button
                                        onClick={() => { setCommentInput(''); setConfirmModal({ open: true, type: 'accept', item: selectedCandidature }); }}
                                        className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold text-sm hover:bg-emerald-700 flex items-center gap-1.5"
                                    >
                                        <FiCheck size={15} /> Accepter
                                    </button>
                                    <button
                                        onClick={() => { setMotifRefus(''); setConfirmModal({ open: true, type: 'refuse', item: selectedCandidature }); }}
                                        className="px-4 py-2 bg-rose-600 text-white rounded-xl font-semibold text-sm hover:bg-rose-700 flex items-center gap-1.5"
                                    >
                                        <FiX size={15} /> Refuser
                                    </button>
                                </>
                            )}
                            <button onClick={() => setSelectedCandidature(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Confirmation Accepter/Refuser */}
            {confirmModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">
                            {confirmModal.type === 'accept' ? '✅ Accepter cette candidature ?' : '❌ Refuser cette candidature ?'}
                        </h3>
                        <p className="text-sm text-slate-500 mb-5">
                            Candidat : <strong className="text-slate-800">{confirmModal.item.prenom} {confirmModal.item.nom}</strong>
                            {' — '}{confirmModal.item.formation} ({confirmModal.item.niveau})
                        </p>

                        {confirmModal.type === 'accept' ? (
                            <div className="space-y-4">
                                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                                    <strong>En acceptant :</strong> un compte ASSISTANT sera créé automatiquement avec un login et un mot de passe temporaire.
                                    L'assistant recevra ses identifiants par email.
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">Commentaire (optionnel)</label>
                                    <textarea
                                        rows={2}
                                        value={commentInput}
                                        onChange={(e) => setCommentInput(e.target.value)}
                                        placeholder="ex: Excellent profil pour les TP d'Algorithmique"
                                        className="w-full p-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                                    Aucun compte ne sera créé. Le candidat ne recevra pas de notification automatique.
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                                        Motif de refus <span className="text-rose-500">*</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={motifRefus}
                                        onChange={(e) => setMotifRefus(e.target.value)}
                                        placeholder="ex: Profil ne correspondant pas aux besoins actuels..."
                                        className={`w-full p-2.5 text-sm bg-slate-50 border rounded-xl focus:ring-2 outline-none resize-none ${!motifRefus.trim() && confirmModal ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:ring-primary/20'}`}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-3">
                            <button onClick={() => setConfirmModal(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200">
                                Annuler
                            </button>
                            <button
                                disabled={actionLoading}
                                onClick={() => confirmModal.type === 'accept' ? handleAccepter(confirmModal.item.id) : handleRefuser(confirmModal.item.id)}
                                className={`px-5 py-2 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 ${confirmModal.type === 'accept' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                                {actionLoading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                {actionLoading ? 'Traitement...' : confirmModal.type === 'accept' ? 'Confirmer l\'acceptation' : 'Confirmer le refus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatBadge({ label, value, cls }: { label: string; value: number; cls: string }) {
    return (
        <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex flex-col items-center ${cls}`}>
            <span className="text-lg font-extrabold leading-none">{value}</span>
            <span className="text-[10px] font-semibold opacity-70">{label}</span>
        </div>
    );
}
