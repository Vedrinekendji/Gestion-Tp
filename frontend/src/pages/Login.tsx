import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

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
      setError(err instanceof Error ? err.message : 'Email/login ou mot de passe incorrect.');
    } finally {
      setLoading(false);
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
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <span className="text-[20px] font-bold text-white tracking-[-0.3px]">Logiciel de gestion de TP</span>
        </div>

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-12 h-1 bg-white/20 mb-8 rounded-full"></div>
          <h1 className="text-[36px] font-extrabold text-white leading-[1.1] mb-6 tracking-tight">
            Optimisez votre <br /><span className="text-primary-light">gestion académique</span>
          </h1>
          <p className="text-[15px] text-white/70 leading-relaxed mb-10 max-w-[340px]">
            Une solution logicielle centralisée conçue pour simplifier la planification, l'affectation et le suivi de vos équipes pédagogiques en toute sécurité.
          </p>

          <div className="flex items-center gap-6 text-white/60 text-[13px] font-medium">
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Fiable
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Rapide
            </span>
            <span className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white border border-border rounded-lg p-6 shadow-md">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Email ou identifiant de connexion</label>
              <div className="relative flex items-center">
                <svg className="absolute left-3 text-text-muted pointer-events-none z-10" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <input
                  type="text"
                  className="w-full pl-[38px] pr-3 py-[9px] border border-border rounded-sm text-[13.5px] text-text-primary bg-white transition-all outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 placeholder:text-text-muted"
                  placeholder="votre.email@univ.dz ou JP26D"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Mot de passe</label>
              <div className="relative flex items-center">
                <svg className="absolute left-3 text-text-muted pointer-events-none z-10" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" />
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
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /></svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-danger-light border border-red-200 rounded-sm text-danger text-[13px]">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" /><line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                {error}
              </div>
            )}

            <div className="flex flex-col items-center gap-4 mt-2">
              <button type="submit" className="px-10 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white text-[14.5px] font-semibold transition-all shadow-md shadow-primary/20 disabled:opacity-80 flex items-center justify-center w-full" disabled={loading}>
                {loading && <span className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin inline-block mr-2"></span>}
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>

              <div className="w-full flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">ou</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <Link
                to="/candidature"
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-primary/20 bg-primary/5 text-primary font-semibold text-[13.5px] hover:bg-primary/10 hover:border-primary/40 transition-all"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
                  <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Déposer ma candidature
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
