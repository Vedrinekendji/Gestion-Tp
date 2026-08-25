import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    FiClock, FiCheckCircle, FiXCircle, FiSliders, FiAlertCircle, FiUser, FiCalendar, FiEye
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function DemandesCreneaux() {
    const { token, user } = useAuth();
    const [demandes, setDemandes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [statutFilter, setStatutFilter] = useState('EN_ATTENTE');
    const [config, setConfig] = useState<{ id: number; blocageCreneauEnAttente: boolean }>({ id: 1, blocageCreneauEnAttente: false });

    // Detail Modal
    const [selectedDemande, setSelectedDemande] = useState<any | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [refusMotif, setRefusMotif] = useState('');
    const [refusModal, setRefusModal] = useState<any | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const canEdit = user?.role === 'responsable_pedagogique' || user?.role === 'professeur' || user?.role === 'admin';

    useEffect(() => {
        fetchDemandes();
        fetchConfig();
    }, [token, statutFilter]);

    const fetchDemandes = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_URL}/api/creneaux/demandes?statut=${statutFilter}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur lors du chargement des demandes.');
            const data = await res.json();
            setDemandes(data);
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchConfig = async () => {
        try {
            const res = await fetch(`${API_URL}/api/creneaux/config`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setConfig(data);
            }
        } catch (err) {
            console.error('Erreur config', err);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const handleValider = async (id: number) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/creneaux/demandes/${id}/valider`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur lors de la validation.');
            }

            showToast('Réservation de créneau confirmée !', 'success');
            fetchDemandes();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefuser = async (id: number) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${API_URL}/api/creneaux/demandes/${id}/refuser`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ motif: refusMotif }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Erreur lors du refus.');
            }

            showToast('Demande refusée. Le créneau est à nouveau disponible.', 'success');
            setRefusModal(null);
            setRefusMotif('');
            fetchDemandes();
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setActionLoading(false);
        }
    };

    const toggleConfig = async (val: boolean) => {
        try {
            const res = await fetch(`${API_URL}/api/creneaux/config`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ blocageCreneauEnAttente: val }),
            });
            if (res.ok) {
                setConfig({ ...config, blocageCreneauEnAttente: val });
                showToast(`Règle mise à jour : les demandes en attente ${val ? 'bloquent' : 'ne bloquent pas'} la visibilité.`, 'success');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
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
                        <FiClock className="text-amber-500" /> Demandes de Créneaux TP
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Consultez et validez les créneaux sélectionnés par les assistants.</p>
                </div>
            </div>

            {/* Config Bar */}
            {canEdit && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50/70 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 text-white rounded-xl">
                            <FiSliders size={20} />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-800">Règle Métier de Blocage des Créneaux</h4>
                            <p className="text-xs text-slate-600">
                                {config.blocageCreneauEnAttente
                                    ? 'Une demande en attente bloque temporairement la visibilité du créneau pour les autres assistants.'
                                    : 'Une demande en attente laisse le créneau visible pour d\'autres candidats tant qu\'elle n\'est pas validée.'}
                            </p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={config.blocageCreneauEnAttente}
                            onChange={(e) => toggleConfig(e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
            )}

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
                        {st === 'EN_ATTENTE' ? 'Demandes en attente' :
                            st === 'VALIDEE' ? 'Réservations validées' :
                                st === 'REFUSEE' ? 'Demandes refusées' : 'Toutes les demandes'}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Chargement des demandes...</div>
                ) : demandes.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <FiClock size={36} className="mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">Aucune demande dans cette catégorie</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Assistant</th>
                                    <th className="py-3.5 px-4">Matière & Groupe</th>
                                    <th className="py-3.5 px-4">Professeur</th>
                                    <th className="py-3.5 px-4">Date & Horaires</th>
                                    <th className="py-3.5 px-4">Salle</th>
                                    <th className="py-3.5 px-4">Date Demande</th>
                                    <th className="py-3.5 px-4">Statut</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {demandes.map((d) => (
                                    <tr key={d.id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <FiUser className="text-slate-400" size={14} /> {d.assistantNom}
                                            </div>
                                            <div className="text-xs text-slate-400">{d.assistantFormation}</div>
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.matiereCouleur || '#4361ee' }}></span>
                                                {d.matiere}
                                            </div>
                                            <div className="text-xs text-slate-500">{d.groupe}</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                                            {d.professeurNom}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                                                <FiCalendar size={12} className="text-primary" /> {new Date(d.date).toLocaleDateString('fr-FR')}
                                            </div>
                                            <div className="text-[11px] text-slate-500">{d.heureDebut} - {d.heureFin} ({d.heuresCount}h)</div>
                                        </td>
                                        <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
                                            {d.salle || 'N/A'}
                                        </td>
                                        <td className="py-3.5 px-4 text-xs text-slate-400">
                                            {new Date(d.dateDemande).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold ${d.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-800' :
                                                d.statut === 'VALIDEE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                                }`}>
                                                {d.statut === 'EN_ATTENTE' ? 'En attente' : d.statut === 'VALIDEE' ? 'Confirmée' : 'Refusée'}
                                            </span>
                                        </td>
                                        <td className="py-3.5 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setSelectedDemande(d)}
                                                    className="p-1.5 text-slate-500 hover:text-primary rounded-lg hover:bg-slate-100 transition-colors"
                                                    title="Détails"
                                                >
                                                    <FiEye size={16} />
                                                </button>
                                                {canEdit && d.statut === 'EN_ATTENTE' && (
                                                    <>
                                                        <button
                                                            disabled={actionLoading}
                                                            onClick={() => handleValider(d.id)}
                                                            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <FiCheckCircle size={14} /> Valider
                                                        </button>
                                                        <button
                                                            disabled={actionLoading}
                                                            onClick={() => setRefusModal(d)}
                                                            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 flex items-center gap-1 cursor-pointer"
                                                        >
                                                            <FiXCircle size={14} /> Refuser
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

            {/* Detail Modal */}
            {selectedDemande && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Détails de la demande de créneau</h3>
                        <div className="space-y-3 text-sm">
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs text-slate-400 font-semibold uppercase">Assistant</span>
                                <p className="font-bold text-slate-800">{selectedDemande.assistantNom}</p>
                                <p className="text-xs text-slate-500">{selectedDemande.assistantFormation} ({selectedDemande.assistantNiveau})</p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl">
                                <span className="text-xs text-slate-400 font-semibold uppercase">Séance TP</span>
                                <p className="font-bold text-slate-800">{selectedDemande.matiere} - {selectedDemande.groupe}</p>
                                <p className="text-xs text-slate-500">Prof. {selectedDemande.professeurNom} • Salle {selectedDemande.salle}</p>
                                <p className="text-xs font-semibold text-primary mt-1">
                                    Date : {new Date(selectedDemande.date).toLocaleDateString('fr-FR')} de {selectedDemande.heureDebut} à {selectedDemande.heureFin} ({selectedDemande.heuresCount}h)
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={() => setSelectedDemande(null)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold">
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Refus Modal */}
            {refusModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Refuser la réservation de créneau</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Assistant : <strong className="text-slate-800">{refusModal.assistantNom}</strong> pour {refusModal.matiere}
                        </p>
                        <div>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">Motif du refus (optionnel)</label>
                            <textarea
                                rows={3}
                                value={refusMotif}
                                onChange={(e) => setRefusMotif(e.target.value)}
                                placeholder="Indiquez pourquoi la demande n'est pas acceptée..."
                                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-400/20"
                            />
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setRefusModal(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm">
                                Annuler
                            </button>
                            <button
                                onClick={() => handleRefuser(refusModal.id)}
                                className="px-5 py-2 bg-rose-600 text-white font-semibold rounded-xl text-sm hover:bg-rose-700 cursor-pointer"
                            >
                                Confirmer le refus
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
