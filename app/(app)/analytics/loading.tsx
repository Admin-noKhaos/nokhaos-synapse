import { SkPage, SkPageHeader, SkKpiGrid, SkCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkPage>
      <SkPageHeader />
      <SkKpiGrid />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
        <SkCard height={280} />
        <SkCard height={280} />
      </div>
      <div style={{ marginTop: 12 }}><SkCard height={220} /></div>
    </SkPage>
  );
}
