export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 96px' }}>
      <style>{`
        .legal h1 { font-size: 32px; font-weight: 600; letter-spacing: -0.02em; margin: 0 0 8px; }
        .legal .meta { color: var(--text-3); font-size: 12px; margin-bottom: 32px; }
        .legal h2 { font-size: 18px; font-weight: 600; margin: 32px 0 8px; letter-spacing: -0.01em; }
        .legal h3 { font-size: 14px; font-weight: 600; margin: 20px 0 6px; color: var(--text); }
        .legal p, .legal li { font-size: 14px; line-height: 1.6; color: var(--text-2); }
        .legal a { color: var(--accent-1); text-decoration: none; }
        .legal a:hover { text-decoration: underline; }
        .legal ul { padding-left: 20px; }
        .legal code { font-family: var(--font-mono); font-size: 12.5px; background: var(--surface-2); padding: 1px 6px; border-radius: 4px; }
        .legal hr { border: 0; border-top: 0.5px solid var(--hairline); margin: 28px 0; }
        .legal .topbar { display: flex; align-items: center; gap: 10px; margin-bottom: 32px; }
        .legal .brand-mark { width: 28px; height: 28px; border-radius: 8px; background: var(--grad-accent); display: inline-flex; align-items: center; justify-content: center; color: #003318; }
      `}</style>
      <div className="legal">
        <div className="topbar">
          <a href="/" className="brand-mark" aria-label="Home">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/>
              <path d="M7.6 8 10.5 16M16.4 8 13.5 16M8 6h8"/>
            </svg>
          </a>
          <span style={{ fontSize: 14, fontWeight: 600 }}>noKhaos Synapse</span>
        </div>
        {children}
      </div>
    </div>
  );
}
