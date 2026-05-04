import { SkBox } from '@/components/Skeleton';
export default function Loading() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', height: 'calc(100vh - 56px)' }}>
      <style>{`@keyframes sk-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      <div style={{ padding: 24 }}>
        <SkBox w="80%" h={36} r={18} style={{ marginBottom: 14 }} />
        <SkBox w="60%" h={36} r={18} style={{ marginBottom: 14 }} />
        <SkBox w="50%" h={36} r={18} />
      </div>
      <div style={{ borderLeft: '0.5px solid var(--hairline)', padding: 18 }}>
        <SkBox w="60%" h={20} style={{ marginBottom: 12 }} />
        <SkBox w="100%" h={36} r={8} />
      </div>
    </div>
  );
}
