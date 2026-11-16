'use client';
// ERP sign-in in the look of the current login page (AZIBO logo, ESG / DPP / ERP tabs).
import { EyeInvisibleOutlined, EyeOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { loginSchema } from '@shared/schemas';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { api, errorText } from '@/lib/api';
import type { Me } from '@/lib/types';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ username, password });
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    setError(null);
    try {
      await api.post<Me>('/auth/login', parsed.data);
      router.replace('/app/enquiries/');
    } catch (err) {
      setError(errorText(err).replace('Invalid user name or password.', 'Invalid Login ID/Password'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lg-page">
      <img className="lg-logo" src="/azibo-logo.png" alt="AZIBO Infotech Private Limited" />
      <div className="lg-card">
        <div className="lg-tabs" role="tablist">
          <button type="button" disabled>ESG</button>
          <button type="button" disabled>DPP</button>
          <button type="button" className="active" aria-selected="true">ERP</button>
        </div>
        <div className="lg-head">
          <span className="lg-icon"><LockOutlined /></span>
          <div>
            <h1>ERP Sign In</h1>
            <p>Securely access your ERP system to manage operations.</p>
          </div>
        </div>
        {error && <div className="lg-error" role="alert">{error}</div>}
        <form onSubmit={submit} noValidate>
          <label htmlFor="username">Login ID</label>
          <div className="lg-field">
            <MailOutlined />
            <input id="username" autoComplete="username" placeholder="you@example.com" value={username}
              onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <label htmlFor="password">Password</label>
          <div className="lg-field">
            <LockOutlined />
            <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="********"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" className="lg-eye" aria-label="Toggle password visibility" onClick={() => setShow((s) => !s)}>
              {show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            </button>
          </div>
          <button type="submit" className="lg-submit" disabled={busy}>{busy ? 'Signing in…' : 'Sign in as ERP'}</button>
        </form>
      </div>
    </div>
  );
}
