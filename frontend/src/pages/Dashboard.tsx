import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-text-primary rounded-lg py-2 px-3 shadow-lg">
        <p className="text-[11px] text-white/60 mb-0.5">{label}</p>
        <p className="text-[13px] font-semibold text-white">{payload[0].value}h effectuées</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isProfesseur = user?.role === 'professeur';

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Erreur lors du chargement des statistiques:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60%]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-[14px] text-text-secondary">Chargement du tableau de bord...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-text-primary tracking-[-0.4px]">Tableau de bord</h2>
          <p className="text-[13px] text-text-secondary mt-[3px]">
            {isAdmin
              ? "Vue d'ensemble de l'établissement — Semestre 1 · 2024/2025"
              : isProfesseur
              ? "Département Informatique — Semestre 1 · 2024/2025"
              : `Bienvenue, ${user?.name} — Semestre 1 · 2024/2025`}
          </p>
        </div>
        {isProfesseur && (
          <Link to="/ajouter-assistant" className="inline-flex items-center gap-2 py-2 px-4 bg-primary text-white rounded-md text-[13.5px] font-medium cursor-pointer border-none shadow-[0_2px_8px_rgba(67,97,238,0.3)] transition-all hover:bg-primary-dark hover:shadow-[0_4px_12px_rgba(67,97,238,0.4)] hover:-translate-y-[1px] no-underline">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Ajouter un assistant
          </Link>
        )}
      </div>

      {/* Stats cards */}
      {isAdmin ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/></svg>}
            color="#4361ee" light="#eef0fd"
            value={stats?.professeursCount ?? 0} label="Professeurs" delta=""
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>}
            color="#10b981" light="#ecfdf5"
            value={stats?.assistantsActifs ?? 0} label="Assistants actifs" delta=""
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="2"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="2"/></svg>}
            color="#f59e0b" light="#fffbeb"
            value={stats?.matieresCount ?? 0} label="Matières" delta=""
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            color="#8b5cf6" light="#f5f3ff"
            value={`${stats?.tauxAffectation ?? 0}%`} label="Taux d'affectation" delta=""
          />
        </div>
      ) : isProfesseur ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/><circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/><path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/><path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/></svg>}
            color="#4361ee" light="#eef0fd"
            value={stats?.assistantsActifs ?? 0} label="Assistants actifs" delta=""
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2"/></svg>}
            color="#10b981" light="#ecfdf5"
            value={`${stats?.heuresValidees ?? 0}h`} label="Heures validées" delta=""
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><polyline points="12 6 12 12 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>}
            color="#f59e0b" light="#fffbeb"
            value={`${stats?.heuresAttente ?? 0}h`} label="En attente validation" delta=""
          />
          <StatCard
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            color="#8b5cf6" light="#f5f3ff"
            value={`${stats?.tauxAffectation ?? 0}%`} label="Taux d'affectation" delta=""
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<span style={{fontSize:'20px'}}>📅</span>}
            color="#4361ee" light="#eef0fd"
            value={stats?.seancesCetteSemaine ?? 0} label="Séances cette semaine" delta=""
          />
          <StatCard
            icon={<span style={{fontSize:'20px'}}>✅</span>}
            color="#10b981" light="#ecfdf5"
            value={`${stats?.heuresValidees ?? 0}h`} label="Heures validées" delta=""
          />
          <StatCard
            icon={<span style={{fontSize:'20px'}}>⏳</span>}
            color="#f59e0b" light="#fffbeb"
            value={`${stats?.heuresAttente ?? 0}h`} label="En attente" delta=""
          />
          <StatCard
            icon={<span style={{fontSize:'20px'}}>📊</span>}
            color="#8b5cf6" light="#f5f3ff"
            value={`${stats?.tauxPresence ?? 0}%`} label="Taux de présence" delta=""
          />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-[15px] font-semibold text-text-primary">Évolution des heures</h3>
              <p className="text-[12px] text-text-muted mt-0.5">Heures effectuées — 6 derniers mois</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={stats?.chartData || []} margin={{ top: 5, right: 20, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false}/>
              <XAxis dataKey="mois" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false}/>
              <Tooltip content={<CustomTooltip />}/>
              <Line
                type="monotone" dataKey="heures"
                stroke="#4361ee" strokeWidth={2.5}
                dot={{ fill: '#4361ee', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {isAdmin && (
          <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5 min-w-[280px]">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Professeurs</h3>
            <p className="text-[12px] text-text-muted mb-4">Par nombre de séances</p>
            <div className="flex flex-col gap-3">
              {(stats?.professeursList || []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between gap-2.5 py-1.5 border-b border-border last:border-b-0">
                  <div className="min-w-0">
                    <span className="text-[12.5px] font-medium text-text-primary block whitespace-nowrap overflow-hidden text-ellipsis">{p.nom}</span>
                    <span className="text-[11px] text-text-muted">{p.departement}</span>
                  </div>
                  <span className="text-[12.5px] font-bold text-primary shrink-0">{p.nbSeances} séance{p.nbSeances > 1 ? 's' : ''}</span>
                </div>
              ))}
              {(!stats?.professeursList || stats.professeursList.length === 0) && (
                <p className="text-[13px] text-text-muted italic">Aucun professeur pour le moment.</p>
              )}
            </div>
          </div>
        )}

        {isProfesseur && (
          <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Top assistants</h3>
            <p className="text-[12px] text-text-muted mb-4">Par heures effectuées</p>
            <div className="flex flex-col gap-3">
              {(stats?.topAssistants || []).map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-[12px] font-semibold text-text-muted w-3.5 text-center shrink-0">{i + 1}</span>
                  <div className="flex items-center justify-center rounded-full font-semibold text-[11px] shrink-0 w-[30px] h-[30px]" style={{ background: a.color || '#4361ee', color: '#fff' }}>{a.initials}</div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[12.5px] font-medium text-text-primary block mb-1.5 whitespace-nowrap overflow-hidden text-ellipsis">{a.name}</span>
                    <div className="h-[5px] bg-gray-200 rounded-full overflow-hidden w-full">
                      <div className="h-full rounded-full transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, (a.heures / (a.max || 120)) * 100)}%`, background: a.color || '#4361ee' }}/>
                    </div>
                  </div>
                  <span className="text-[13px] font-bold shrink-0" style={{ color: a.color || '#4361ee' }}>{a.heures}h</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isProfesseur && !isAdmin && (
          <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5 min-w-[280px]">
            <h3 className="text-[15px] font-semibold text-text-primary mb-1">Mes prochaines séances</h3>
            <p className="text-[12px] text-text-muted mb-4">À venir</p>
            {(stats?.prochainesSeances || []).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0">
                <div className="w-1 h-11 rounded-full shrink-0" style={{ background: s.matiereCouleur || '#4361ee' }}/>
                <div className="flex-1">
                  <div className="font-semibold text-[13px] text-text-primary">{s.matiere}</div>
                  <div className="text-[11.5px] text-text-muted">{s.groupe} · {s.salle}</div>
                  <div className="text-[11.5px] text-text-secondary">{new Date(s.date).toLocaleDateString('fr-FR')} {s.heureDebut}–{s.heureFin}</div>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide" style={{ background: (s.matiereCouleur || '#4361ee') + '22', color: s.matiereCouleur || '#4361ee' }}>★ {s.type}</span>
              </div>
            ))}
            {(!stats?.prochainesSeances || stats.prochainesSeances.length === 0) && (
              <p className="text-[13px] text-text-muted italic">Aucune séance à venir.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, color, light, value, label, delta }: any) {
  return (
    <div className="bg-card-bg border border-border rounded-xl shadow-sm p-5 flex flex-col gap-2.5 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className="w-11 h-11 rounded-[10px] flex items-center justify-center" style={{ background: light, color }}>
          {icon}
        </div>
        {delta && (
          <span className="text-[11.5px] font-semibold py-[3px] px-[9px] rounded-full" style={{ color, background: light }}>
            {delta}
          </span>
        )}
      </div>
      <div className="text-[28px] font-bold text-text-primary tracking-[-1px] leading-none">{value}</div>
      <div className="text-[12.5px] text-text-secondary">{label}</div>
    </div>
  );
}
