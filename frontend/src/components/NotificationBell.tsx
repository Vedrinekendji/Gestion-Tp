import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_INTERVAL = 30000;

interface NotificationData {
  id: number;
  type: string;
  titre: string;
  message: string;
  lien: string | null;
  lu: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, { icon: string; bg: string; color: string }> = {
  BIENVENUE: { icon: '👋', bg: '#eef0fd', color: '#4361ee' },
  ASSISTANT_CREE: { icon: '👤', bg: '#ecfdf5', color: '#10b981' },
  AFFECTATION_CREEE: { icon: '📌', bg: '#eef0fd', color: '#4361ee' },
  AFFECTATION_STATUT: { icon: '🔔', bg: '#fffbeb', color: '#f59e0b' },
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

export default function NotificationBell() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id: number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, lu: true } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Erreur marquage notification:', err);
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
    setUnreadCount(0);
    try {
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Erreur marquage global notifications:', err);
    }
  };

  const handleNotificationClick = (n: NotificationData) => {
    if (!n.lu) markAsRead(n.id);
    if (n.lien) {
      navigate(n.lien);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative w-9 h-9 bg-content-bg border border-border rounded-full flex items-center justify-center cursor-pointer text-text-secondary transition-colors hover:bg-border hover:text-text-primary"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-danger rounded-full border-[1.5px] border-white text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] right-0 w-[360px] max-w-[90vw] bg-white border border-border rounded-xl shadow-2xl z-[200] overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-[13.5px] font-bold text-text-primary">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-[11.5px] font-medium text-primary bg-transparent border-none cursor-pointer hover:underline">
                Tout marquer comme lu
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-8 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-4">
                <span className="text-[28px]">🔕</span>
                <p className="text-[13px] text-text-muted">Aucune notification pour le moment.</p>
              </div>
            ) : (
              notifications.map(n => {
                const meta = TYPE_ICONS[n.type] || { icon: '🔔', bg: '#f4f5f9', color: '#6b7280' };
                return (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-border last:border-b-0 transition-colors cursor-pointer bg-transparent border-x-0 border-t-0 hover:bg-content-bg ${!n.lu ? 'bg-primary-light/40' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[14px] shrink-0" style={{ background: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12.5px] font-semibold text-text-primary">{n.titre}</span>
                        {!n.lu && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>}
                      </div>
                      <p className="text-[12px] text-text-secondary mt-0.5 leading-snug">{n.message}</p>
                      <span className="text-[10.5px] text-text-muted mt-1 block">{timeAgo(n.createdAt)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
