import { SkPage, SkPageHeader, SkKpiGrid, SkCard } from '@/components/Skeleton';
export default function Loading() {
  return <SkPage><SkPageHeader /><SkKpiGrid /><div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginTop: 24 }}><SkCard height={500} /><SkCard height={500} /></div></SkPage>;
}
