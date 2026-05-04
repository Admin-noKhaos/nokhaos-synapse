import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { Playground } from './Playground';

export default async function PlaygroundPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  return <Playground orgName={session.org.name} initialBrain={session.org.brain_md} />;
}
