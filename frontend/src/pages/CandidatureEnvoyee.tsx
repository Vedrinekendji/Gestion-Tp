import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiCheckCircle, FiMail, FiArrowRight, FiClock } from 'react-icons/fi';

export default function CandidatureEnvoyee() {
    const location = useLocation();
    const navigate = useNavigate();
    const state = location.state as { nom?: string; email?: string } | null;

    // Si on arrive sur cette page sans passer par le formulaire, rediriger
    useEffect(() => {
        if (!state?.email) {
            navigate('/candidature', { replace: true });
        }
    }, [state, navigate]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/10 font-sans flex flex-col">
            {/* Navbar */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-primary rounded-[9px] flex items-center justify-center shadow-[0_3px_8px_rgba(67,97,238,0.35)]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="text-[16px] font-bold text-slate-800 tracking-tight">GestionTP</span>
                    </div>
                </div>
            </nav>

            {/* Contenu principal */}
            <div className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="max-w-lg w-full text-center">
                    {/* Icône de succès avec animation */}
                    <div className="relative inline-flex items-center justify-center mb-8">
                        <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping" />
                        <div className="relative w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center">
                            <FiCheckCircle className="text-emerald-500" size={48} style={{ strokeWidth: 1.5 }} />
                        </div>
                    </div>

                    <h1 className="text-3xl font-extrabold text-slate-800 mb-3 tracking-tight">
                        Candidature envoyée !
                    </h1>

                    {state?.nom && (
                        <p className="text-lg text-slate-600 font-medium mb-2">
                            Merci, <span className="text-primary">{state.nom}</span> 👋
                        </p>
                    )}

                    <p className="text-slate-500 text-base mb-8 leading-relaxed">
                        Votre candidature a bien été reçue et sera étudiée par l'équipe pédagogique.
                        Vous serez informé(e) de la décision à l'adresse :
                    </p>

                    {/* Email */}
                    {state?.email && (
                        <div className="inline-flex items-center gap-2.5 bg-white border border-slate-200 rounded-2xl px-5 py-3 shadow-sm mb-8">
                            <FiMail className="text-primary" size={18} />
                            <span className="text-sm font-semibold text-slate-700">{state.email}</span>
                        </div>
                    )}

                    {/* Timeline prochaines étapes */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 text-left mb-8">
                        <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider mb-5 flex items-center gap-2">
                            <FiClock size={14} />
                            Prochaines étapes
                        </h2>
                        <ol className="space-y-4">
                            {[
                                { num: '1', label: 'Votre candidature est en cours d\'examen', color: 'text-amber-500 bg-amber-50 border-amber-200' },
                                { num: '2', label: 'L\'administrateur consulte votre dossier', color: 'text-blue-500 bg-blue-50  border-blue-200' },
                                { num: '3', label: 'Vous recevrez un email de décision', color: 'text-violet-500 bg-violet-50 border-violet-200' },
                                { num: '4', label: 'Si acceptée : vos identifiants vous seront envoyés automatiquement', color: 'text-emerald-500 bg-emerald-50 border-emerald-200' },
                            ].map((step) => (
                                <li key={step.num} className="flex items-start gap-3">
                                    <span className={`shrink-0 w-7 h-7 rounded-lg border font-bold text-xs flex items-center justify-center ${step.color}`}>
                                        {step.num}
                                    </span>
                                    <span className="text-sm text-slate-600 pt-0.5">{step.label}</span>
                                </li>
                            ))}
                        </ol>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to="/login"
                            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 rounded-2xl shadow-lg shadow-primary/20 transition-all text-sm"
                        >
                            Espace de connexion
                            <FiArrowRight size={16} />
                        </Link>
                        <Link
                            to="/candidature"
                            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-primary font-medium transition-colors"
                        >
                            Déposer une autre candidature
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
