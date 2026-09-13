import { Eye, EyeOff, KeyRound, Lock, Mail, ShieldCheck } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../components/ui';
import { api } from '../lib/api';
import type { AdminUser } from './api';

type Step = { kind: 'password' } | { kind: 'mfa'; token: string };

/** Admin sign in: email + password, “trust this device”, then a 2FA code step when enabled. */
export default function LoginPage({ onSignedIn }: { onSignedIn: (user: AdminUser) => void }) {
  const location = useLocation();
  const notice = (location.state as { message?: string } | null)?.message;
  const [step, setStep] = useState<Step>({ kind: 'password' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const finish = (user: AdminUser) => {
    setPassword('');
    onSignedIn(user);
  };

  const submitPassword = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api<{ mfaRequired: true; mfaToken: string } | { mfaRequired: false; user: AdminUser }>('/auth/login', {
        method: 'POST',
        json: { email, password, remember },
      });
      if (res.mfaRequired) {
        setStep({ kind: 'mfa', token: res.mfaToken });
        setPassword('');
      } else finish(res.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    if (step.kind !== 'mfa') return;
    setBusy(true);
    setError('');
    try {
      const res = await api<{ user: AdminUser }>('/auth/mfa', { method: 'POST', json: { mfaToken: step.token, code, remember } });
      finish(res.user);
    } catch (err) {
      setError((err as Error).message);
      if (/expired/i.test((err as Error).message)) setStep({ kind: 'password' });
    } finally {
      setBusy(false);
    }
  };

  const inputClass = 'h-12 w-full rounded-md border border-line bg-surface ps-11 pe-4 text-body-m text-fg outline-none focus:border-fg';

  return (
    <div className="grid grid-cols-1 min-h-screen bg-canvas lg:grid-cols-2">
      <div data-theme="dark" className="relative hidden overflow-hidden bg-canvas lg:block">
        <img src="/media/hero-poster.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-ink-950/60" />
        <div className="relative flex h-full flex-col p-12">
          <div className="flex flex-1 items-center justify-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
              <img src="/brand/pdn-logo-light.png" alt="PDN Travel" className="mb-2 h-12 w-fit" />
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-red-400">Admin panel</p>
              <h1 className="text-display-l text-fg">
                Manage every <em className="text-red-500">journey</em>
              </h1>
              <p className="text-body-m text-fg-muted">Trips, itineraries, destinations, pages and photos — all in one secure place.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-12">
        <div className="flex w-full max-w-sm flex-col gap-8">
          <div className="flex flex-col gap-2">
            <img src="/brand/pdn-mark.png" alt="" className="mb-4 size-12 lg:hidden" />
            <h2 className="text-h2 text-fg">{step.kind === 'password' ? 'Sign in' : 'Two-factor check'}</h2>
            <p className="text-body-s text-fg-muted">
              {step.kind === 'password' ? 'Use your PDN admin account.' : 'Enter the 6-digit code from your authenticator app.'}
            </p>
          </div>

          {notice && step.kind === 'password' && <p className="rounded-md bg-muted px-4 py-3 text-body-s text-fg-muted">{notice}</p>}
          {error && (
            <p role="alert" className="rounded-md bg-brand-subtle px-4 py-3 text-body-s text-fg-brand">
              {error}
            </p>
          )}

          {step.kind === 'password' ? (
            <form onSubmit={submitPassword} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-fg">Email</span>
                <span className="relative">
                  <Mail size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                  <input type="text" inputMode="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
                </span>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-fg">Password</span>
                <span className="relative">
                  <Lock size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pe-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    className="absolute end-4 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg"
                  >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                  </button>
                </span>
              </label>
              <label className="flex min-h-11 items-center gap-3 text-body-s text-fg">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--bg-brand)]" />
                Trust this device for 7 days
              </label>
              <Button type="submit" loading={busy} icon className="w-full">
                Sign in
              </Button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-meta font-semibold text-fg">Authentication code</span>
                <span className="relative">
                  <KeyRound size={18} className="absolute start-4 top-1/2 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
                  <input
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    required
                    autoFocus
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={`${inputClass} tracking-[0.5em]`}
                  />
                </span>
              </label>
              <Button type="submit" loading={busy} className="w-full">
                <ShieldCheck size={18} aria-hidden="true" /> Verify
              </Button>
              <button type="button" onClick={() => setStep({ kind: 'password' })} className="text-body-s text-fg-muted hover:text-fg">
                Use a different account
              </button>
            </form>
          )}

          <p className="text-meta text-fg-subtle">
            Protected area. Access is logged. <Link to="/" className="text-fg-brand hover:underline">Back to website</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
