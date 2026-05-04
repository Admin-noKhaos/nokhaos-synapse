import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { BrainEditor } from './BrainEditor';

export default async function BrainPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  return <BrainEditor initial={session.org.brain_md} orgName={session.org.name} />;
}
