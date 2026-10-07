import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages communes
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Historique from './pages/Historique';

// Pages publiques (sans authentification)
import CandidaturePublique from './pages/CandidaturePublique';
import CandidatureEnvoyee from './pages/CandidatureEnvoyee';

// Pages Admin/Professeur
import Candidatures from './pages/Candidatures';
import Planning from './pages/Planning';
import Affectation from './pages/Affectation';
import ValidationHeures from './pages/ValidationHeures';
import RapportsMensuels from './pages/RapportsMensuels';
import Assistants from './pages/Assistants';
import Professeurs from './pages/Professeurs';
import Matieres from './pages/Matieres';
import ImportPlanning from './pages/ImportPlanning';
import AdminUtilisateurs from './pages/AdminUtilisateurs';
import AddAssistant from './pages/AddAssistant';

// Pages Assistant
import Disponibilites from './pages/Disponibilites';
import MesSeances from './pages/MesSeances';
import PlanningDisponible from './pages/PlanningDisponible';

const ADMIN_ROLES: UserRole[] = ['admin', 'super_admin', 'admin_informatique', 'admin_electronique'];

// Route guard component
function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}) {
  const { user, token } = useAuth();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles) {
    const isAllowed = allowedRoles.some(role => {
      if (role === 'admin') {
        return ADMIN_ROLES.includes(user.role);
      }
      return user.role === role;
    });
    if (!isAllowed) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  return <>{children}</>;
}

export default function App() {
  const { token } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Routes publiques accessible sans connexion */}
        <Route path="/candidature" element={<CandidaturePublique />} />
        <Route path="/candidature-envoyee" element={<CandidatureEnvoyee />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-800">
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard : tous les rôles authentifiés */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* === ROUTES PROFESSEUR & ADMIN === */}

            <Route path="/candidatures" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <Candidatures />
              </ProtectedRoute>
            } />

            <Route path="/seances" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <Planning />
              </ProtectedRoute>
            } />

            <Route path="/affectation" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <Affectation />
              </ProtectedRoute>
            } />

            <Route path="/validation-heures" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <ValidationHeures />
              </ProtectedRoute>
            } />

            <Route path="/historique" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <Historique />
              </ProtectedRoute>
            } />

            <Route path="/rapports" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <RapportsMensuels />
              </ProtectedRoute>
            } />

            <Route path="/assistants" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <Assistants />
              </ProtectedRoute>
            } />

            <Route path="/ajouter-assistant" element={
              <ProtectedRoute allowedRoles={['professeur', 'admin']}>
                <AddAssistant />
              </ProtectedRoute>
            } />

            <Route path="/import-planning" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <ImportPlanning />
              </ProtectedRoute>
            } />

            {/* === ROUTES ADMIN EXCLUSIVES === */}

            <Route path="/admin/utilisateurs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUtilisateurs />
              </ProtectedRoute>
            } />

            <Route path="/professeurs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Professeurs />
              </ProtectedRoute>
            } />

            <Route path="/matieres" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <Matieres />
              </ProtectedRoute>
            } />

            {/* === ROUTES ASSISTANT === */}

            <Route path="/mes-disponibilites" element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <Disponibilites />
              </ProtectedRoute>
            } />

            <Route path="/mes-seances" element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <MesSeances />
              </ProtectedRoute>
            } />

            <Route path="/tps-disponibles" element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <PlanningDisponible />
              </ProtectedRoute>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
