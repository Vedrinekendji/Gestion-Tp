import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface FormData {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  note: string;
  formation: string;
  niveau: string;
  matieres: string[];
}

interface MatiereDb {
  id: number;
  code: string;
  nom: string;
  description: string | null;
  couleur: string | null;
}

export default function AddAssistant() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    nom: '', prenom: '', email: '', telephone: '', note: '',
    formation: '', niveau: '', matieres: []
  });

  const [matieresList, setMatieresList] = useState<MatiereDb[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMatieres = async () => {
      try {
        const res = await fetch(`${API_URL}/api/matieres`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMatieresList(data);
        }
      } catch (err) {
        console.error('Erreur chargement matières:', err);
      }
    };
    fetchMatieres();
  }, [token]);

  const stepTitles = [
    'Informations personnelles',
    'Formation & matières',
    'Récapitulatif'
  ];

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handlePrev = () => setStep(s => Math.max(s - 1, 1));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/assistants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création de l\'assistant');
      }

      navigate('/assistants');
    } catch (err: any) {
      setError(err.message || 'Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  const toggleMatiere = (code: string) => {
    setFormData(prev => ({
      ...prev,
      matieres: prev.matieres.includes(code)
        ? prev.matieres.filter(m => m !== code)
        : [...prev.matieres, code]
    }));
  };

  return (
    <div className="max-w-[850px] mx-auto w-full pb-10 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/assistants" className="w-10 h-10 border border-border rounded-lg bg-white flex items-center justify-center text-text-secondary hover:bg-content-bg transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </Link>
        <div>
          <h1 className="text-[22px] font-bold text-text-primary tracking-[-0.4px]">Ajouter un assistant</h1>
          <p className="text-[13.5px] text-text-secondary mt-0.5">Étape {step} / 3 — {stepTitles[step-1]}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-danger-light border border-red-200 rounded-lg text-danger text-[13px] font-medium flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/></svg>
          {error}
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 max-w-[700px] mx-auto">
        {[1, 2, 3].map((s, idx) => (
          <div key={s} className="flex items-center w-full relative">
            <div className="flex items-center gap-3 shrink-0 relative z-10 bg-content-bg pr-4">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[12.5px] font-bold shrink-0 transition-colors ${
                step > s ? 'bg-success text-white' : step === s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg> : s}
              </div>
              <span className={`text-[13px] font-semibold ${step >= s ? 'text-text-primary' : 'text-text-muted'}`}>{stepTitles[s-1]}</span>
            </div>
            {idx < 2 && (
              <div className="absolute top-1/2 left-8 w-[calc(100%-32px)] h-[2px] -translate-y-1/2">
                <div className={`h-full transition-all duration-300 ${step > s ? 'bg-success' : 'bg-gray-200'}`}></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-4 mb-6">
        
        {step === 1 && (
          <>
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center gap-2 text-primary font-semibold text-[15px] mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                Informations personnelles
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-text-primary">Nom <span className="text-danger">*</span></label>
                  <input type="text" className="border border-border rounded-lg px-3 py-2.5 text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400" placeholder="Benali" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-text-primary">Prénom <span className="text-danger">*</span></label>
                  <input type="text" className="border border-border rounded-lg px-3 py-2.5 text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400" placeholder="Amina" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-text-primary">Email <span className="text-danger">*</span></label>
                  <div className="relative flex items-center">
                    <svg className="absolute left-3 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="1.5"/><polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <input type="email" className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400" placeholder="a.benali@gestiontp.dz" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-text-primary">Téléphone <span className="text-danger">*</span></label>
                  <div className="relative flex items-center">
                    <svg className="absolute left-3 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" stroke="currentColor" strokeWidth="1.5"/></svg>
                    <input type="tel" className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400" placeholder="+213 555 123 456" value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-text-primary">Note</label>
                <textarea className="border border-border rounded-lg px-3 py-2.5 text-[13.5px] h-24 resize-none outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-gray-400" placeholder="Observations ou informations complémentaires..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
              </div>
            </div>

            <div className="bg-white border border-border rounded-xl p-6 shadow-sm flex flex-col items-center">
              <h3 className="text-[14px] font-semibold text-text-primary self-start mb-4">Photo de profil</h3>
              <div className="w-full flex-1 border-2 border-dashed border-primary/30 bg-primary-light/30 rounded-xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-colors hover:bg-primary-light/60">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-3">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>
                </div>
                <div className="bg-primary text-white text-[12px] font-bold px-2 py-0.5 rounded-sm mb-1">Cliquer pour télécharger</div>
                <div className="text-[11px] font-bold text-primary">JPG, PNG — Max 5 MB</div>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="bg-white border border-border rounded-xl p-6 shadow-sm h-full">
              <div className="flex items-center gap-2 text-primary font-semibold text-[15px] mb-5">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6 12v5c3 3 9 3 12 0v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Informations académiques
              </div>

              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-text-primary">Formation</label>
                  <select className="border border-border rounded-lg px-3 py-2.5 text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white text-text-primary appearance-none cursor-pointer" value={formData.formation} onChange={e => setFormData({...formData, formation: e.target.value})}>
                    <option value="">Choisir une formation</option>
                    <option value="Licence">Licence</option>
                    <option value="Master 1 Informatique">Master 1 Informatique</option>
                    <option value="Master 2 Informatique">Master 2 Informatique</option>
                    <option value="Master 2 Systèmes">Master 2 Systèmes</option>
                    <option value="Doctorat Informatique">Doctorat Informatique</option>
                    <option value="Doctorat Mathématiques">Doctorat Mathématiques</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-semibold text-text-primary">Niveau enseigné</label>
                  <select className="border border-border rounded-lg px-3 py-2.5 text-[13.5px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all bg-white text-text-primary appearance-none cursor-pointer" value={formData.niveau} onChange={e => setFormData({...formData, niveau: e.target.value})}>
                    <option value="">Choisir un niveau</option>
                    <option value="L1">L1</option>
                    <option value="L2">L2</option>
                    <option value="L3">L3</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                    <option value="PhD">PhD</option>
                  </select>
                </div>
                <div className="bg-[#f8fafc] border border-blue-100 rounded-lg p-3.5 flex gap-3 text-text-secondary">
                  <svg className="text-primary mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" strokeWidth="2"/></svg>
                  <p className="text-[11.5px] leading-relaxed">Le niveau détermine les groupes étudiants pouvant être assignés à cet assistant.</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-xl p-6 shadow-sm md:col-span-1 h-full flex flex-col min-w-[320px]">
              <div className="flex items-center gap-2 text-primary font-semibold text-[15px] mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Matières maîtrisées
              </div>

              <div className="flex flex-col gap-2.5 flex-1 pr-1 overflow-y-auto max-h-[340px]">
                {matieresList.map(m => (
                  <div key={m.code} className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:border-primary/50 ${formData.matieres.includes(m.code) ? 'border-primary bg-primary/5 shadow-[0_2px_8px_rgba(67,97,238,0.08)]' : 'border-border bg-white'}`} onClick={() => toggleMatiere(m.code)}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center mr-3 shrink-0 transition-colors ${formData.matieres.includes(m.code) ? 'bg-primary border-primary text-white' : 'border-gray-300'}`}>
                      {formData.matieres.includes(m.code) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-text-primary">{m.nom}</div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide shrink-0" style={{ background: (m.couleur || '#4361ee') + '20', color: m.couleur || '#4361ee' }}>{m.code}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <div className="md:col-span-2 bg-white border border-border rounded-xl p-6 shadow-sm">
            <h3 className="text-[16px] font-bold text-text-primary mb-6">Récapitulatif</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <h4 className="text-[11px] font-bold text-text-muted tracking-widest uppercase mb-4">Informations personnelles</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-[13px] text-text-secondary">Nom complet</span>
                    <span className="text-[13.5px] font-semibold text-text-primary">{formData.prenom} {formData.nom}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-[13px] text-text-secondary">Email</span>
                    <span className="text-[13.5px] font-semibold text-text-primary">{formData.email}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-[13px] text-text-secondary">Téléphone</span>
                    <span className="text-[13.5px] font-semibold text-text-primary">{formData.telephone}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-[11px] font-bold text-text-muted tracking-widest uppercase mb-4">Académique</h4>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-[13px] text-text-secondary">Formation</span>
                    <span className="text-[13.5px] font-semibold text-text-primary">{formData.formation || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-border/60 pb-3">
                    <span className="text-[13px] text-text-secondary">Niveau</span>
                    <span className="text-[13.5px] font-semibold text-text-primary">{formData.niveau || '—'}</span>
                  </div>
                  <div className="flex items-start justify-between border-b border-border/60 pb-3 pt-1">
                    <span className="text-[13px] text-text-secondary mt-1">Matières</span>
                    <div className="flex flex-wrap gap-1.5 justify-end">
                      {formData.matieres.length > 0 ? formData.matieres.map(mCode => {
                        const m = matieresList.find(x => x.code === mCode);
                        return m ? <span key={m.code} className="inline-flex items-center px-2 py-0.5 rounded text-[10.5px] font-bold tracking-wide" style={{ background: (m.couleur || '#4361ee') + '20', color: m.couleur || '#4361ee' }}>{m.code}</span> : null;
                      }) : <span className="text-[13.5px] font-semibold text-text-primary">—</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100">
              <span className="block text-[11px] font-bold text-warning tracking-widest uppercase mb-1">Note</span>
              <p className="text-[13px] text-warning/90">{formData.note || 'Aucune note.'}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between mt-4">
        {step === 1 ? (
          <Link to="/assistants" className="btn bg-white border border-border text-text-secondary text-[13.5px] px-5 py-2.5 font-semibold hover:bg-content-bg">Annuler</Link>
        ) : (
          <button className="btn bg-white border border-border text-text-secondary text-[13.5px] px-5 py-2.5 font-semibold hover:bg-content-bg" onClick={handlePrev}>Précédent</button>
        )}
        
        {step < 3 ? (
          <button className="btn btn-primary px-6 py-2.5 text-[13.5px] font-semibold inline-flex items-center gap-1.5 shadow-[0_3px_10px_rgba(67,97,238,0.25)]" onClick={handleNext}>
            Suivant <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        ) : (
          <button className="btn btn-primary px-6 py-2.5 text-[13.5px] font-semibold inline-flex items-center gap-1.5 shadow-[0_3px_10px_rgba(67,97,238,0.25)]" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Enregistrement...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Enregistrer l'assistant
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
