import { SkPage, SkPageHeader, SkKpiGrid, SkCard } from '@/components/Skeleton';

export default function Loading() {
  return (
    <SkPage>
      <SkPageHeader />
      <SkKpiGrid />
      <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: 12, marginTop: 12 }}>
        <SkCard height={280} />
        <SkCard height={280} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
        <SkCard height={240} />
        <SkCard height={240} />
        <SkCard height={240} />
      </div>
    </SkPage>
  );
}
