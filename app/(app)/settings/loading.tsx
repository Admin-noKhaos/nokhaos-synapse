import { SkPage, SkPageHeader, SkCard } from '@/components/Skeleton';
export default function Loading() {
  return (
    <SkPage>
      <SkPageHeader />
      <SkCard height={200} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <SkCard height={220} />
        <SkCard height={220} />
      </div>
      <div style={{ marginTop: 12 }}><SkCard height={300} /></div>
    </SkPage>
  );
}
