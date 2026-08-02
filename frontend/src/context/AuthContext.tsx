import { createContext, useContext, useState, ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface User {
  id?: number;
  email: string;
  name: string;
  role: 'admin' | 'professeur' | 'assistant';
  initials: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gestiontp_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('gestiontp_token');
  });

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Erreur de connexion');
    }

    const { token: newToken, user: userData } = data;

    const fullUser: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role as 'admin' | 'professeur' | 'assistant',
      initials: userData.initials,
    };

    setUser(fullUser);
    setToken(newToken);
    localStorage.setItem('gestiontp_user', JSON.stringify(fullUser));
    localStorage.setItem('gestiontp_token', newToken);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('gestiontp_user');
    localStorage.removeItem('gestiontp_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
