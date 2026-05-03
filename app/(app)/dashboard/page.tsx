import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getDashboardData } from '@/lib/data/queries';
import { DashboardClient } from './DashboardClient';

export default async function DashboardPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const data = await getDashboardData(session.org.id);
  return <DashboardClient data={data} orgName={session.org.name} balanceUsd={session.balance_usd} />;
}
