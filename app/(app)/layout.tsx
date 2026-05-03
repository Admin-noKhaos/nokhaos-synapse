import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { TopbarRouter } from '@/components/TopbarRouter';
import { getCurrentSession } from '@/lib/auth';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');

  const { user, org } = session;

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <Sidebar
        orgName={org.name}
        plan={`${org.plan} · ${org.followers_count.toLocaleString()} followers`}
      />
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}
      >
        <TopbarRouter userName={user.full_name || user.email} />
        <div style={{ flex: 1, overflow: 'auto' }}>{children}</div>
      </main>
    </div>
  );
}
