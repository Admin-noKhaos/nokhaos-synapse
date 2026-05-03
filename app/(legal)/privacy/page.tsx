export const metadata = { title: 'Privacy Policy · noKhaos Synapse' };

export default function PrivacyPage() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p className="meta">Effective date: 2026-05-03 · Last updated: 2026-05-03</p>

      <p>
        noKhaos Synapse ("Synapse", "we", "us") is an AI-powered Instagram automation
        platform operated by noKhaos. This Privacy Policy explains what data we collect,
        why we collect it, how we use it, and the choices you have. We designed Synapse
        to collect the minimum data needed to operate the service.
      </p>

      <h2>1. Who this policy applies to</h2>
      <ul>
        <li><strong>Customers</strong> — businesses or individuals who sign up for a Synapse account.</li>
        <li><strong>End users</strong> — people who message a Synapse customer's Instagram account and whose messages are processed by Synapse on the customer's behalf.</li>
      </ul>

      <h2>2. What we collect</h2>
      <h3>Customer account data</h3>
      <ul>
        <li>Email address, name, and password hash (managed by our auth provider Supabase).</li>
        <li>Workspace name, plan tier, and credit balance.</li>
        <li>Connected Instagram account metadata: Instagram user ID, username, linked Facebook Page ID, follower count.</li>
        <li>Long-lived Page access tokens (encrypted at rest) used solely to read and reply to messages on the connected account.</li>
      </ul>
      <h3>Conversation data (from end users)</h3>
      <ul>
        <li>Instagram thread IDs and message IDs.</li>
        <li>Message text and timestamps.</li>
        <li>End-user Instagram ID, public username, and basic profile fields you have already chosen to share with our customer (e.g. follower count if available).</li>
        <li>AI-generated annotations: lead score, sentiment label, intent classification, suggested replies.</li>
      </ul>
      <h3>Operational data</h3>
      <ul>
        <li>Service logs (timestamps, IP addresses, user agents, error traces) retained for up to 30 days.</li>
        <li>Smart-link click events with hashed (SHA-256) IP, user agent, and approximate country only — we never store raw IP addresses for click events.</li>
        <li>AI usage records: model used, token counts, computed cost, purpose (e.g. "reply", "classify").</li>
      </ul>
      <h3>What we do NOT collect</h3>
      <ul>
        <li>We do not collect or store Instagram passwords. Authentication happens through Meta's official OAuth flow.</li>
        <li>We do not access content outside of conversations directed at the connected business account.</li>
        <li>We do not collect facial-recognition data, biometric data, or special-category data (health, religion, sexual orientation, etc.).</li>
        <li>We do not run advertising trackers on our marketing or app pages.</li>
      </ul>

      <h2>3. Why we collect it (legal basis)</h2>
      <ul>
        <li><strong>Performance of contract</strong> — to operate the service the customer has subscribed to (read inbound messages, generate replies, charge AI credits).</li>
        <li><strong>Legitimate interest</strong> — to keep the service secure (rate limiting, abuse detection) and to improve product quality (aggregated, de-identified usage analytics).</li>
        <li><strong>Consent</strong> — when end users initiate a conversation with a business that uses Synapse, they consent to the business's stated message handling practices. Customers must disclose their use of automated tools in line with Meta's policies.</li>
      </ul>

      <h2>4. Who we share it with (sub-processors)</h2>
      <ul>
        <li><strong>Supabase</strong> (Postgres database + auth) — EU (Ireland) hosting region.</li>
        <li><strong>Vercel</strong> (web app hosting + edge network).</li>
        <li><strong>Render</strong> (background worker for webhook processing).</li>
        <li><strong>Anthropic</strong> (Claude AI for message classification and reply generation). Conversation text is sent to Anthropic for processing; per Anthropic's policy, API inputs and outputs are not used to train models.</li>
        <li><strong>Meta Platforms, Inc.</strong> (Instagram Graph API). We use Meta's API to read and send messages on the customer's connected account.</li>
      </ul>
      <p>
        We do not sell personal data to third parties. We do not share data with advertising networks.
      </p>

      <h2>5. Data retention</h2>
      <ul>
        <li>Messages and lead profiles are retained as long as the customer's workspace is active. Customers can delete individual conversations or leads from the app at any time.</li>
        <li>If a customer disconnects an Instagram account, we delete the access token within 24 hours and stop ingesting new messages from that account.</li>
        <li>If a customer closes their account, we delete all customer-level and end-user-level data within 30 days, except where retention is required by law (financial records, fraud prevention).</li>
        <li>Operational logs are retained for 30 days; AI usage records are retained for 12 months (for billing reconciliation).</li>
      </ul>

      <h2>6. End-user rights</h2>
      <p>
        If you are an end user (you messaged a business that uses Synapse) and you would
        like to exercise your data rights — access, correction, deletion, or objection —
        contact the business directly. They are the data controller; we are their
        processor. If they cannot resolve your request, you can email us at{' '}
        <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a> and we will work with
        the business to fulfill it.
      </p>
      <p>
        You may also request deletion directly via Meta's data deletion mechanism by
        contacting us at the email above with your Instagram username.
      </p>

      <h2>7. Customer rights (GDPR / CCPA)</h2>
      <p>If you are a Synapse customer, you have the right to:</p>
      <ul>
        <li>Access a copy of the personal data we hold about you.</li>
        <li>Correct inaccurate data.</li>
        <li>Delete your account and associated data (within 30 days).</li>
        <li>Export your conversation data (CSV / JSON) on request.</li>
        <li>Object to or restrict certain processing.</li>
        <li>Lodge a complaint with your local supervisory authority.</li>
      </ul>
      <p>
        Send any of these requests to{' '}
        <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a>. We respond within 30
        days.
      </p>

      <h2>8. Security</h2>
      <ul>
        <li>All connections use HTTPS / TLS 1.3.</li>
        <li>Access tokens and database rows are encrypted at rest by Supabase.</li>
        <li>Customer data is isolated per workspace using Postgres row-level security.</li>
        <li>Secrets are managed via the deployment platform's environment variable system; never committed to source control.</li>
      </ul>
      <p>No system is perfectly secure. We will notify affected customers and, where required, supervisory authorities within 72 hours of becoming aware of a personal-data breach.</p>

      <h2>9. International transfers</h2>
      <p>
        Our primary database is hosted in the European Union (Ireland). Some sub-processors
        (Anthropic, Vercel, Meta) operate globally. Where personal data is transferred
        outside the EEA, we rely on Standard Contractual Clauses and the recipient's own
        certifications.
      </p>

      <h2>10. Changes to this policy</h2>
      <p>
        We may update this policy from time to time. Material changes will be notified to
        customers via email at least 14 days before they take effect. The "Last updated"
        date at the top reflects the current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Questions, complaints, or requests:{' '}
        <a href="mailto:privacy@nokhaos.com">privacy@nokhaos.com</a>.
      </p>
    </>
  );
}
