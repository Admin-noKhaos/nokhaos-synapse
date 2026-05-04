import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { listSmartLinks } from '@/lib/data/smart-links';
import { SmartLinksClient } from './SmartLinksClient';

export default async function SmartLinksPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const links = await listSmartLinks(session.org.id);
  return <SmartLinksClient links={links} appUrl={process.env.NEXT_PUBLIC_APP_URL || ''} />;
}
