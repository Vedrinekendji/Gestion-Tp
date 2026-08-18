import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assistants from './pages/Assistants';
import Disponibilites from './pages/Disponibilites';
import Affectation from './pages/Affectation';
import AddAssistant from './pages/AddAssistant';
import Professeurs from './pages/Professeurs';
import Matieres from './pages/Matieres';
import MesSeances from './pages/MesSeances';
import PlanningDisponible from './pages/PlanningDisponible';
import Planning from './pages/Planning';

function ProtectedLayout() {
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="flex h-screen bg-content-bg overflow-hidden text-text-primary">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-5 md:p-7 relative z-0">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            {user.role === 'admin' && (
              <>
                <Route path="/professeurs" element={<Professeurs />} />
                <Route path="/matieres" element={<Matieres />} />
                <Route path="/planning" element={<Planning />} />
              </>
            )}
            {user.role === 'professeur' && (
              <>
                <Route path="/assistants" element={<Assistants />} />
                <Route path="/ajouter-assistant" element={<AddAssistant />} />
                <Route path="/disponibilites" element={<Disponibilites />} />
                <Route path="/affectation" element={<Affectation />} />
              </>
            )}
            {user.role === 'assistant' && (
              <>
                <Route path="/mes-disponibilites" element={<Disponibilites />} />
                <Route path="/mes-seances" element={<MesSeances />} />
                <Route path="/tps-disponibles" element={<PlanningDisponible />} />
              </>
            )}
            <Route path="/profil" element={<PlaceholderPage title="Mon profil" />} />
            <Route path="/parametres" element={<PlaceholderPage title="Paramètres" />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60%] gap-3">
      <div className="text-[48px]">🚧</div>
      <h2 className="text-[20px] font-bold text-text-primary">{title}</h2>
      <p className="text-text-secondary text-[14px]">Cette page est en cours de développement.</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
