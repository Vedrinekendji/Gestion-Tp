import { useState, useEffect } from 'react';
import { FiUsers, FiUserPlus, FiSearch, FiTrash2, FiEdit, FiCheckCircle, FiAlertTriangle, FiX, FiShield, FiKey } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface UserItem {
    id: number;
    email: string;
    role: string;
    createdAt: string;
    nomComplet: string;
    statut: string;
    details: string;
}

export default function AdminUtilisateurs() {
    const { token } = useAuth();
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        email: '',
        password: '',
        role: 'ASSISTANT',
        prenom: '',
        nom: '',
    });

    const [editRoleUser, setEditRoleUser] = useState<UserItem | null>(null);
    const [selectedRole, setSelectedRole] = useState('');

    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            setError('');
            const res = await fetch(`${API_URL}/api/admin/users`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Erreur de chargement des utilisateurs.');
            const data = await res.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message || 'Impossible de charger la liste des utilisateurs.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(createForm),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la création.');

            setFeedback({ message: `Compte ${data.email} créé avec succès !`, type: 'success' });
            setShowCreateModal(false);
            setCreateForm({ email: '', password: '', role: 'ASSISTANT', prenom: '', nom: '' });
            await fetchUsers();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateRole = async () => {
        if (!editRoleUser) return;
        setSubmitting(true);
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${editRoleUser.id}/role`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ role: selectedRole }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de rôle.');

            setFeedback({ message: `Rôle mis à jour pour ${editRoleUser.email}`, type: 'success' });
            setEditRoleUser(null);
            await fetchUsers();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteUser = async (user: UserItem) => {
        if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte ${user.email} ?`)) {
            return;
        }
        setFeedback(null);
        try {
            const res = await fetch(`${API_URL}/api/admin/users/${user.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression.');

            setFeedback({ message: `Compte ${user.email} supprimé.`, type: 'success' });
            await fetchUsers();
        } catch (err: any) {
            setFeedback({ message: err.message, type: 'error' });
        }
    };

    const filteredUsers = users.filter(u => {
        if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
        if (search.trim()) {
            const s = search.toLowerCase();
            return u.email.toLowerCase().includes(s) || u.nomComplet.toLowerCase().includes(s) || u.role.toLowerCase().includes(s);
        }
        return true;
    });

    const roleBadge = (role: string) => {
        switch (role) {
            case 'ADMIN':
                return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/10 text-purple-600 border border-purple-500/20">Admin Technique</span>;
            case 'RESPONSABLE_PEDAGOGIQUE':
            case 'PROFESSEUR':
                return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">Resp. Pédagogique</span>;
            case 'ASSISTANT':
                return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Assistant TP</span>;
            case 'SERVICE_ADMINISTRATIF':
                return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">Service Admin</span>;
            default:
                return <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-gray-500/10 text-gray-600">{role}</span>;
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card-bg border border-border p-5 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-[24px] font-bold text-text-primary tracking-tight flex items-center gap-2">
                        <FiShield className="text-primary" /> Administration des Utilisateurs
                    </h2>
                    <p className="text-[13.5px] text-text-secondary mt-1">
                        Gestion des comptes, rôles système et accès techniques (Périmètre Administrateur Technique).
                    </p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-[13.5px] rounded-xl shadow-md hover:bg-primary-hover transition-all cursor-pointer border-none shrink-0"
                >
                    <FiUserPlus className="text-lg" /> Nouveau Compte
                </button>
            </div>

            {/* Feedback message */}
            {feedback && (
                <div className={`p-4 rounded-xl text-[13.5px] font-medium flex items-center justify-between gap-3 shadow-sm ${feedback.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'}`}>
                    <div className="flex items-center gap-2">
                        {feedback.type === 'success' ? <FiCheckCircle className="text-lg" /> : <FiAlertTriangle className="text-lg" />}
                        <span>{feedback.message}</span>
                    </div>
                    <button onClick={() => setFeedback(null)} className="text-[12px] opacity-70 hover:opacity-100 border-none bg-transparent cursor-pointer"><FiX /></button>
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-xl shrink-0">
                        <FiUsers />
                    </div>
                    <div>
                        <div className="text-[22px] font-bold text-text-primary leading-tight">{users.length}</div>
                        <div className="text-[12.5px] text-text-secondary">Comptes totaux</div>
                    </div>
                </div>

                <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xl shrink-0">
                        <FiShield />
                    </div>
                    <div>
                        <div className="text-[22px] font-bold text-text-primary leading-tight">
                            {users.filter(u => u.role === 'RESPONSABLE_PEDAGOGIQUE' || u.role === 'PROFESSEUR').length}
                        </div>
                        <div className="text-[12.5px] text-text-secondary">Responsables</div>
                    </div>
                </div>

                <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                        <FiUsers />
                    </div>
                    <div>
                        <div className="text-[22px] font-bold text-text-primary leading-tight">
                            {users.filter(u => u.role === 'ASSISTANT').length}
                        </div>
                        <div className="text-[12.5px] text-text-secondary">Assistants</div>
                    </div>
                </div>

                <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl shrink-0">
                        <FiKey />
                    </div>
                    <div>
                        <div className="text-[22px] font-bold text-text-primary leading-tight">
                            {users.filter(u => u.role === 'ADMIN').length}
                        </div>
                        <div className="text-[12.5px] text-text-secondary">Admins Tech</div>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-card-bg border border-border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full sm:w-auto">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-[14px]" />
                    <input
                        type="text"
                        placeholder="Rechercher par email, nom..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary"
                    />
                </div>

                <select
                    value={roleFilter}
                    onChange={e => setRoleFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary cursor-pointer"
                >
                    <option value="ALL">Tous les rôles</option>
                    <option value="ADMIN">Admin Technique</option>
                    <option value="RESPONSABLE_PEDAGOGIQUE">Responsable Pédagogique</option>
                    <option value="ASSISTANT">Assistant TP</option>
                    <option value="SERVICE_ADMINISTRATIF">Service Administratif</option>
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="p-8 text-center text-rose-500 font-medium">{error}</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-content-bg border-b border-border text-[12px] font-semibold text-text-secondary uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Utilisateur</th>
                                    <th className="py-3.5 px-4">Email</th>
                                    <th className="py-3.5 px-4">Rôle Système</th>
                                    <th className="py-3.5 px-4">Profil / Détails</th>
                                    <th className="py-3.5 px-4">Date de Création</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border text-[13px] text-text-primary">
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-text-muted">
                                            Aucun utilisateur trouvé.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-content-bg/50 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold">{user.nomComplet}</td>
                                            <td className="py-3.5 px-4 font-mono text-[12.5px] text-text-secondary">{user.email}</td>
                                            <td className="py-3.5 px-4">{roleBadge(user.role)}</td>
                                            <td className="py-3.5 px-4 text-text-secondary text-[12.5px]">{user.details}</td>
                                            <td className="py-3.5 px-4 text-text-muted text-[12px]">
                                                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditRoleUser(user);
                                                            setSelectedRole(user.role);
                                                        }}
                                                        className="p-1.5 rounded-lg bg-content-bg hover:bg-border text-text-secondary hover:text-text-primary cursor-pointer border border-border"
                                                        title="Modifier le rôle"
                                                    >
                                                        <FiEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user)}
                                                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 cursor-pointer border border-rose-500/20"
                                                        title="Supprimer le compte"
                                                    >
                                                        <FiTrash2 />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL: CREATE USER */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-card-bg border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-[17px] font-bold text-text-primary flex items-center gap-2">
                                <FiUserPlus className="text-primary" /> Créer un Utilisateur
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer text-lg">
                                <FiX />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="flex flex-col gap-3">
                            <div>
                                <label className="text-[12.5px] font-medium text-text-secondary block mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="nom@universite.fr"
                                    value={createForm.email}
                                    onChange={e => setCreateForm({ ...createForm, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-[12.5px] font-medium text-text-secondary block mb-1">Mot de passe *</label>
                                <input
                                    type="password"
                                    required
                                    placeholder="Mot de passe temporaire"
                                    value={createForm.password}
                                    onChange={e => setCreateForm({ ...createForm, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="text-[12.5px] font-medium text-text-secondary block mb-1">Rôle Système *</label>
                                <select
                                    value={createForm.role}
                                    onChange={e => setCreateForm({ ...createForm, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary cursor-pointer"
                                >
                                    <option value="ASSISTANT">Assistant TP</option>
                                    <option value="RESPONSABLE_PEDAGOGIQUE">Responsable Pédagogique</option>
                                    <option value="SERVICE_ADMINISTRATIF">Service Administratif</option>
                                    <option value="ADMIN">Administrateur Technique</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[12.5px] font-medium text-text-secondary block mb-1">Prénom</label>
                                    <input
                                        type="text"
                                        placeholder="Prénom"
                                        value={createForm.prenom}
                                        onChange={e => setCreateForm({ ...createForm, prenom: e.target.value })}
                                        className="w-full px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="text-[12.5px] font-medium text-text-secondary block mb-1">Nom</label>
                                    <input
                                        type="text"
                                        placeholder="Nom"
                                        value={createForm.nom}
                                        onChange={e => setCreateForm({ ...createForm, nom: e.target.value })}
                                        className="w-full px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-border mt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 bg-content-bg hover:bg-border text-text-primary text-[13px] font-medium rounded-xl border border-border cursor-pointer"
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-[13px] font-medium rounded-xl border-none cursor-pointer disabled:opacity-50"
                                >
                                    {submitting ? 'Création...' : 'Créer l\'utilisateur'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: EDIT ROLE */}
            {editRoleUser && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-card-bg border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <h3 className="text-[16px] font-bold text-text-primary">Modifier le rôle</h3>
                            <button onClick={() => setEditRoleUser(null)} className="text-text-muted hover:text-text-primary border-none bg-transparent cursor-pointer text-lg">
                                <FiX />
                            </button>
                        </div>

                        <div className="text-[13px] text-text-secondary">
                            Modification du rôle pour <strong className="text-text-primary">{editRoleUser.email}</strong> :
                        </div>

                        <select
                            value={selectedRole}
                            onChange={e => setSelectedRole(e.target.value)}
                            className="w-full px-3 py-2 bg-content-bg border border-border rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-primary cursor-pointer"
                        >
                            <option value="ASSISTANT">Assistant TP</option>
                            <option value="RESPONSABLE_PEDAGOGIQUE">Responsable Pédagogique</option>
                            <option value="SERVICE_ADMINISTRATIF">Service Administratif</option>
                            <option value="ADMIN">Administrateur Technique</option>
                        </select>

                        <div className="flex justify-end gap-3 pt-3 border-t border-border">
                            <button
                                onClick={() => setEditRoleUser(null)}
                                className="px-4 py-2 bg-content-bg text-text-primary text-[13px] rounded-xl border border-border cursor-pointer"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleUpdateRole}
                                disabled={submitting}
                                className="px-4 py-2 bg-primary text-white text-[13px] rounded-xl border-none cursor-pointer disabled:opacity-50"
                            >
                                {submitting ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
