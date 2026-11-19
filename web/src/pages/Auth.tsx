import { useState } from 'react';
import { api } from '../api';
import type { User } from '../App';
export default function Auth({ onAuth }: { onAuth: (u: User) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('DEVELOPER');
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [err, setErr] = useState('');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr('');
    try {
      const d = await api(mode === 'signup' ? '/api/auth/signup' : '/api/auth/login', { method: 'POST', body: JSON.stringify(mode === 'signup' ? { email, password, role } : { email, password }) });
      onAuth(d.user);
    } catch (e: any) { setErr(e.message); }
  }
  return (
    <div className="card">
      <h1>{mode === 'signup' ? 'Create your account' : 'Log in'}</h1>
      <p>Get an API key and make your first call in minutes.</p>
      <form onSubmit={submit}>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" required />
        <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password (8+ chars)" type="password" required />
        {mode === 'signup' && <select value={role} onChange={e => setRole(e.target.value)}><option value="DEVELOPER">Developer</option><option value="ADMIN">Admin</option></select>}
        <button type="submit">{mode === 'signup' ? 'Sign up' : 'Log in'}</button>
      </form>
      {err && <p className="error">{err}</p>}
      <button className="secondary" onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')}>{mode === 'signup' ? 'Have an account? Log in' : 'No account? Sign up'}</button>
      <p>Demo admin: sign up as Admin, or seed login <code>admin@devonboard.test / Password123!</code></p>
    </div>
  );
}
