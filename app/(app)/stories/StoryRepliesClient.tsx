'use client';

import { I } from '@/lib/icons';
import { Avatar, Card, CardHeader, CardBody, KPI, Pill } from '@/lib/primitives';

type Reply = { id: string; name: string; handle: string; score: number; sentiment: 'hot' | 'warm' | 'cold' | null; when: string | null };

export function StoryRepliesClient({ replies }: { replies: Reply[] }) {
  const hotCount = replies.filter((r) => r.sentiment === 'hot').length;
  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1280px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .sx-kpi-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap: 12px; }
        .row { display: grid; grid-template-columns: 36px 1fr 80px 80px; gap: 10px; align-items: center; padding: 12px 14px; border-bottom: 0.5px solid var(--hairline); }
        .row:last-child { border-bottom: 0; }
        .empty { padding: 60px; text-align: center; color: var(--text-3); }
        .empty h3 { color: var(--text); font-size: 16px; font-weight: 600; margin: 0 0 8px; }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Story Replies</h1>
          <p className="sx-page-sub">IG-native interactions: replies to your stories, ranked by lead score.</p>
        </div>
      </div>

      <div className="sx-kpi-grid">
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Story replies" value={replies.length.toString()} sub="all time" /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Hot leads from stories" value={hotCount.toString()} /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Avg. score" value={replies.length ? (replies.reduce((a, r) => a + r.score, 0) / replies.length).toFixed(1) : '—'} /></CardBody></Card>
        <Card><CardBody style={{ padding: '20px' }}><KPI label="Conversion" value="—" sub="needs link attribution" /></CardBody></Card>
      </div>

      <Card style={{ marginTop: 12 }}>
        <CardHeader title="Recent" sub={`${replies.length} replies`} />
        <CardBody style={{ padding: '4px 0 0' }}>
          {replies.length === 0 ? (
            <div className="empty">
              <I.Heart size={28} style={{ display: 'inline-block', marginBottom: 12, opacity: 0.5 }} />
              <h3>No story replies yet</h3>
              <div>When someone replies to your IG story, they&apos;ll appear here automatically.</div>
            </div>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="row">
                <Avatar name={r.name} size={36} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.handle}</div>
                </div>
                {r.sentiment && <Pill tone={r.sentiment} dot>{r.score}</Pill>}
                <div style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-3)' }}>{r.when ? new Date(r.when).toLocaleString() : '—'}</div>
              </div>
            ))
          )}
        </CardBody>
      </Card>
    </div>
  );
}
