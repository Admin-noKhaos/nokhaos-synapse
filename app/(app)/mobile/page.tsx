import { I } from '@/lib/icons';
import { Card, CardBody, Button, Pill } from '@/lib/primitives';

export default async function MobilePage() {
  return (
    <div className="sx-page sx-fade-in">
      <style>{`
        .sx-page { padding: 24px 28px 60px; max-width: 1100px; margin: 0 auto; }
        .sx-page-hd { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom: 22px; gap: 24px; }
        .grid { display: grid; grid-template-columns: 320px 1fr; gap: 32px; align-items: start; }
        .phone { width: 320px; height: 640px; border-radius: 44px; padding: 12px; background: linear-gradient(180deg, #1a1a1d 0%, #0a0a0c 100%); border: 1px solid #2c2c30; box-shadow: 0 30px 60px rgba(0,0,0,0.5); position: relative; }
        .phone::before { content:''; position: absolute; top: 18px; left: 50%; transform: translateX(-50%); width: 110px; height: 28px; border-radius: 14px; background: #000; z-index: 2; }
        .phone-screen { background: #07070a; border-radius: 32px; height: 100%; overflow: hidden; padding: 36px 14px 14px; color: #fff; font-family: var(--font-sans); position: relative; display: flex; flex-direction: column; }
        .feat { padding: 12px 0; border-bottom: 0.5px solid var(--hairline); display: flex; gap: 12px; }
        .feat:last-child { border-bottom: 0; }
        .feat-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(var(--accent-rgb),0.12); color: var(--accent-light); display:flex; align-items:center; justify-content:center; flex-shrink: 0; }
        .feat-name { font-size: 13.5px; font-weight: 600; }
        .feat-body { font-size: 12px; color: var(--text-2); margin-top: 3px; line-height: 1.5; }
        .ph-row { padding: 10px 8px; border-bottom: 0.5px solid rgba(255,255,255,0.06); display: flex; gap: 10px; }
        .ph-name { font-size: 12.5px; font-weight: 600; }
        .ph-snip { font-size: 11px; color: rgba(255,255,255,0.5); margin-top: 2px; }
        .ph-tab { display: flex; padding: 12px 0; border-top: 0.5px solid rgba(255,255,255,0.08); margin-top: auto; }
        .ph-tab > div { flex: 1; text-align: center; font-size: 9.5px; color: rgba(255,255,255,0.5); }
        .ph-tab .active { color: var(--accent-1); }
        @media (max-width: 800px) { .grid { grid-template-columns: 1fr; } .phone { margin: 0 auto; } }
      `}</style>

      <div className="sx-page-hd">
        <div>
          <h1 className="sx-page-h1">Mobile companion</h1>
          <p className="sx-page-sub">iOS preview. Approve replies, get push notifications, and watch high-intent leads in real time.</p>
        </div>
        <Pill tone="warm">Beta</Pill>
      </div>

      <div className="grid">
        <div className="phone">
          <div className="phone-screen">
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>Inbox</div>
            <div className="ph-row">
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, hsl(220 30% 60%), hsl(220 30% 30%))', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="ph-name">Maeve Halloran</div>
                <div className="ph-snip">wait does the program work for half marathon prep?</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--accent-1)', fontWeight: 700 }}>94</div>
            </div>
            <div className="ph-row">
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, hsl(40 30% 60%), hsl(40 30% 30%))', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="ph-name">Julian West</div>
                <div className="ph-snip">is the protein powder vegan?</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--accent-1)', fontWeight: 700 }}>78</div>
            </div>
            <div className="ph-tab">
              <div className="active">Neural</div>
              <div>Inbox</div>
              <div>Flows</div>
              <div>You</div>
            </div>
          </div>
        </div>

        <div>
          <Card>
            <CardBody>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>What the mobile app does</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 16 }}>
                Pocket-sized control over your AI agent. Approve replies in line, get pushed when a high-intent lead lands, glance at metrics on the go.
              </div>
              <div className="feat">
                <div className="feat-icon"><I.Inbox size={16} /></div>
                <div>
                  <div className="feat-name">Inbox &amp; approval</div>
                  <div className="feat-body">Review AI drafts, edit on your phone, send with a tap.</div>
                </div>
              </div>
              <div className="feat">
                <div className="feat-icon"><I.Bell size={16} /></div>
                <div>
                  <div className="feat-name">Smart push</div>
                  <div className="feat-body">Notifications for hot leads, lapsed conversations, broadcast results.</div>
                </div>
              </div>
              <div className="feat">
                <div className="feat-icon"><I.Sparkle size={16} /></div>
                <div>
                  <div className="feat-name">Live metrics</div>
                  <div className="feat-body">Today&apos;s leads, replies, conversion at a glance.</div>
                </div>
              </div>
              <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                <Button kind="primary" size="sm" disabled>Get TestFlight invite</Button>
                <Button kind="default" size="sm" disabled>Android (Q3)</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
