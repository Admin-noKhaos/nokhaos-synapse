import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { getConversations, getMessages, hasAnyMetaAccount } from '@/lib/data/queries';
import { InboxClient } from './InboxClient';
import { InboxEmpty } from './InboxEmpty';

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string; filter?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const params = await searchParams;

  const [conversations, hasMeta] = await Promise.all([
    getConversations(session.org.id),
    hasAnyMetaAccount(session.org.id),
  ]);

  const selectedId = params.c || conversations[0]?.id || null;
  const messages = selectedId ? await getMessages(selectedId, session.org.id) : [];

  if (conversations.length === 0) {
    return <InboxEmpty hasMeta={hasMeta} />;
  }

  return (
    <InboxClient
      conversations={conversations}
      selectedId={selectedId!}
      messages={messages}
      filter={(params.filter as 'all' | 'hot' | 'warm' | 'cold') || 'all'}
    />
  );
}
