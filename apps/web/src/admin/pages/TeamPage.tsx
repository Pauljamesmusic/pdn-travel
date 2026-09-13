import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Button, ErrorState, Skeleton } from '../../components/ui';
import { useSession } from '../AdminApp';
import { adminApi, type AdminUser, timeAgo, useAdminApi } from '../api';
import { AdminPageHeader, Card, Modal, SelectInput, StatusPill, TextInput, useFeedback } from '../ui';

interface AuditRow {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  ip: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
}

type Draft = { id?: number; name: string; email: string; role: 'OWNER' | 'EDITOR'; password: string };

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_!@#%';
  return Array.from(crypto.getRandomValues(new Uint32Array(18)), (n) => chars[n % chars.length]).join('');
}

export default function TeamPage() {
  const { user } = useSession();
  const isOwner = user.role === 'OWNER';
  const { data, error, reload } = useAdminApi<AdminUser[]>('/admin/users');
  const { data: audit } = useAdminApi<AuditRow[]>(isOwner ? '/admin/users/audit' : null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const { toast, confirm } = useFeedback();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      if (draft.id) {
        await adminApi(`/admin/users/${draft.id}`, { method: 'PATCH', json: { name: draft.name, role: draft.role, ...(draft.password ? { password: draft.password } : {}) } });
        toast(draft.password ? 'Updated — share the new password securely' : 'Team member updated');
      } else {
        await adminApi('/admin/users', { method: 'POST', json: draft });
        toast('Account created — share the password securely');
      }
      setDraft(null);
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (member: AdminUser) => {
    if (!(await confirm({ title: `Remove ${member.name}?`, body: 'They will lose access to the admin panel immediately.', confirmLabel: 'Remove', tone: 'danger' }))) return;
    try {
      await adminApi(`/admin/users/${member.id}`, { method: 'DELETE' });
      toast('Team member removed');
      reload();
    } catch (err) {
      toast((err as Error).message, 'error');
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Team & roles"
        description="Owners manage everything including team accounts. Editors manage website content."
        actions={
          isOwner && (
            <Button size="sm" onClick={() => setDraft({ name: '', email: '', role: 'EDITOR', password: generatePassword() })}>
              <Plus size={16} aria-hidden="true" /> Add team member
            </Button>
          )
        }
      />
      <div className="flex flex-col gap-6">
        {error && !data ? (
          <ErrorState message={error.message} onRetry={reload} />
        ) : !data ? (
          <Skeleton className="h-48" />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-md border border-line bg-surface">
            {data.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-label text-fg-brand">{m.name.slice(0, 2).toUpperCase()}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-label text-fg">
                    {m.name} {m.id === user.id && <span className="text-meta text-fg-subtle">(you)</span>}
                  </span>
                  <span className="truncate text-meta text-fg-subtle">
                    {m.email} · {m.lastLoginAt ? `last sign-in ${timeAgo(m.lastLoginAt)}` : 'never signed in'}
                  </span>
                </div>
                <StatusPill tone={m.totpEnabled ? 'green' : 'amber'}>{m.totpEnabled ? '2FA on' : '2FA off'}</StatusPill>
                <StatusPill tone={m.role === 'OWNER' ? 'red' : 'gray'}>{m.role === 'OWNER' ? 'Owner' : 'Editor'}</StatusPill>
                {isOwner && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setDraft({ id: m.id, name: m.name, email: m.email, role: m.role, password: '' })} aria-label={`Edit ${m.name}`} className="flex size-9 items-center justify-center rounded-sm text-fg-muted hover:bg-muted">
                      <Pencil size={16} aria-hidden="true" />
                    </button>
                    {m.id !== user.id && (
                      <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.name}`} className="flex size-9 items-center justify-center rounded-sm text-fg-brand hover:bg-brand-subtle">
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        {isOwner && (
          <Card title="Audit log" description="The last 200 sign-ins and changes made in the admin panel.">
            {!audit ? (
              <Skeleton className="h-40" />
            ) : (
              <div className="max-h-[480px] overflow-auto">
                <table className="w-full min-w-[560px] text-body-s">
                  <thead className="sticky top-0 bg-surface text-meta text-fg-subtle">
                    <tr>
                      <th className="py-2 text-start font-semibold">When</th>
                      <th className="py-2 text-start font-semibold">Who</th>
                      <th className="py-2 text-start font-semibold">What</th>
                      <th className="py-2 text-start font-semibold">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {audit.map((a) => (
                      <tr key={a.id}>
                        <td className="py-2 pe-3 text-meta text-fg-subtle" title={new Date(a.createdAt).toLocaleString()}>
                          {timeAgo(a.createdAt)}
                        </td>
                        <td className="py-2 pe-3 text-fg">{a.user?.name ?? '—'}</td>
                        <td className={a.action.includes('failed') ? 'py-2 pe-3 text-fg-brand' : 'py-2 pe-3 text-fg-muted'}>
                          {a.action} {a.entity}
                          {a.entityId && a.entityId.length < 12 ? ` #${a.entityId}` : ''}
                        </td>
                        <td className="py-2 text-meta text-fg-subtle" dir="ltr">
                          {a.ip ?? '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {draft && (
        <Modal
          title={draft.id ? `Edit ${draft.name}` : 'Add team member'}
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button size="sm" variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" form="member-form" loading={saving}>
                Save
              </Button>
            </>
          }
        >
          <form id="member-form" onSubmit={submit} className="flex flex-col gap-4">
            <TextInput label="Name" required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            <TextInput label="Email" type="email" required disabled={!!draft.id} value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            <SelectInput label="Role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as Draft['role'] })}>
              <option value="EDITOR">Editor — manage content</option>
              <option value="OWNER">Owner — full access</option>
            </SelectInput>
            <div className="flex items-end gap-2">
              <TextInput
                label={draft.id ? 'New password (optional)' : 'Temporary password'}
                required={!draft.id}
                minLength={12}
                autoComplete="new-password"
                className="flex-1"
                hint="At least 12 characters. They can change it under Security."
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
              <button type="button" onClick={() => setDraft({ ...draft, password: generatePassword() })} aria-label="Generate password" title="Generate password" className="mb-6 flex size-11 items-center justify-center rounded-md border border-line text-fg-muted hover:border-fg">
                <RefreshCw size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
