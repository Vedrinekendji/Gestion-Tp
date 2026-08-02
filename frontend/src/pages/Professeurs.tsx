import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AVATAR_COLORS = ['#4361ee', '#10b981', '#f97316', '#8b5cf6', '#ef4444', '#f59e0b', '#0ea5e9'];

interface ProfesseurData {
  id: number;
  nom: string;
  email: string;
  telephone: string | null;
  departement: string;
  nbSeances: number;
}

interface FormState {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  departement: string;
}

const EMPTY_FORM: FormState = { nom: '', prenom: '', email: '', telephone: '', departement: '' };

export default function Professeurs() {
  const { token } = useAuth();
  const [professeurs, setProfesseurs] = useState<ProfesseurData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchProfesseurs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/professeurs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur de chargement');
      const data = await res.json();
      setProfesseurs(data);
    } catch (err) {
      setError('Impossible de charger les professeurs.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProfesseurs(); }, []);

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : name.substring(0, 2).toUpperCase();
  };

  const getColor = (id: number) => AVATAR_COLORS[id % AVATAR_COLORS.length];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/professeurs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la création.');
      setForm(EMPTY_FORM);
      setShowForm(false);
      await fetchProfesseurs();
    } catch (err: any) {
      setFormError(err.message || 'Erreur réseau.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce professeur ? Cette action est irréversible.')) return;
    try {
      const res = await fetch(`${API_URL}/api/professeurs/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) await fetchProfesseurs();
    } catch (err) {
      console.error('Erreur suppression professeur:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[14px] text-text-secondary">Chargement des professeurs...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="text-[36px]">⚠️</div>
          <p className="text-text-secondary">{error}</p>
          <button onClick={fetchProfesseurs} className="btn btn-primary px-4 py-2 text-[13px]">Réessayer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in relative">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.3px]">Professeurs</h2>
          <p className="text-[13px] text-text-secondary mt-[3px]">{professeurs.length} professeur{professeurs.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormError(''); }}
          className="inline-flex items-center gap-2 py-2 px-4 bg-primary text-white border-none rounded-md text-[13.5px] font-medium shadow-[0_2px_8px_rgba(67,97,238,0.3)] transition-all hover:bg-primary-dark hover:-translate-y-[1px] cursor-pointer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Ajouter un professeur
        </button>
      </div>

      <div className="bg-card-bg border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#f8f9fc] border-b border-border">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em]">NOM</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em]">DÉPARTEMENT</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em]">TÉLÉPHONE</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em]">SÉANCES</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-text-muted tracking-[0.04em]">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {professeurs.map(p => (
                <tr key={p.id} className="border-b border-border last:border-b-0 hover:bg-[#fafbff] transition-colors">
                  <td className="px-4 py-3.5 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center rounded-full font-semibold text-[13px] shrink-0 w-9 h-9" style={{ background: getColor(p.id), color: '#fff' }}>{getInitials(p.nom)}</div>
                      <div>
                        <div className="text-[13.5px] font-semibold text-text-primary">{p.nom}</div>
                        <div className="text-[11.5px] text-text-muted mt-0.5">✉ {p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 align-middle text-[13px] text-text-primary">{p.departement}</td>
                  <td className="px-4 py-3.5 align-middle text-[13px] text-text-primary">{p.telephone || '—'}</td>
                  <td className="px-4 py-3.5 align-middle text-[13px] text-text-primary">{p.nbSeances}</td>
                  <td className="px-4 py-3.5 align-middle">
                    <button className="p-2 rounded-md bg-transparent border-none cursor-pointer text-danger transition-colors hover:bg-danger-light" title="Supprimer" onClick={() => handleDelete(p.id)}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {professeurs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[13px] text-text-muted">Aucun professeur pour le moment.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowForm(false)}></div>
          <form onSubmit={handleCreate} className="bg-white w-full max-w-[440px] rounded-xl shadow-2xl relative z-10 p-6 flex flex-col gap-4">
            <h3 className="text-[16px] font-bold text-text-primary">Ajouter un professeur</h3>

            {formError && (
              <div className="p-3 bg-danger-light border border-red-200 rounded-lg text-danger text-[12.5px] font-medium">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-primary">Nom *</label>
                <input required className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-primary">Prénom *</label>
                <input required className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={form.prenom} onChange={e => setForm({ ...form, prenom: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12.5px] font-semibold text-text-primary">Email *</label>
              <input required type="email" className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-primary">Téléphone</label>
                <input className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12.5px] font-semibold text-text-primary">Département</label>
                <input className="border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" value={form.departement} onChange={e => setForm({ ...form, departement: e.target.value })} />
              </div>
            </div>

            <p className="text-[11.5px] text-text-muted">Un mot de passe par défaut (<strong>prof123</strong>) sera attribué au compte.</p>

            <div className="flex gap-3 mt-2">
              <button type="button" className="flex-1 py-2.5 border border-border rounded-lg text-text-primary font-medium text-[13px] hover:bg-content-bg" onClick={() => setShowForm(false)}>Annuler</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-primary text-white border-none rounded-lg font-medium text-[13px] hover:bg-primary-dark disabled:opacity-60">
                {saving ? 'Enregistrement...' : 'Créer'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
