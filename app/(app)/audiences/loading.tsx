import { SkPage, SkPageHeader, SkKpiGrid, SkCard } from '@/components/Skeleton';
export default function Loading() {
  return <SkPage><SkPageHeader /><SkKpiGrid /><div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 12, marginTop: 12 }}><SkCard height={420} /><SkCard height={420} /></div></SkPage>;
}
