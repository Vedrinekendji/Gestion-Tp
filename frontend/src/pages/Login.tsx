import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState<'admin' | 'professeur' | 'assistant'>('professeur');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Email ou mot de passe incorrect.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    if (role === 'admin') {
      setEmail('admin@gestiontp.dz');
      setPassword('admin123');
    } else if (role === 'professeur') {
      setEmail('prof@gestiontp.dz');
      setPassword('prof123');
    } else {
      setEmail('a.benali@gestiontp.dz');
      setPassword('asst123');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden font-sans">
      {/* Left Panel */}
      <div className="hidden md:flex w-[420px] shrink-0 bg-sidebar-bg flex-col py-10 px-9 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-[120px] -right-[120px] w-[340px] h-[340px] rounded-full bg-[radial-gradient(circle,rgba(67,97,238,0.18)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute -bottom-[100px] -left-[80px] w-[260px] h-[260px] rounded-full bg-[radial-gradient(circle,rgba(67,97,238,0.1)_0%,transparent_70%)] pointer-events-none" />

        <div className="flex items-center gap-3 mb-[60px]">
          <div className="w-[42px] h-[42px] bg-primary rounded-[10px] flex items-center justify-center shadow-[0_4px_12px_rgba(67,97,238,0.4)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-[20px] font-bold text-white tracking-[-0.3px]">Logiciel de gestion de TP</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-12 h-1 bg-white/20 mb-8 rounded-full"></div>
          <h1 className="text-[36px] font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Optimisez votre <br/><span className="text-primary-light">gestion académique</span>
          </h1>
          <p className="text-[15px] text-white/70 leading-relaxed mb-10 max-w-[340px]">
            Une solution logicielle centralisée conçue pour simplifier la planification, l'affectation et le suivi de vos équipes pédagogiques en toute sécurité.
          </p>
          
          <div className="flex items-center gap-6 text-white/60 text-[13px] font-medium">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Fiable
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Rapide
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Sécurisé
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 bg-white md:bg-content-bg flex items-center justify-center py-10 px-6 overflow-y-auto">
        <div className="w-full max-w-[440px] animate-fade-in">
          <div className="mb-7">
            <h2 className="text-[24px] font-bold text-text-primary mb-1 tracking-[-0.4px]">Connexion</h2>
            <p className="text-[14px] text-text-secondary">Accédez à votre espace de gestion</p>
          </div>

          {/* Role Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <button
              type="button"
              className={`relative flex items-center gap-2.5 p-3.5 bg-white border-2 rounded-md cursor-pointer transition-all hover:border-indigo-200 hover:bg-indigo-50/50 text-left ${role === 'admin' ? 'border-primary bg-primary-light' : 'border-border'}`}
              onClick={() => { setRole('admin'); setEmail(''); setPassword(''); setError(''); }}
            >
              <div className={`w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${role === 'admin' ? 'bg-primary/15 text-primary' : 'bg-purple-light text-purple'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-text-primary mb-[1px]">Admin</div>
                <div className="text-[11px] text-text-muted">Administrateur</div>
              </div>
              {role === 'admin' && <div className="absolute top-2 right-2 w-[18px] h-[18px] bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">✓</div>}
            </button>

            <button
              type="button"
              className={`relative flex items-center gap-2.5 p-3.5 bg-white border-2 rounded-md cursor-pointer transition-all hover:border-indigo-200 hover:bg-indigo-50/50 text-left ${role === 'professeur' ? 'border-primary bg-primary-light' : 'border-border'}`}
              onClick={() => { setRole('professeur'); setEmail(''); setPassword(''); setError(''); }}
            >
              <div className={`w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${role === 'professeur' ? 'bg-primary/15 text-primary' : 'bg-primary-light text-primary'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 14c3.866 0 7 1.343 7 3v1H5v-1c0-1.657 3.134-3 7-3z" fill="currentColor" opacity="0.2"/>
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 18c0-1.657 3.134-3 7-3s7 1.343 7 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M18 3v6M15.5 5.5l5 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-text-primary mb-[1px]">Professeur</div>
                <div className="text-[11px] text-text-muted">Chef de département</div>
              </div>
              {role === 'professeur' && <div className="absolute top-2 right-2 w-[18px] h-[18px] bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">✓</div>}
            </button>

            <button
              type="button"
              className={`relative flex items-center gap-2.5 p-3.5 bg-white border-2 rounded-md cursor-pointer transition-all hover:border-indigo-200 hover:bg-indigo-50/50 text-left ${role === 'assistant' ? 'border-primary bg-primary-light' : 'border-border'}`}
              onClick={() => { setRole('assistant'); setEmail(''); setPassword(''); setError(''); }}
            >
              <div className={`w-[38px] h-[38px] rounded-lg flex items-center justify-center shrink-0 ${role === 'assistant' ? 'bg-primary/15 text-primary' : 'bg-green-50 text-success'}`}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M5 18c0-1.657 3.134-3 7-3s7 1.343 7 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <div className="text-[13px] font-semibold text-text-primary mb-[1px]">Assistant TD</div>
                <div className="text-[11px] text-text-muted">Assistant de travaux dirigés</div>
              </div>
              {role === 'assistant' && <div className="absolute top-2 right-2 w-[18px] h-[18px] bg-primary text-white rounded-full text-[10px] font-bold flex items-center justify-center">✓</div>}
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white border border-border rounded-lg p-6 shadow-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Adresse e-mail</label>
              <div className="relative flex items-center">
                <svg className="absolute left-3 text-text-muted pointer-events-none z-10" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/>
                  <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  type="email"
                  className="w-full pl-[38px] pr-3 py-[9px] border border-border rounded-sm text-[13.5px] text-text-primary bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-text-muted"
                  placeholder={role === 'admin' ? 'admin@univ-alger.dz' : role === 'professeur' ? 'prof@univ-alger.dz' : 'assistant@univ-alger.dz'}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Mot de passe</label>
              <div className="relative flex items-center">
                <svg className="absolute left-3 text-text-muted pointer-events-none z-10" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full pl-[38px] pr-10 py-[9px] border border-border rounded-sm text-[13.5px] text-text-primary bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-text-muted"
                  placeholder="Votre mot de passe"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
                <button type="button" className="absolute right-2 text-text-muted flex items-center p-1 rounded transition-all hover:text-text-primary" onClick={() => setShowPass(!showPass)}>
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-danger-light border border-red-200 rounded-sm text-danger text-[13px]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                {error}
              </div>
            )}

            <div className="flex flex-col items-center gap-4 mt-2">
              <button type="submit" className="px-10 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-[14.5px] font-semibold transition-all shadow-md shadow-primary/20 disabled:opacity-80 flex items-center justify-center w-max" disabled={loading}>
                {loading && <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2"></span>}
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              <button type="button" className="bg-transparent border-none text-primary text-[12.5px] cursor-pointer text-center py-1 rounded transition-all hover:opacity-80 underline underline-offset-2" onClick={fillDemo}>
                Remplir avec les identifiants de démo
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
