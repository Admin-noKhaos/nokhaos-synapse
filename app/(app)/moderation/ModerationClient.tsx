'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, Button, Pill, Avatar } from '@/lib/primitives';

type Item = {
  id: string;
  platform: string;
  comment_id: string;
  media_id: string | null;
  author_username: string | null;
  author_id: string | null;
  text: string;
  translation: string | null;
  language: string | null;
  sentiment: string;
  reason: string | null;
  status: string;
  created_at: string;
};

export function ModerationClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<'pending' | 'handled'>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(() => items.filter((i) => i.status === 'pending'), [items]);
  const handled = useMemo(() => items.filter((i) => i.status !== 'pending'), [items]);
  const shown = tab === 'pending' ? pending : handled;

  async function act(id: string, action: 'delete' | 'dismiss') {
    if (action === 'delete' && !confirm('Delete this comment on the post? This removes it from Instagram/Facebook and cannot be undone.')) return;
    setBusy(id); setError(null);
    const r = await fetch(`/api/moderation/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.detail || d.error || `HTTP ${r.status}`);
      return;
    }
    router.refresh();
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className={'sx-seg' + (tab === 'pending' ? ' on' : '')} onClick={() => setTab('pending')} type="button">
          Pending {pending.length ? `(${pending.length})` : ''}
        </button>
        <button className={'sx-seg' + (tab === 'handled' ? ' on' : '')} onClick={() => setTab('handled')} type="button">
          Handled {handled.length ? `(${handled.length})` : ''}
        </button>
        <style>{`
          .sx-seg { height: 30px; padding: 0 14px; border-radius: 8px; border: 0.5px solid var(--hairline);
            background: transparent; color: var(--text-2); font-size: 12.5px; font-weight: 600; cursor: pointer; }
          .sx-seg.on { background: rgba(255,255,255,0.07); color: var(--text); }
          html[data-theme='light'] .sx-seg.on { background: rgba(0,0,0,0.06); }
        `}</style>
      </div>

      {error && <div className="alert error" style={{ marginBottom: 12 }}><I.X size={14} /> {error}</div>}

      {shown.length === 0 ? (
        <Card>
          <CardBody>
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              {tab === 'pending'
                ? 'Nothing to review. Flagged negative comments will appear here for you to delete or dismiss.'
                : 'No handled items yet.'}
            </div>
          </CardBody>
        </Card>
      ) : (
        shown.map((it) => (
          <Card key={it.id} style={{ marginBottom: 12 }}>
            <CardHeader
              title={it.author_username ? `@${it.author_username}` : (it.author_id ?? 'Unknown commenter')}
              sub={`${it.platform === 'facebook' ? 'Facebook' : 'Instagram'} · ${new Date(it.created_at).toLocaleString()}`}
              right={
                <Pill tone={it.sentiment === 'negative' ? 'warm' : 'cold'} dot>
                  {it.status === 'pending' ? it.sentiment : it.status}
                </Pill>
              }
            />
            <CardBody>
              <div style={{ display: 'flex', gap: 12 }}>
                <Avatar name={it.author_username || 'C'} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{it.text || '—'}</div>
                  {it.translation && it.language && it.language.toLowerCase() !== 'english' && (
                    <div style={{ fontSize: 12.5, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                      <span style={{ fontWeight: 600 }}>{it.language} → English:</span> {it.translation}
                    </div>
                  )}
                  {it.reason && (
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 6, fontStyle: 'italic' }}>
                      Flagged: {it.reason}
                    </div>
                  )}
                </div>
              </div>

              {it.status === 'pending' && (
                <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                  <Button kind="ghost" size="sm" disabled={busy === it.id} onClick={() => act(it.id, 'dismiss')} icon={<I.Check size={13} />}>
                    Dismiss
                  </Button>
                  <Button kind="primary" size="sm" disabled={busy === it.id} onClick={() => act(it.id, 'delete')} icon={<I.Trash size={13} />}>
                    {busy === it.id ? 'Working…' : 'Delete comment'}
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        ))
      )}
    </div>
  );
}
