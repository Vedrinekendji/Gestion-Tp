import { useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUser, FiMail, FiPhone, FiBook, FiFileText, FiUpload, FiCheckCircle, FiAlertCircle, FiArrowLeft, FiSend } from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const NIVEAUX = ['L1', 'L2', 'L3', 'M1', 'M2', 'Doctorat', 'Autre'];

interface FormErrors {
    nom?: string;
    prenom?: string;
    email?: string;
    telephone?: string;
    formation?: string;
    niveau?: string;
    motivation?: string;
    cv?: string;
}

export default function CandidaturePublique() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        nom: '',
        prenom: '',
        deuxiemePrenom: '',
        email: '',
        telephone: '',
        formation: '',
        niveau: '',
        disponibilites: '',
        motivation: '',
    });

    const [specialiteOption, setSpecialiteOption] = useState<string>('INFORMATIQUE');
    const [cvFile, setCvFile] = useState<File | null>(null);
    const [cvDragOver, setCvDragOver] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [serverError, setServerError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleCvSelect = (file: File | null) => {
        if (!file) return;
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        const ext = file.name.split('.').pop()?.toLowerCase();

        if (!allowed.includes(file.type) && !['pdf', 'doc', 'docx'].includes(ext || '')) {
            setErrors(prev => ({ ...prev, cv: 'Seuls les fichiers PDF, DOC et DOCX sont acceptés.' }));
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrors(prev => ({ ...prev, cv: 'Le CV ne doit pas dépasser 5 Mo.' }));
            return;
        }
        setCvFile(file);
        setErrors(prev => ({ ...prev, cv: undefined }));
    };

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setCvDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleCvSelect(file);
    }, []);

    const validate = (): boolean => {
        const errs: FormErrors = {};

        if (!form.nom.trim()) errs.nom = 'Le nom est obligatoire.';
        if (!form.prenom.trim()) errs.prenom = 'Le prénom est obligatoire.';
        if (!form.email.trim()) errs.email = 'L\'email est obligatoire.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'L\'email est invalide.';

        if (form.telephone.trim() && !/^[+\d\s\-().]{7,20}$/.test(form.telephone.trim())) {
            errs.telephone = 'Le numéro de téléphone est invalide.';
        }
        if (!form.formation.trim()) errs.formation = 'La formation est obligatoire.';
        if (!form.niveau) errs.niveau = 'Le niveau d\'étude est obligatoire.';
        if (form.motivation.trim() && form.motivation.trim().length < 30) {
            errs.motivation = 'La motivation doit comporter au moins 30 caractères.';
        }

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError('');

        if (!validate()) return;

        setLoading(true);
        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (value) formData.append(key, value);
            });
            const specVal = specialiteOption === 'BOTH' ? 'INFORMATIQUE,ELECTRONIQUE' : specialiteOption;
            formData.append('specialite', specVal);
            if (cvFile) formData.append('cv', cvFile);

            const res = await fetch(`${API_URL}/api/candidatures`, {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Une erreur est survenue. Veuillez réessayer.');
            }

            // Redirection vers la page de confirmation
            navigate('/candidature-envoyee', { state: { nom: form.prenom, email: form.email } });
        } catch (err: unknown) {
            setServerError(err instanceof Error ? err.message : 'Erreur inconnue.');
        } finally {
            setLoading(false);
        }
    };

    const RequiredLabel = ({ children }: { children: React.ReactNode }) => (
        <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
            {children}
            <span className="text-rose-500 text-xs">*</span>
        </label>
    );

    const FieldError = ({ msg }: { msg?: string }) =>
        msg ? <p className="text-xs text-rose-500 mt-1 flex items-center gap-1"><FiAlertCircle size={12} /> {msg}</p> : null;

    const inputCls = (field: keyof FormErrors) =>
        `w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all outline-none focus:ring-2 ${errors[field]
            ? 'border-rose-400 focus:ring-rose-200 bg-rose-50'
            : 'border-slate-200 focus:ring-primary/20 focus:border-primary bg-white'
        }`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 font-sans">
            {/* Navbar minimaliste */}
            <nav className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-primary rounded-[9px] flex items-center justify-center shadow-[0_3px_8px_rgba(67,97,238,0.35)]">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <span className="text-[16px] font-bold text-slate-800 tracking-tight">GestionTP</span>
                    </div>
                    <Link
                        to="/login"
                        className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-50"
                    >
                        <FiArrowLeft size={16} />
                        Espace de connexion
                    </Link>
                </div>
            </nav>

            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
                {/* Hero */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-semibold mb-5">
                        <FiUser size={14} />
                        Candidature Assistants TP
                    </div>
                    <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-3">
                        Rejoignez notre équipe<br />
                        <span className="text-primary">d'assistants de TP</span>
                    </h1>
                    <p className="text-slate-500 text-base max-w-xl mx-auto">
                        Remplissez ce formulaire pour soumettre votre candidature.
                        Votre dossier sera examiné par l'équipe pédagogique et vous serez contacté(e) par email.
                    </p>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
                    {/* Section identité */}
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <span className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">1</span>
                            Informations personnelles
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <RequiredLabel><FiUser size={13} />Nom de famille</RequiredLabel>
                                <input name="nom" value={form.nom} onChange={handleChange}
                                    className={`mt-1.5 ${inputCls('nom')}`}
                                    placeholder="ex: Dupont" autoComplete="family-name" />
                                <FieldError msg={errors.nom} />
                            </div>

                            <div>
                                <RequiredLabel><FiUser size={13} />Premier prénom</RequiredLabel>
                                <input name="prenom" value={form.prenom} onChange={handleChange}
                                    className={`mt-1.5 ${inputCls('prenom')}`}
                                    placeholder="ex: Jean" autoComplete="given-name" />
                                <FieldError msg={errors.prenom} />
                            </div>

                            <div className="sm:col-span-2">
                                <label className="text-sm font-semibold text-slate-700">
                                    Deuxième prénom <span className="text-xs font-normal text-slate-400">(si vous en avez un)</span>
                                </label>
                                <input name="deuxiemePrenom" value={form.deuxiemePrenom} onChange={handleChange}
                                    className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    placeholder="ex: Paul" />
                            </div>

                            <div>
                                <RequiredLabel><FiMail size={13} />Adresse email</RequiredLabel>
                                <input type="email" name="email" value={form.email} onChange={handleChange}
                                    className={`mt-1.5 ${inputCls('email')}`}
                                    placeholder="votre.email@example.com" autoComplete="email" />
                                <FieldError msg={errors.email} />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                                    <FiPhone size={13} />Téléphone
                                    <span className="text-xs font-normal text-slate-400">(optionnel)</span>
                                </label>
                                <input type="tel" name="telephone" value={form.telephone} onChange={handleChange}
                                    className={`mt-1.5 ${inputCls('telephone')}`}
                                    placeholder="ex: +213 6xx xxx xxx" autoComplete="tel" />
                                <FieldError msg={errors.telephone} />
                            </div>
                        </div>
                    </div>

                    {/* Section formation */}
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <span className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">2</span>
                            Formation & Niveau
                        </h2>

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <RequiredLabel><FiBook size={13} />Spécialité(s) de TP souhaitée(s)</RequiredLabel>
                                <select
                                    value={specialiteOption}
                                    onChange={(e) => setSpecialiteOption(e.target.value)}
                                    className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                >
                                    <option value="INFORMATIQUE">Informatique</option>
                                    <option value="ELECTRONIQUE">Électronique</option>
                                    <option value="BOTH">Les 2 (Informatique & Électronique)</option>
                                </select>
                            </div>

                            <div className="sm:col-span-2">
                                <RequiredLabel><FiBook size={13} />Filière / Formation</RequiredLabel>
                                <input name="formation" value={form.formation} onChange={handleChange}
                                    className={`mt-1.5 ${inputCls('formation')}`}
                                    placeholder="ex: Informatique, Mathématiques, Électronique..." />
                                <FieldError msg={errors.formation} />
                            </div>

                            <div>
                                <RequiredLabel>Niveau d'études</RequiredLabel>
                                <select name="niveau" value={form.niveau} onChange={handleChange}
                                    className={`mt-1.5 ${inputCls('niveau')}`}>
                                    <option value="">— Sélectionnez —</option>
                                    {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <FieldError msg={errors.niveau} />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-slate-700">
                                    Disponibilités <span className="text-xs font-normal text-slate-400">(optionnel)</span>
                                </label>
                                <input name="disponibilites" value={form.disponibilites} onChange={handleChange}
                                    className="mt-1.5 w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    placeholder="ex: Lundi matin, Mercredi journée..." />
                            </div>
                        </div>
                    </div>

                    {/* Section CV & Motivation */}
                    <div className="p-6 sm:p-8 border-b border-slate-100">
                        <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
                            <span className="w-7 h-7 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xs font-bold">3</span>
                            CV & Motivation
                        </h2>

                        {/* Upload CV */}
                        <div className="mb-5">
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-2">
                                <FiUpload size={13} />Curriculum Vitae
                                <span className="text-xs font-normal text-slate-400">(PDF, DOC, DOCX — max 5 Mo)</span>
                            </label>

                            <div
                                onDragOver={(e) => { e.preventDefault(); setCvDragOver(true); }}
                                onDragLeave={() => setCvDragOver(false)}
                                onDrop={handleDrop}
                                onClick={() => document.getElementById('cv-input')?.click()}
                                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${cvDragOver
                                    ? 'border-primary bg-primary/5'
                                    : errors.cv
                                        ? 'border-rose-300 bg-rose-50'
                                        : cvFile
                                            ? 'border-emerald-400 bg-emerald-50'
                                            : 'border-slate-200 hover:border-primary/40 hover:bg-slate-50'
                                    }`}
                            >
                                <input id="cv-input" type="file" accept=".pdf,.doc,.docx"
                                    className="hidden" onChange={(e) => handleCvSelect(e.target.files?.[0] || null)} />
                                {cvFile ? (
                                    <div className="flex items-center justify-center gap-3">
                                        <FiCheckCircle className="text-emerald-500" size={22} />
                                        <div className="text-left">
                                            <p className="text-sm font-semibold text-emerald-700">{cvFile.name}</p>
                                            <p className="text-xs text-slate-400">{(cvFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setCvFile(null); }}
                                            className="ml-auto text-xs bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-200"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <FiUpload className="text-slate-300 mx-auto mb-2" size={28} />
                                        <p className="text-sm font-medium text-slate-500">Faites glisser votre CV ici</p>
                                        <p className="text-xs text-slate-400 mt-1">ou <span className="text-primary font-semibold">cliquez pour parcourir</span></p>
                                    </div>
                                )}
                            </div>
                            <FieldError msg={errors.cv} />
                        </div>

                        {/* Motivation */}
                        <div>
                            <label className="text-sm font-semibold text-slate-700 flex items-center gap-1 mb-1">
                                <FiFileText size={13} />Lettre de motivation
                                <span className="text-xs font-normal text-slate-400">(min. 30 caractères, optionnel)</span>
                            </label>
                            <textarea
                                name="motivation"
                                value={form.motivation}
                                onChange={handleChange}
                                rows={5}
                                className={`mt-1 ${inputCls('motivation')} resize-none`}
                                placeholder="Décrivez brièvement vos motivations pour rejoindre l'équipe des assistants TP, vos compétences et ce que vous pouvez apporter..."
                            />
                            <div className="flex justify-between items-center mt-1">
                                <FieldError msg={errors.motivation} />
                                <span className={`text-xs ml-auto ${form.motivation.length < 30 && form.motivation.length > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {form.motivation.length} car.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Légende + Bouton */}
                    <div className="p-6 sm:p-8 bg-slate-50/50">
                        <p className="text-xs text-slate-400 mb-5">
                            <span className="text-rose-500">*</span> Champs obligatoires.
                            Vos données sont transmises de manière sécurisée et ne sont utilisées qu'à des fins de traitement de votre candidature.
                        </p>

                        {serverError && (
                            <div className="mb-4 flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700">
                                <FiAlertCircle className="shrink-0 mt-0.5" size={16} />
                                <span>{serverError}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2.5 bg-primary hover:bg-primary/90 active:scale-[0.99] text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-primary/25 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-base"
                        >
                            {loading ? (
                                <>
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Envoi en cours...
                                </>
                            ) : (
                                <>
                                    <FiSend size={18} />
                                    Envoyer ma candidature
                                </>
                            )}
                        </button>
                    </div>
                </form>

                <p className="text-center text-xs text-slate-400 mt-6">
                    Vous avez déjà un compte ?{' '}
                    <Link to="/login" className="text-primary font-medium hover:underline">
                        Connectez-vous ici
                    </Link>
                </p>
            </div>
        </div>
    );
}
