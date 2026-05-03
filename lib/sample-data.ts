// Sample data — used when an org has no real Meta connection yet.
// Mirrors the prototype's "lived-in" feel and is replaced by real data once
// an Instagram account is linked.

export type Sentiment = 'hot' | 'warm' | 'cold';

export type SampleConversation = {
  id: string;
  handle: string;
  name: string;
  snippet: string;
  score: number;
  sentiment: Sentiment;
  tags: string[];
  funnel: string;
  lastReplied: string;
  unread: boolean;
  channel: 'DM' | 'Comment';
  nextAction: string;
  transcript: { from: 'them' | 'ai'; text: string; t: string; auto?: boolean }[];
};

export const SAMPLE_CONVERSATIONS: SampleConversation[] = [
  {
    id: 'c1', handle: '@maeve.runs', name: 'Maeve Halloran',
    snippet: 'wait does the program work for half marathon prep?',
    score: 94, sentiment: 'hot', tags: ['intent:purchase', 'sport:running'],
    funnel: 'Coaching · Tier 2', lastReplied: '2m', unread: true, channel: 'DM',
    nextAction: "Send 'Half-Marathon Plan' funnel link",
    transcript: [
      { from: 'them', text: 'love your last reel about negative splits', t: '14:02' },
      { from: 'them', text: 'wait does the program work for half marathon prep?', t: '14:03' },
      { from: 'ai',   text: 'Yes — the Tier 2 plan has a 12-week half-mar block. Want me to send the breakdown?', t: '14:03', auto: true },
      { from: 'them', text: 'yeah pls', t: '14:04' },
    ],
  },
  {
    id: 'c2', handle: '@_julianwest', name: 'Julian West',
    snippet: 'is the protein powder vegan?',
    score: 78, sentiment: 'hot', tags: ['intent:purchase', 'objection:diet'],
    funnel: 'Supplements · Trial', lastReplied: '8m', unread: true, channel: 'DM',
    nextAction: 'Confirm vegan SKU + send 20% off code',
    transcript: [
      { from: 'them', text: 'is the protein powder vegan?', t: '13:55' },
      { from: 'ai',   text: 'Yes — the Vanilla and Cacao SKUs are 100% plant. Want a first-order code?', t: '13:55', auto: true },
    ],
  },
  {
    id: 'c3', handle: '@thequietkiln', name: 'Petra Aaltonen',
    snippet: 'do you ship to Finland?',
    score: 62, sentiment: 'warm', tags: ['question:shipping'],
    funnel: 'Ceramics · Catalog', lastReplied: '21m', unread: false, channel: 'DM',
    nextAction: 'Confirm EU shipping + send catalog',
    transcript: [{ from: 'them', text: 'do you ship to Finland?', t: '13:42' }],
  },
  {
    id: 'c4', handle: '@coach.sera', name: 'Sera Imada',
    snippet: 'interested in the cohort but pricing seems high',
    score: 55, sentiment: 'warm', tags: ['objection:price'],
    funnel: 'Cohort · Aug', lastReplied: '34m', unread: false, channel: 'DM',
    nextAction: 'Reply with payment-plan option',
    transcript: [{ from: 'them', text: 'interested in the cohort but pricing seems high', t: '13:29' }],
  },
  {
    id: 'c5', handle: '@nilsbergrand', name: 'Nils Bergrand',
    snippet: '👍',
    score: 28, sentiment: 'cold', tags: [],
    funnel: '—', lastReplied: '2h', unread: false, channel: 'DM',
    nextAction: 'No action — low intent',
    transcript: [{ from: 'them', text: '👍', t: '11:58' }],
  },
  {
    id: 'c6', handle: '@haru.studio', name: 'Haru Tanaka',
    snippet: 'any beta seats left?',
    score: 88, sentiment: 'hot', tags: ['intent:beta'],
    funnel: 'Studio · Beta', lastReplied: '1h', unread: false, channel: 'Comment',
    nextAction: 'Send beta link · 3 seats remaining',
    transcript: [{ from: 'them', text: 'any beta seats left?', t: '12:48' }],
  },
];

export const KPI_DATA = [
  { label: 'Active Conversations', value: '1,284', delta: '+12.4%', dir: 'up' as const, sub: 'vs. last week' },
  { label: 'Conversion Rate',      value: '8.7',  unit: '%', delta: '+1.2pt', dir: 'up' as const, sub: 'vs. last week' },
  { label: 'Avg. Response Time',   value: '14',   unit: 's', delta: '−6s',    dir: 'up' as const, sub: 'AI replies' },
  { label: 'Pipeline Value',       value: '$92.4', unit: 'k', delta: '+$8.1k', dir: 'up' as const, sub: 'last 7 days' },
];

// 24-hour activity, deterministic (so SSR matches client).
export const ACTIVITY_24H = Array.from({ length: 24 }, (_, i) => {
  const base = 18
    + 36 * Math.exp(-Math.pow((i - 9) / 3.0, 2))
    + 52 * Math.exp(-Math.pow((i - 20) / 2.5, 2));
  const noise = (Math.sin(i * 1.7) + Math.cos(i * 0.9)) * 4;
  return Math.max(2, Math.round(base + noise));
});

export const FUNNELS = [
  { name: 'Coaching · Tier 2',     value: 348, conv: 11.4 },
  { name: 'Supplements · Trial',   value: 220, conv:  9.1 },
  { name: 'Ceramics · Catalog',    value: 185, conv:  6.2 },
  { name: 'Cohort · Aug',          value:  92, conv: 14.8 },
  { name: 'Studio · Beta',         value:  47, conv: 22.0 },
];
