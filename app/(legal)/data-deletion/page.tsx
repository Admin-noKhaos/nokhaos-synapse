export const metadata = { title: 'Data Deletion Instructions · noKhaos Synapse' };

export default function DataDeletionPage() {
  return (
    <>
      <h1>Data Deletion Instructions</h1>
      <p className="meta">Effective date: 2026-05-03 · Last updated: 2026-05-03</p>

      <p>
        This page explains how to request deletion of personal data that noKhaos Synapse
        ("Synapse") holds about you. We honor deletion requests promptly and at no charge.
      </p>

      <h2>If you are a Synapse customer</h2>
      <p>You can delete your data in two ways:</p>
      <ol>
        <li>
          <strong>Self-serve in the app</strong>
          <ul>
            <li>Sign in at <a href="https://synapse.nokhaos.com/login">synapse.nokhaos.com/login</a>.</li>
            <li>Go to <strong>Settings</strong>.</li>
            <li>Click <strong>Disconnect Instagram</strong> to revoke the Meta token and stop new ingestion (your access token is deleted within 24 hours).</li>
            <li>To delete your entire workspace and all conversation history, contact us at the email below — full account deletion is currently a manual step while we ship a self-serve flow.</li>
          </ul>
        </li>
        <li>
          <strong>Email request</strong>
          <ul>
            <li>Send an email to <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a> from the address on your account.</li>
            <li>Subject line: <code>Data deletion request</code>.</li>
            <li>We will confirm receipt within 2 business days and complete deletion within <strong>30 days</strong>.</li>
            <li>You will receive a confirmation email when deletion is complete.</li>
          </ul>
        </li>
      </ol>

      <h2>If you are an end user (you messaged a business that uses Synapse)</h2>
      <p>
        You have the right to ask for deletion of your personal data — including your
        Instagram username, message content, lead score, sentiment tag, and any
        AI-generated notes — that Synapse holds on behalf of the business you contacted.
      </p>
      <ol>
        <li>
          Send an email to <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a> with:
          <ul>
            <li>Subject line: <code>End-user data deletion request</code>.</li>
            <li>Your Instagram handle (e.g. <code>@yourhandle</code>).</li>
            <li>The business or Instagram handle you messaged (so we know which workspace to query).</li>
            <li>A short statement that you are requesting deletion of your personal data.</li>
          </ul>
        </li>
        <li>We will verify the request to prevent unauthorized deletions (we may ask you to send a quick confirmation DM from your Instagram account to the business in question).</li>
        <li>We will delete your data from our database within <strong>30 days</strong> of verification and confirm by email.</li>
      </ol>

      <h2>What gets deleted</h2>
      <ul>
        <li>All messages sent or received between your Instagram account and the business.</li>
        <li>Your lead profile (handle, name, lead score, sentiment, tags, AI notes).</li>
        <li>Your inclusion in any audience segments.</li>
        <li>Smart-link click events tied to your account (if any).</li>
      </ul>

      <h2>What may be retained</h2>
      <ul>
        <li>Hashed identifiers in aggregated, non-identifying analytics (e.g. counts of "messages received in May").</li>
        <li>Records required for legal, tax, or fraud-prevention purposes (e.g. financial transaction logs for credit purchases). These are retained for the minimum legally required period.</li>
      </ul>

      <h2>Meta-initiated deletion (callback URL)</h2>
      <p>
        If you used Facebook to authorize Synapse and later remove the app from your
        Facebook account (Facebook → Settings → Apps and Websites), Meta will notify us
        via a signed deletion callback. We will:
      </p>
      <ul>
        <li>Delete the associated Meta access tokens within 24 hours.</li>
        <li>Stop ingesting new messages from the disconnected account.</li>
        <li>Delete the associated workspace's connected-account record within 30 days, unless the customer reconnects in the meantime.</li>
      </ul>
      <p>
        The deletion-confirmation code returned to Meta lets you check status at any time
        by visiting the URL Meta provides after revoking permissions.
      </p>

      <h2>Contact</h2>
      <p>
        Email: <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a><br />
        Subject prefix: <code>Data deletion</code> for fastest routing.
      </p>
    </>
  );
}
