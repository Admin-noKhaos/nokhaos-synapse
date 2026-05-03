import { SignupForm } from './SignupForm';

export default function SignupPage() {
  return (
    <div className="auth-wrap">
      <style>{`
        .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
        .auth-card {
          width: 100%; max-width: 380px;
          background: rgba(20, 20, 24, 0.55);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 0.5px solid rgba(255,255,255,0.10);
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 8px 28px rgba(0,0,0,0.5);
        }
        .auth-brand { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
        .auth-brand-mark {
          width: 32px; height: 32px; border-radius: 9px;
          background: var(--grad-accent);
          display: flex; align-items: center; justify-content: center;
          color: #003318;
          box-shadow: 0 1px 0 rgba(255,255,255,0.30) inset, 0 4px 14px rgba(0,194,107,0.30);
        }
        .auth-brand-name { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; }
        .auth-h1 { font-size: 22px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 4px; }
        .auth-sub { font-size: 13px; color: var(--text-2); margin: 0 0 20px; }
        .auth-label { font-size: 11px; font-weight: 600; color: var(--text-3); letter-spacing: 0.04em; text-transform: uppercase; margin-bottom: 6px; display: block; }
        .auth-error { background: rgba(255,69,58,0.12); border: 0.5px solid rgba(255,69,58,0.4); color: #FF6E63; padding: 8px 10px; border-radius: 8px; font-size: 12px; margin-bottom: 14px; }
        .auth-success { background: rgba(52,224,138,0.10); border: 0.5px solid rgba(52,224,138,0.30); color: #5DEFA5; padding: 10px 12px; border-radius: 8px; font-size: 12.5px; margin-bottom: 14px; }
        .auth-foot { font-size: 12px; color: var(--text-3); text-align: center; margin-top: 14px; }
        .auth-foot a { color: var(--accent-1); text-decoration: none; }
        .auth-foot a:hover { text-decoration: underline; }
      `}</style>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-brand-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
              <path d="M7.6 8 10.5 16M16.4 8 13.5 16M8 6h8"/>
            </svg>
          </div>
          <div className="auth-brand-name">Synapse</div>
        </div>

        <h1 className="auth-h1">Create your account</h1>
        <p className="auth-sub">$5 free credits · no card required.</p>

        <SignupForm />

        <div className="auth-foot">
          Already have an account? <a href="/login">Sign in</a>
        </div>
      </div>
    </div>
  );
}
