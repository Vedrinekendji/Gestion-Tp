import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, UserRole } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Candidatures from './pages/Candidatures';
import Planning from './pages/Planning';
import Affectation from './pages/Affectation';
import DemandesCreneaux from './pages/DemandesCreneaux';
import ValidationHeures from './pages/ValidationHeures';
import Historique from './pages/Historique';
import RapportsMensuels from './pages/RapportsMensuels';
import Assistants from './pages/Assistants';
import Professeurs from './pages/Professeurs';
import Matieres from './pages/Matieres';
import Disponibilites from './pages/Disponibilites';
import ImportPlanning from './pages/ImportPlanning';
import MesSeances from './pages/MesSeances';
import PlanningDisponible from './pages/PlanningDisponible';

import AddAssistant from './pages/AddAssistant';
import AdminUtilisateurs from './pages/AdminUtilisateurs';

// Route guard component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: UserRole[] }) {
  const { user, token } = useAuth();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
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

            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            <Route path="/candidatures" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur']}>
                <Candidatures />
              </ProtectedRoute>
            } />

            <Route path="/seances" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur']}>
                <Planning />
              </ProtectedRoute>
            } />

            <Route path="/affectation" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur']}>
                <Affectation />
              </ProtectedRoute>
            } />

            <Route path="/demandes-creneaux" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur']}>
                <DemandesCreneaux />
              </ProtectedRoute>
            } />

            <Route path="/validation-heures" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur', 'service_administratif']}>
                <ValidationHeures />
              </ProtectedRoute>
            } />

            <Route path="/historique" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur', 'admin', 'service_administratif']}>
                <Historique />
              </ProtectedRoute>
            } />

            <Route path="/rapports" element={
              <ProtectedRoute allowedRoles={['service_administratif', 'admin']}>
                <RapportsMensuels />
              </ProtectedRoute>
            } />

            <Route path="/assistants" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur', 'service_administratif', 'admin']}>
                <Assistants />
              </ProtectedRoute>
            } />

            <Route path="/ajouter-assistant" element={
              <ProtectedRoute allowedRoles={['responsable_pedagogique', 'professeur', 'admin']}>
                <AddAssistant />
              </ProtectedRoute>
            } />

            <Route path="/import-planning" element={
              <ProtectedRoute allowedRoles={['admin', 'responsable_pedagogique']}>
                <ImportPlanning />
              </ProtectedRoute>
            } />

            <Route path="/admin/utilisateurs" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUtilisateurs />
              </ProtectedRoute>
            } />

            <Route path="/professeurs" element={
              <ProtectedRoute allowedRoles={['admin']}><Professeurs /></ProtectedRoute>
            } />

            <Route path="/matieres" element={
              <ProtectedRoute allowedRoles={['admin', 'responsable_pedagogique']}><Matieres /></ProtectedRoute>
            } />

            {/* Assistant specific routes */}
            <Route path="/mes-disponibilites" element={<ProtectedRoute allowedRoles={['assistant']}><Disponibilites /></ProtectedRoute>} />
            <Route path="/mes-seances" element={<ProtectedRoute allowedRoles={['assistant']}><MesSeances /></ProtectedRoute>} />
            <Route path="/tps-disponibles" element={<ProtectedRoute allowedRoles={['assistant']}><PlanningDisponible /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
