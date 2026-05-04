import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { listContacts } from '@/lib/data/contacts';
import { ContactsClient } from './ContactsClient';

export default async function ContactsPage() {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const contacts = await listContacts(session.org.id);
  return <ContactsClient contacts={contacts} />;
}
