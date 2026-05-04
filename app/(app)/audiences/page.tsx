import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { listAudiences } from '@/lib/data/audiences';
import { AudiencesClient } from './AudiencesClient';

export default async function AudiencesPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const audiences = await listAudiences(session.org.id);
  return <AudiencesClient audiences={audiences} />;
}
