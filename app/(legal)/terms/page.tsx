export const metadata = { title: 'Terms of Service · noKhaos Synapse' };

export default function TermsPage() {
  return (
    <>
      <h1>Terms of Service</h1>
      <p className="meta">Effective date: 2026-05-03 · Last updated: 2026-05-03</p>

      <p>
        These Terms of Service ("Terms") govern your use of noKhaos Synapse ("Synapse",
        the "Service") operated by noKhaos ("we", "us", "our"). By creating an account
        or otherwise using the Service, you agree to be bound by these Terms. If you do
        not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        Synapse is an AI-powered platform that helps businesses operate their Instagram
        presence — handling direct messages, classifying intent, generating reply
        suggestions, building audience segments, and routing traffic via short links. The
        Service connects to your Instagram Business account via Meta's official APIs with
        your authorization.
      </p>

      <h2>2. Eligibility & accounts</h2>
      <ul>
        <li>You must be at least 18 years old to use the Service.</li>
        <li>You must provide accurate, current account information and keep it up to date.</li>
        <li>You are responsible for all activity under your account and for keeping your password confidential.</li>
        <li>You are responsible for any Meta / Instagram account you connect, including ensuring you have the rights to authorize the Service to act on its behalf.</li>
      </ul>

      <h2>3. Acceptable use</h2>
      <p>You agree not to use the Service to:</p>
      <ul>
        <li>Send spam, unsolicited bulk messages, or content that violates Meta's Platform Policies, Community Guidelines, or Messaging Policy.</li>
        <li>Impersonate any person, business, or entity, or misrepresent your affiliation with one.</li>
        <li>Distribute malware, phishing links, or content that infringes intellectual property.</li>
        <li>Collect personal data from end users beyond what is necessary for the legitimate business purpose disclosed to them.</li>
        <li>Attempt to reverse-engineer, decompile, or circumvent rate limits or access controls of the Service.</li>
        <li>Resell or sublicense the Service, or use it to build a directly competing product.</li>
      </ul>
      <p>
        You must clearly disclose to end users that they are interacting with an automated
        system when required by applicable law and by Meta's policies.
      </p>

      <h2>4. AI-generated content</h2>
      <p>
        The Service uses third-party AI models to generate reply suggestions, classify
        intent, and score leads. AI output may be incorrect, biased, or inappropriate. You
        are responsible for reviewing AI-suggested content before sending it, and you bear
        full responsibility for any message sent from your connected accounts via the
        Service. We make no warranty as to the accuracy, completeness, or fitness of
        AI-generated content.
      </p>

      <h2>5. Credits & billing</h2>
      <ul>
        <li>The Service is metered: each AI call consumes credits proportional to the underlying model's token cost plus a service markup. Current pricing is shown on your settings page.</li>
        <li>New accounts receive a one-time free credit grant. Additional credits can be purchased via the in-app top-up flow.</li>
        <li>Credits are non-refundable except where required by applicable consumer-protection law, and they expire 24 months after grant if unused.</li>
        <li>We may change pricing with at least 14 days' notice. Existing credit balances are honored at the rates at which they were granted.</li>
      </ul>

      <h2>6. Customer data & ownership</h2>
      <ul>
        <li>You retain all rights to your customer content (messages, lead data, audience definitions, smart links). We claim no ownership over it.</li>
        <li>You grant us a limited, non-exclusive license to host, process, and display your content as needed to operate the Service for you.</li>
        <li>You are the data controller for end-user personal data processed through the Service. We are your data processor. See our <a href="/privacy">Privacy Policy</a>.</li>
        <li>You can export or delete your data at any time from the settings page or by contacting <a href="mailto:support@nokhaos.com">support@nokhaos.com</a>.</li>
      </ul>

      <h2>7. Third-party services</h2>
      <p>
        The Service depends on third-party platforms — Meta (Instagram + Facebook), Anthropic
        (AI), Supabase (database), Vercel (hosting), and Render (workers). Their availability,
        pricing, and terms are outside our control. We are not responsible for outages,
        policy changes, or account actions taken by these providers, but we will work in
        good faith to maintain compatibility.
      </p>
      <p>
        Specifically, your use of the Service to interact with Instagram is also governed
        by Meta's <a href="https://developers.facebook.com/terms/" target="_blank" rel="noopener">Platform Terms</a>,{' '}
        <a href="https://www.facebook.com/policies_center/messenger" target="_blank" rel="noopener">Messenger and Instagram Messaging Policy</a>,
        and Instagram's Community Guidelines. Violations there may result in your Instagram
        account being restricted, separately from any action we take.
      </p>

      <h2>8. Suspension & termination</h2>
      <ul>
        <li>You may cancel at any time from settings. Cancellation takes effect immediately and does not refund unused credits.</li>
        <li>We may suspend or terminate your account if you breach these Terms, if we are legally required to, or if continued operation would expose us or other users to serious risk. We will notify you when feasible and give you a reasonable opportunity to cure non-material breaches.</li>
        <li>On termination, we delete your data per the retention schedule in our Privacy Policy.</li>
      </ul>

      <h2>9. Disclaimers</h2>
      <p>
        THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL
        BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT AI OUTPUT WILL BE ACCURATE.
      </p>

      <h2>10. Limitation of liability</h2>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR AGGREGATE LIABILITY ARISING OUT OF OR
        RELATING TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID
        US IN THE 12 MONTHS PRECEDING THE CLAIM, OR (B) USD 100. WE WILL NOT BE LIABLE FOR
        ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOST
        PROFITS, LOST DATA, OR BUSINESS INTERRUPTION, EVEN IF ADVISED OF THE POSSIBILITY.
      </p>

      <h2>11. Indemnification</h2>
      <p>
        You agree to defend, indemnify, and hold us harmless from any claim, loss, or
        expense (including reasonable legal fees) arising from your content, your use of
        the Service in violation of these Terms or applicable law, or your violation of a
        third party's rights — including any messages sent from your connected accounts.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws applicable at our principal place of business,
        without regard to conflict-of-law principles. Disputes will be resolved in the
        courts of competent jurisdiction at our principal place of business, unless
        mandatory consumer-protection law gives you a right to bring proceedings elsewhere.
      </p>

      <h2>13. Changes to these Terms</h2>
      <p>
        We may modify these Terms from time to time. Material changes will be notified to
        active customers by email at least 14 days before they take effect. Your continued
        use of the Service after changes take effect constitutes acceptance.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms: <a href="mailto:support@nokhaos.com">support@nokhaos.com</a>.
      </p>
    </>
  );
}
