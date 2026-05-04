'use client';

// Top progress bar that animates while the router is transitioning between
// server-rendered pages. Gives instant visual feedback on every nav click so
// the app doesn't feel frozen during the SSR roundtrip.

import { useEffect, useState, useTransition } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [pending] = useTransition();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Start whenever the app shell receives a new pathname/search but the page
  // hasn't finished rendering yet. We can't directly observe React Router's
  // pending state, so we use a heuristic: bump on every nav, decay quickly.
  useEffect(() => {
    setVisible(true);
    setProgress(15);
    const t1 = setTimeout(() => setProgress(45), 60);
    const t2 = setTimeout(() => setProgress(75), 200);
    const t3 = setTimeout(() => setProgress(95), 600);
    const t4 = setTimeout(() => {
      setProgress(100);
      setTimeout(() => { setVisible(false); setProgress(0); }, 200);
    }, 900);
    return () => { [t1, t2, t3, t4].forEach(clearTimeout); };
  }, [pathname, search]);

  if (!visible && !pending) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        zIndex: 1000, pointerEvents: 'none',
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: 'var(--grad-accent)',
          transition: 'width 240ms cubic-bezier(0.32, 0.72, 0, 1), opacity 240ms',
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 8px rgba(52,224,138,0.6)',
        }}
      />
    </div>
  );
}
