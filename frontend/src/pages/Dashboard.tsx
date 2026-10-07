import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import {
  FiUserCheck, FiUsers, FiCalendar, FiCheckCircle, FiClock, FiXCircle, FiTrendingUp, FiFileText, FiArrowRight
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const { token, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erreur lors du chargement du tableau de bord.');
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center">
        <p className="font-semibold">{error}</p>
        <button onClick={fetchStats} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Recharger</button>
      </div>
    );
  }

  const role = user?.role;
  const isAdminOrProf = ['admin', 'super_admin', 'admin_informatique', 'admin_electronique', 'professeur', 'responsable_pedagogique'].includes(role || '');

  // ==========================================
  // DASHBOARD RESPONSABLE PÉDAGOGIQUE & ADMIN
  // ==========================================
  if (isAdminOrProf) {
    const { metrics, charts, recent } = data || {};

    return (
      <div className="space-y-6">
        {/* Top Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tableau de bord Pédagogique</h1>
            <p className="text-sm text-slate-500 mt-1">Supervision pédagogique des TP, assistants et validations d'heures.</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/candidatures')} className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-medium rounded-xl text-sm hover:bg-primary-hover shadow-sm transition-all cursor-pointer">
              <FiUserCheck size={16} /> Candidatures ({metrics?.candidaturesAttente || 0})
            </button>
            <button onClick={() => navigate('/validation-heures')} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white font-medium rounded-xl text-sm hover:bg-amber-600 shadow-sm transition-all cursor-pointer">
              <FiClock size={16} /> Valider Heures
            </button>
          </div>
        </div>

        {/* 7 Key Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
          <CardMetric title="Candidatures" value={metrics?.candidaturesAttente || 0} sub="En attente" icon={<FiUserCheck className="text-amber-500" size={20} />} bg="bg-amber-50/70" />
          <CardMetric title="Assistants Actifs" value={metrics?.assistantsActifs || 0} sub="En poste" icon={<FiUsers className="text-blue-500" size={20} />} bg="bg-blue-50/70" />
          <CardMetric title="Séances Planifiées" value={metrics?.seancesProgrammees || 0} sub="À venir" icon={<FiCalendar className="text-indigo-500" size={20} />} bg="bg-indigo-50/70" />
          <CardMetric title="Séances Terminées" value={metrics?.seancesTerminees || 0} sub="Effectuées" icon={<FiCheckCircle className="text-emerald-500" size={20} />} bg="bg-emerald-50/70" />
          <CardMetric title="Heures à Valider" value={`${metrics?.heuresAttente || 0}h`} sub="En attente" icon={<FiClock className="text-amber-600" size={20} />} bg="bg-amber-50/70" />
          <CardMetric title="Heures Validées" value={`${metrics?.heuresValidees || 0}h`} sub="Comptabilisées" icon={<FiTrendingUp className="text-emerald-600" size={20} />} bg="bg-emerald-50/70" />
          <CardMetric title="Heures Refusées" value={`${metrics?.heuresRefusees || 0}h`} sub="Non comptées" icon={<FiXCircle className="text-rose-500" size={20} />} bg="bg-rose-50/70" />
        </div>

        {/* Charts Section Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Heures réalisées par mois */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center justify-between">
              <span>Heures réalisées par mois</span>
              <span className="text-xs font-normal text-slate-400">6 derniers mois</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts?.heuresParMois || []}>
                  <XAxis dataKey="mois" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Line type="monotone" dataKey="heures" stroke="#4361ee" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Heures par assistant */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center justify-between">
              <span>Heures par assistant</span>
              <span className="text-xs font-normal text-slate-400">Top assistants</span>
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.heuresParAssistant || []}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} interval={0} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="heures" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Séances par matière */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Volume de séances par matière</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.seancesParMatiere || []} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: Répartition des heures */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Répartition globale des heures</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={charts?.repartitionHeures || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {(charts?.repartitionHeures || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Feeds / Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prochaines Séances */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FiCalendar className="text-primary" /> Prochaines Séances de TP
              </h3>
              <button onClick={() => navigate('/seances')} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Voir tout <FiArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2.5">
              {(recent?.prochainesSeances || []).slice(0, 4).map((s: any) => (
                <div key={s.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100 text-sm">
                  <div>
                    <span className="font-semibold text-slate-800">{s.matiere?.nom}</span>
                    <p className="text-xs text-slate-500">{s.groupe} • Salle {s.salle} • Prof. {s.professeur?.prenom} {s.professeur?.nom}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-md block">
                      {new Date(s.date).toLocaleDateString('fr-FR')}
                    </span>
                    <span className="text-[11px] text-slate-400">{s.heureDebut} - {s.heureFin}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dernières Candidatures */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FiUserCheck className="text-amber-500" /> Dernières Candidatures
              </h3>
              <button onClick={() => navigate('/candidatures')} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                Gérer <FiArrowRight size={12} />
              </button>
            </div>
            <div className="space-y-2.5">
              {(recent?.dernieresCandidatures || []).slice(0, 4).map((c: any) => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between border border-slate-100 text-sm">
                  <div>
                    <span className="font-semibold text-slate-800">{c.prenom} {c.nom}</span>
                    <p className="text-xs text-slate-500">{c.formation} • {c.niveau}</p>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${c.statut === 'EN_ATTENTE' ? 'bg-amber-100 text-amber-700' :
                    c.statut === 'ACCEPTEE' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                    {c.statut}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD SERVICE ADMINISTRATIF
  // ==========================================
  if (role === 'service_administratif') {
    const { metrics, charts } = data || {};

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tableau de bord Administratif</h1>
            <p className="text-sm text-slate-500 mt-1">Exploitation des données de paie et rapports d'heures validées.</p>
          </div>
          <button onClick={() => navigate('/rapports')} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl text-sm hover:bg-emerald-700 shadow-sm transition-all cursor-pointer">
            <FiFileText size={18} /> Générer Rapport Mensuel
          </button>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <CardMetric title="Total Heures Validées" value={`${metrics?.totalHeuresValidees || 0} h`} sub="Cumul global" icon={<FiTrendingUp className="text-emerald-600" size={24} />} bg="bg-emerald-50" />
          <CardMetric title="Effectif Assistants" value={metrics?.totalAssistants || 0} sub="Comptes enregistrés" icon={<FiUsers className="text-blue-600" size={24} />} bg="bg-blue-50" />
          <CardMetric title="Séances de TP" value={metrics?.seancesCount || 0} sub="Sessions au total" icon={<FiCalendar className="text-purple-600" size={24} />} bg="bg-purple-50" />
          <CardMetric title="Heures du mois en cours" value={`${metrics?.heuresMois || 0} h`} sub="Mois courant" icon={<FiClock className="text-amber-600" size={24} />} bg="bg-amber-50" />
        </div>

        {/* Charts & Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Heures par Assistant */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Volume d'heures validées par assistant</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.heuresParAssistant || []}>
                  <XAxis dataKey="nom" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="heures" fill="#4361ee" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Heures par Matière */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">Répartition des heures par matière</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts?.heuresParMatiere || []} layout="vertical">
                  <XAxis type="number" stroke="#94a3b8" fontSize={12} />
                  <YAxis type="category" dataKey="code" stroke="#94a3b8" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="heures" fill="#10b981" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // DASHBOARD ASSISTANT & ADMIN (Fallback)
  // ==========================================
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-2xl font-bold text-slate-800">Bienvenue, {user?.name}</h1>
        <p className="text-sm text-slate-500 mt-1">Espace personnel GestionTP.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <CardMetric title="Heures Validées" value={`${data?.heuresValidees || 0} h`} sub="Comptabilisées" icon={<FiCheckCircle className="text-emerald-500" size={24} />} bg="bg-emerald-50" />
        <CardMetric title="Heures en Attente" value={`${data?.heuresAttente || 0} h`} sub="En cours de validation" icon={<FiClock className="text-amber-500" size={24} />} bg="bg-amber-50" />
        <CardMetric title="Séances programmées" value={data?.prochainesSeances?.length || 0} sub="À venir" icon={<FiCalendar className="text-primary" size={24} />} bg="bg-blue-50" />
      </div>
    </div>
  );
}

function CardMetric({ title, value, sub, icon, bg }: { title: string; value: any; sub: string; icon: any; bg: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col justify-between transition-all hover:shadow-md`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${bg}`}>{icon}</div>
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800 tracking-tight">{value}</div>
        <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>
      </div>
    </div>
  );
}
