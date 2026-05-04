import { SkBox } from '@/components/Skeleton';
export default function Loading() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 56px)' }}>
      <style>{`@keyframes sk-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <aside style={{ width: 240, borderRight: '0.5px solid var(--hairline)', padding: 14 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkBox key={i} w="100%" h={42} r={6} style={{ marginBottom: 8 }} />
        ))}
      </aside>
      <div style={{ flex: 1, padding: 14 }}>
        <SkBox w="60%" h={32} r={6} style={{ marginBottom: 18 }} />
        <SkBox w="100%" h="80%" r={12} />
      </div>
    </div>
  );
}
