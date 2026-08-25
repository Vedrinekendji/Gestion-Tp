import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    FiActivity, FiSearch, FiUser, FiCalendar, FiClock, FiFilter
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Historique() {
    const { token } = useAuth();
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('TOUT');

    useEffect(() => {
        fetchLogs();
    }, [token, actionFilter, search]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams();
            if (actionFilter !== 'TOUT') query.append('action', actionFilter);
            if (search) query.append('search', search);

            const res = await fetch(`${API_URL}/api/historique?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur lors de la récupération de l\'historique.');
            const data = await res.json();
            setLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FiActivity className="text-primary" /> Historique & Audit Pédagogique
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Journal complet des actions pédagogiques, candidatures et validations d'heures.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher utilisateur, objet ou détail..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <FiFilter className="text-slate-400 shrink-0" size={16} />
                    {['TOUT', 'CANDIDATURE_ACCEPTEE', 'CANDIDATURE_REFUSEE', 'RESERVATION_VALIDEE', 'RESERVATION_REFUSEE', 'HEURES_VALIDEES', 'HEURES_REFUSEES'].map((act) => (
                        <button
                            key={act}
                            onClick={() => setActionFilter(act)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${actionFilter === act
                                ? 'bg-primary text-white border-primary shadow-sm'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {act === 'TOUT' ? 'Toutes les actions' :
                                act === 'CANDIDATURE_ACCEPTEE' ? 'Candidatures acceptées' :
                                    act === 'CANDIDATURE_REFUSEE' ? 'Candidatures refusées' :
                                        act === 'RESERVATION_VALIDEE' ? 'Créneaux validés' :
                                            act === 'RESERVATION_REFUSEE' ? 'Créneaux refusés' :
                                                act === 'HEURES_VALIDEES' ? 'Heures validées' : 'Heures refusées'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-slate-400">Chargement du journal d'audit...</div>
                ) : logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        <FiActivity size={36} className="mx-auto mb-2 opacity-50" />
                        <p className="font-semibold text-slate-600">Aucun événement enregistré</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Date & Heure</th>
                                    <th className="py-3.5 px-4">Utilisateur</th>
                                    <th className="py-3.5 px-4">Action</th>
                                    <th className="py-3.5 px-4">Objet concerné</th>
                                    <th className="py-3.5 px-4">Détails</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {logs.map((log) => {
                                    const dateObj = new Date(log.date);
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3.5 px-4 whitespace-nowrap">
                                                <div className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                                                    <FiCalendar size={12} className="text-primary" /> {dateObj.toLocaleDateString('fr-FR')}
                                                </div>
                                                <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <FiClock size={11} /> {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                                                    <FiUser className="text-slate-400" size={14} /> {log.utilisateur}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-bold ${log.action.includes('ACCEPTEE') || log.action.includes('VALIDEE')
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : log.action.includes('REFUSEE')
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-slate-800 text-xs">
                                                {log.objet}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-500 max-w-[300px] truncate" title={log.details}>
                                                {log.details || '-'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
