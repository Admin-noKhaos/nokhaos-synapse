'use client';

import { useMemo } from 'react';
import { I } from '@/lib/icons';
import { Card, CardHeader, CardBody, Pill, Button } from '@/lib/primitives';

export type CalendarEvent = {
  id: string;
  kind: 'broadcast' | 'flow' | 'content';
  name: string;
  when: string;
  meta?: string;
};

const KIND_COLORS: Record<CalendarEvent['kind'], string> = {
  broadcast: 'rgba(255,159,10,0.20)',
  flow:      'rgba(52,224,138,0.20)',
  content:   'rgba(10,132,255,0.20)',
};

export function ScheduleClient({ events }: { events: CalendarEvent[] }) {
  const days = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const hours = Array.from({ length: 12 }, (_, i) => 8 + i); // 8am-7pm
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((e) => {
      const d = new Date(e.when);
      const key = d.toDateString();
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    });
    return map;
  }, [events]);

  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1480px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .cal-grid { display: grid; grid-template-columns: 50px repeat(7, 1fr); gap: 0; border: 0.5px solid var(--hairline); border-radius: 12px; overflow: hidden; }
        .cal-hd { padding: 10px 8px; font-size: 11px; font-weight: 600; color: var(--text-3); border-bottom: 0.5px solid var(--hairline); text-align: center; background: var(--surface-2); }
        .cal-hd.today { color: var(--accent-1); }
        .cal-hour { padding: 8px 4px 0 8px; font-size: 10px; color: var(--text-3); border-right: 0.5px solid var(--hairline); height: 60px; position: relative; }
        .cal-cell { border-bottom: 0.5px solid var(--hairline); border-right: 0.5px solid var(--hairline); height: 60px; position: relative; padding: 4px; }
        .cal-cell:last-child { border-right: 0; }
        .cal-event { position: absolute; left: 4px; right: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; color: var(--text); cursor: pointer; }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Schedule</h1>
          <p className="sx-page-sub">Upcoming broadcasts, flow runs, and content drops. {events.length} item{events.length !== 1 ? 's' : ''} this week.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Pill><span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(255,159,10,0.6)', display: 'inline-block', marginRight: 4 }} />Broadcasts</Pill>
          <Pill><span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(52,224,138,0.6)', display: 'inline-block', marginRight: 4 }} />Flows</Pill>
          <Pill><span style={{ width: 8, height: 8, borderRadius: 2, background: 'rgba(10,132,255,0.6)', display: 'inline-block', marginRight: 4 }} />Content</Pill>
        </div>
      </div>

      <Card>
        <CardHeader title={`Week of ${days[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`} sub="next 7 days" right={<Button kind="ghost" size="sm" disabled>Today</Button>} />
        <CardBody>
          <div className="cal-grid">
            <div className="cal-hd"></div>
            {days.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString();
              return (
                <div key={d.toISOString()} className={'cal-hd' + (isToday ? ' today' : '')}>
                  {d.toLocaleDateString(undefined, { weekday: 'short' })}<br />
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{d.getDate()}</span>
                </div>
              );
            })}
            {hours.map((h) => (
              <>
                <div key={'h' + h} className="cal-hour">{h}:00</div>
                {days.map((d, di) => {
                  const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
                  const cellEvents = dayEvents.filter((e) => new Date(e.when).getHours() === h);
                  return (
                    <div key={d.toISOString() + h} className="cal-cell">
                      {cellEvents.map((e) => (
                        <div key={e.id + di} className="cal-event" style={{ background: KIND_COLORS[e.kind] }} title={e.meta}>
                          <span style={{ fontSize: 9, opacity: 0.7, textTransform: 'uppercase', marginRight: 4 }}>{e.kind}</span>
                          {e.name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </>
            ))}
          </div>

          {events.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontSize: 12.5 }}>
              <I.Calendar size={24} style={{ display: 'inline-block', marginBottom: 12, opacity: 0.5 }} />
              <div style={{ marginBottom: 6 }}>Nothing scheduled in the next week.</div>
              <div style={{ fontSize: 11.5 }}>Schedule a broadcast or set up a recurring flow to populate this view.</div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
