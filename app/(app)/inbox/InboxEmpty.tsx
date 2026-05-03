import Link from 'next/link';
import { I } from '@/lib/icons';
import { Card, CardBody, Button } from '@/lib/primitives';
import { SimulatorButton } from './SimulatorButton';

export function InboxEmpty({ hasMeta }: { hasMeta: boolean }) {
  return (
    <div style={{ padding: '64px 24px', maxWidth: 720, margin: '0 auto' }}>
      <style>{`
        .empty-hero { text-align: center; }
        .empty-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: var(--grad-accent-soft);
          color: var(--accent-1);
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 16px;
        }
        .empty-h { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 6px; }
        .empty-sub { color: var(--text-2); font-size: 13px; margin: 0 0 24px; }
        .step { display:flex; gap: 14px; padding: 12px 0; align-items: flex-start; }
        .step-num {
          width: 22px; height: 22px; border-radius: 50%;
          background: rgba(255,255,255,0.06);
          border: 0.5px solid var(--hairline);
          color: var(--text-3);
          display: inline-flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; flex-shrink: 0;
        }
        .step-num.done { background: rgba(52,224,138,0.16); border-color: rgba(52,224,138,0.4); color: #5DEFA5; }
        .step-text { font-size: 13px; line-height: 1.5; }
        .step-meta { font-size: 11.5px; color: var(--text-3); margin-top: 2px; }
      `}</style>

      <Card>
        <CardBody style={{ padding: '32px 28px' }}>
          <div className="empty-hero">
            <div className="empty-icon"><I.Inbox size={28} /></div>
            <h1 className="empty-h">Your inbox is waiting</h1>
            <p className="empty-sub">As soon as someone DMs your Instagram, Synapse will route it here, score the lead, and suggest a reply.</p>
          </div>

          <div className="step">
            <div className={'step-num ' + (hasMeta ? 'done' : '')}>{hasMeta ? <I.Check size={12} /> : 1}</div>
            <div>
              <div className="step-text">Connect your Instagram</div>
              <div className="step-meta">{hasMeta ? 'Connected' : 'Go to settings → Connect Instagram'}</div>
            </div>
          </div>

          <div className="step">
            <div className="step-num">2</div>
            <div>
              <div className="step-text">Send yourself a test DM</div>
              <div className="step-meta">From any other account, DM your connected Instagram. The Render worker will pick it up within ~2s.</div>
            </div>
          </div>

          <div className="step">
            <div className="step-num">3</div>
            <div>
              <div className="step-text">Synapse classifies + suggests a reply</div>
              <div className="step-meta">The conversation appears here with a lead score, sentiment tag, and AI-drafted reply you can approve or edit.</div>
            </div>
          </div>

          {!hasMeta ? (
            <div style={{ marginTop: 20 }}>
              <Link href="/settings"><Button kind="primary">Connect Instagram</Button></Link>
            </div>
          ) : (
            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
              <SimulatorButton />
              <span style={{ fontSize: 11.5, color: 'var(--text-3)' }}>
                Test the full pipeline without waiting on a real DM.
              </span>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
