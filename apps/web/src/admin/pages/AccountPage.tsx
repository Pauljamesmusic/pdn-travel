import { KeyRound, LogOut, ShieldCheck, ShieldOff } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui';
import { useSession } from '../AdminApp';
import { adminApi } from '../api';
import { AdminPageHeader, Card, StatusPill, TextInput, useFeedback } from '../ui';

export default function AccountPage() {
  const { user, setUser, refresh } = useSession();
  const navigate = useNavigate();
  const { toast, confirm } = useFeedback();

  return (
    <>
      <AdminPageHeader title="Security" description="Your profile, password and two-factor sign-in." />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Profile">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-meta text-fg-subtle">Name</dt>
              <dd className="text-body-s text-fg">{user.name}</dd>
            </div>
            <div>
              <dt className="text-meta text-fg-subtle">Email</dt>
              <dd className="text-body-s text-fg">{user.email}</dd>
            </div>
            <div>
              <dt className="text-meta text-fg-subtle">Role</dt>
              <dd className="text-body-s text-fg">{user.role === 'OWNER' ? 'Owner — full access' : 'Editor — content only'}</dd>
            </div>
            <div>
              <dt className="text-meta text-fg-subtle">Two-factor sign-in</dt>
              <dd>
                <StatusPill tone={user.totpEnabled ? 'green' : 'amber'}>{user.totpEnabled ? 'On' : 'Off'}</StatusPill>
              </dd>
            </div>
          </dl>
        </Card>

        <PasswordCard onChanged={() => toast('Password changed. Other devices have been signed out.')} />
        <TwoFactorCard enabled={user.totpEnabled} onChange={refresh} />

        <Card title="Sessions">
          <div className="flex flex-col gap-4">
            <p className="text-body-s text-fg-muted">Lost a device or signed in on a shared computer? Sign out of every device, including this one.</p>
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={async () => {
                if (!(await confirm({ title: 'Sign out everywhere?', body: 'You will need to sign in again on every device.', confirmLabel: 'Sign out everywhere', tone: 'danger' }))) return;
                try {
                  await adminApi('/admin/account/logout-all', { method: 'POST' });
                } catch (err) {
                  toast((err as Error).message || 'Could not reach the server — other devices may still be signed in.', 'error');
                } finally {
                  setUser(null);
                  navigate('/admin/login', { replace: true });
                }
              }}
            >
              <LogOut size={16} aria-hidden="true" /> Sign out of all devices
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function PasswordCard({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (next.length < 12) return setError('Use at least 12 characters.');
    if (next !== repeat) return setError('The new passwords don’t match.');
    setBusy(true);
    try {
      await adminApi('/admin/account/password', { method: 'POST', json: { currentPassword: current, newPassword: next } });
      setCurrent('');
      setNext('');
      setRepeat('');
      onChanged();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Change password">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <TextInput label="Current password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <TextInput label="New password" type="password" autoComplete="new-password" required minLength={12} hint="At least 12 characters. A short sentence works well." value={next} onChange={(e) => setNext(e.target.value)} />
        <TextInput label="Repeat new password" type="password" autoComplete="new-password" required value={repeat} error={error || undefined} onChange={(e) => setRepeat(e.target.value)} />
        <Button type="submit" size="sm" loading={busy} className="self-start">
          <KeyRound size={16} aria-hidden="true" /> Update password
        </Button>
      </form>
    </Card>
  );
}

function TwoFactorCard({ enabled, onChange }: { enabled: boolean; onChange: () => Promise<void> }) {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const { toast } = useFeedback();

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const codeInput = (
    <TextInput
      label="6-digit code from your app"
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      pattern="\d{6}"
      required
      value={code}
      className="max-w-xs"
      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
    />
  );

  return (
    <Card title="Two-factor sign-in" description="Protect the admin panel with a code from an authenticator app (Google Authenticator, 1Password, Authy…).">
      {enabled ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await adminApi('/admin/account/2fa/disable', { method: 'POST', json: { code } });
              setCode('');
              toast('Two-factor sign-in turned off');
              await onChange();
            });
          }}
          className="flex flex-col gap-4"
        >
          <p className="flex items-center gap-2 text-body-s text-fg-accent">
            <ShieldCheck size={18} aria-hidden="true" /> Two-factor sign-in is on.
          </p>
          {codeInput}
          <Button type="submit" size="sm" variant="secondary" loading={busy} className="self-start">
            <ShieldOff size={16} aria-hidden="true" /> Turn off
          </Button>
        </form>
      ) : setup ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run(async () => {
              await adminApi('/admin/account/2fa/enable', { method: 'POST', json: { code } });
              setSetup(null);
              setCode('');
              toast('Two-factor sign-in is now on');
              await onChange();
            });
          }}
          className="flex flex-col gap-4"
        >
          <ol className="flex list-decimal flex-col gap-1 ps-5 text-body-s text-fg-muted">
            <li>Scan this QR code with your authenticator app.</li>
            <li>Enter the 6-digit code it shows.</li>
          </ol>
          <div className="flex flex-wrap items-center gap-4">
            <img src={setup.qr} alt="QR code for your authenticator app" className="size-44 rounded-sm border border-line bg-white p-2" />
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-meta text-fg-subtle">Can’t scan? Enter this key:</span>
              <code className="break-all rounded-sm bg-subtle px-2 py-1 text-meta text-fg" dir="ltr">
                {setup.secret}
              </code>
            </div>
          </div>
          {codeInput}
          <div className="flex gap-2">
            <Button type="submit" size="sm" loading={busy}>
              Confirm & turn on
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSetup(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button
          size="sm"
          loading={busy}
          onClick={() =>
            run(async () => {
              const res = await adminApi<{ qr: string; secret: string }>('/admin/account/2fa/setup', { method: 'POST' });
              setSetup({ qr: res.qr, secret: res.secret });
            })
          }
        >
          <ShieldCheck size={16} aria-hidden="true" /> Set up two-factor sign-in
        </Button>
      )}
    </Card>
  );
}
