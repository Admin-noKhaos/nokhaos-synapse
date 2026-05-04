import { SkBox, SkLine } from '@/components/Skeleton';

export default function Loading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr 320px', height: 'calc(100vh - 56px)' }}>
      <style>{`
        @keyframes sk-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <div style={{ borderRight: '0.5px solid var(--hairline)', padding: '14px 16px' }}>
        <SkLine w={80} style={{ marginBottom: 18 }} />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 0', borderBottom: '0.5px solid var(--hairline)' }}>
            <SkBox w={36} h={36} r={18} />
            <div style={{ flex: 1 }}>
              <SkLine w={120} style={{ marginBottom: 6 }} />
              <SkLine w={80} style={{ marginBottom: 6 }} />
              <SkLine w={200} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: 24 }}>
        <SkBox w="60%" h={20} style={{ marginBottom: 24 }} />
        <SkBox w="80%" h={36} r={16} style={{ marginBottom: 16 }} />
        <SkBox w="50%" h={36} r={16} />
      </div>
      <div style={{ borderLeft: '0.5px solid var(--hairline)', padding: 18 }}>
        <SkBox w={60} h={36} r={4} style={{ marginBottom: 16 }} />
        <SkBox w="100%" h={6} r={3} style={{ marginBottom: 24 }} />
        <SkLine w={100} style={{ marginBottom: 8 }} />
        <SkBox w="100%" h={80} r={10} />
      </div>
    </div>
  );
}
