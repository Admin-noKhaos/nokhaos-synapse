// Reusable skeleton primitives. They render instantly while a page's server
// component runs its DB queries — so a click on a sidebar link feels like
// "page changed" within ~50ms instead of waiting for the round-trip.

import type { CSSProperties } from 'react';

export function SkBox({
  w,
  h,
  r = 8,
  style,
}: {
  w?: number | string;
  h?: number | string;
  r?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background:
          'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04))',
        backgroundSize: '200% 100%',
        animation: 'sk-shimmer 1.4s linear infinite',
        ...style,
      }}
    />
  );
}

export function SkLine({ w, style }: { w?: number | string; style?: CSSProperties }) {
  return <SkBox w={w} h={12} r={3} style={style} />;
}

export function SkPage({ children }: { children?: React.ReactNode }) {
  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1480, margin: '0 auto' }}>
      <style>{`
        @keyframes sk-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      {children}
    </div>
  );
}

export function SkPageHeader() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 22, gap: 24 }}>
      <div>
        <SkBox w={160} h={28} r={6} style={{ marginBottom: 8 }} />
        <SkLine w={280} />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <SkBox w={120} h={28} />
        <SkBox w={100} h={28} />
      </div>
    </div>
  );
}

export function SkCard({ height = 140 }: { height?: number }) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '0.5px solid var(--hairline)',
        borderRadius: 14,
        padding: 18,
        height,
      }}
    >
      <SkLine w={100} style={{ marginBottom: 14 }} />
      <SkBox w={140} h={28} r={4} style={{ marginBottom: 12 }} />
      <SkBox w="100%" h={36} />
    </div>
  );
}

export function SkKpiGrid({ cols = 4 }: { cols?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>
      {Array.from({ length: cols }).map((_, i) => <SkCard key={i} height={120} />)}
    </div>
  );
}
