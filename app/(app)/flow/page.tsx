import { redirect } from 'next/navigation';
import { getCurrentSession } from '@/lib/auth';
import { listAutomations, getAutomation } from '@/lib/data/automations';
import { FlowEditor } from './FlowEditor';
import { FlowEmpty } from './FlowEmpty';

export default async function FlowPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect('/login');
  const params = await searchParams;

  const list = await listAutomations(session.org.id);
  if (list.length === 0) {
    return <FlowEmpty />;
  }

  const selectedId = params.id ?? list[0].id;
  const selected = await getAutomation(session.org.id, selectedId);
  if (!selected) {
    return <FlowEditor list={list} selected={null} />;
  }

  return <FlowEditor list={list} selected={selected} />;
}
