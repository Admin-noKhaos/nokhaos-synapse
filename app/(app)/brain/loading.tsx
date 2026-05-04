import { SkPage, SkPageHeader, SkBox } from '@/components/Skeleton';
export default function Loading() {
  return (
    <SkPage>
      <SkPageHeader />
      <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: 12 }}>
        <SkBox w="100%" h="70vh" r={12} />
        <SkBox w="100%" h={260} r={12} />
      </div>
    </SkPage>
  );
}
