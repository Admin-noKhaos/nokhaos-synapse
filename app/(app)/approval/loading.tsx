import { SkPage, SkPageHeader, SkCard } from '@/components/Skeleton';
export default function Loading() {
  return <SkPage><SkPageHeader /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16 }}><SkCard height={420} /><SkCard height={420} /></div></SkPage>;
}
