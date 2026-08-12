import type { Metadata } from 'next';
import { Anton, IBM_Plex_Mono } from 'next/font/google';
import { YtLinkClient } from './YtLinkClient';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--display' });
const mono = IBM_Plex_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--mono' });

export const metadata: Metadata = {
  title: 'LinkForge · noProductBusiness',
  description: 'Turn a YouTube link into one that opens the YouTube app from Instagram.',
  robots: { index: false, follow: false },
};

export default function YtLinkPage() {
  return (
    <div className={`${display.variable} ${mono.variable} forge-root`}>
      <YtLinkClient />
      <style>{`
        .forge-root {
          --bg: #08080a;
          --panel: #121216;
          --line: #26262e;
          --ink: #f2f2ed;
          --dim: #7a7a85;
          --go: #00e676;
          --warn: #ff453a;
          position: relative;
          z-index: 1;
          min-height: 100dvh;
          background: var(--bg);
          color: var(--ink);
          font-family: var(--mono), ui-monospace, SFMono-Regular, Menlo, monospace;
          font-weight: 400;
        }
        .forge-root ::selection { background: var(--go); color: #04140a; }
      `}</style>
    </div>
  );
}
