import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';
export type User = { id: string; email: string; role: string; variant: 'A' | 'B' };
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();
  useEffect(() => { api('/api/auth/me').then(d => setUser(d.user)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);
  async function logout() { await api('/api/auth/logout', { method: 'POST' }); setUser(null); nav('/'); }
  if (loading) return <p className="wrap">Loading…</p>;
  return (
    <div>
      <header className="top"><Link to="/" className="logo">DevOnboard</Link><span className="badge">Synthetic data</span>
        <nav>{user ? <><Link to="/onboarding">Onboarding</Link><Link to="/dashboard">Dashboard</Link>{user.role === 'ADMIN' && <Link to="/admin">Admin</Link>}<button onClick={logout}>Logout ({user.email})</button></> : <Link to="/">Login</Link>}</nav>
      </header>
      <main className="wrap">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/onboarding" /> : <Auth onAuth={setUser} />} />
          <Route path="/onboarding" element={user ? <Onboarding user={user} /> : <Navigate to="/" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/" />} />
          <Route path="/admin" element={user?.role === 'ADMIN' ? <Admin /> : <Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}
