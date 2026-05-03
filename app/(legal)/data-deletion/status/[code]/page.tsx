// Status page for a given deletion request, linked from the Meta callback response.

export const metadata = { title: 'Deletion Request Status · noKhaos Synapse' };

export default async function StatusPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <>
      <h1>Deletion request received</h1>
      <p className="meta">Confirmation code: <code>{code}</code></p>

      <p>
        Your request to delete personal data associated with your Facebook / Instagram
        account has been received and queued. We will:
      </p>
      <ul>
        <li>Revoke any access tokens issued for your account within <strong>24 hours</strong>.</li>
        <li>Delete associated lead profiles, messages, and AI annotations within <strong>30 days</strong>.</li>
        <li>Email a confirmation if you contact <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a> with your confirmation code.</li>
      </ul>
      <p>
        For full details, see our <a href="/data-deletion">Data Deletion Instructions</a>.
        For any other request, email <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a>.
      </p>
    </>
  );
}
