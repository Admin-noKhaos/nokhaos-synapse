// SF Symbols-inspired stroked line icons. 1.5px strokes, 24x24 viewBox,
// single color via currentColor.

import type { SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'stroke'> & { size?: number; strokeWidthOverride?: number };

const Base = ({ size = 18, strokeWidthOverride = 1.5, children, ...rest }: IconProps & { children: React.ReactNode }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidthOverride}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    {children}
  </svg>
);

export const I = {
  Sparkle: (p: IconProps) => <Base {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/></Base>,
  Grid: (p: IconProps) => <Base {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></Base>,
  Flow: (p: IconProps) => <Base {...p}><circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M7.6 8 10.5 16M16.4 8 13.5 16"/></Base>,
  Inbox: (p: IconProps) => <Base {...p}><path d="M3 13l3-7h12l3 7M3 13v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6M3 13h5l1 2h6l1-2h5"/></Base>,
  Chart: (p: IconProps) => <Base {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></Base>,
  Funnel: (p: IconProps) => <Base {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></Base>,
  Settings: (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></Base>,
  Search: (p: IconProps) => <Base {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Base>,
  Bell: (p: IconProps) => <Base {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21a2 2 0 0 0 4 0"/></Base>,
  Plus: (p: IconProps) => <Base {...p}><path d="M12 5v14M5 12h14"/></Base>,
  ArrowUp: (p: IconProps) => <Base {...p}><path d="m6 14 6-6 6 6"/></Base>,
  ArrowDown: (p: IconProps) => <Base {...p}><path d="m6 10 6 6 6-6"/></Base>,
  ArrowRight: (p: IconProps) => <Base {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Base>,
  Send: (p: IconProps) => <Base {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></Base>,
  Bolt: (p: IconProps) => <Base {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></Base>,
  Eye: (p: IconProps) => <Base {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></Base>,
  Heart: (p: IconProps) => <Base {...p}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></Base>,
  Tag: (p: IconProps) => <Base {...p}><path d="M20.59 13.41 13.41 20.59a2 2 0 0 1-2.82 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><path d="M7 7h.01"/></Base>,
  Filter: (p: IconProps) => <Base {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54z"/></Base>,
  Star: (p: IconProps) => <Base {...p}><path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></Base>,
  Check: (p: IconProps) => <Base {...p}><path d="m5 12 5 5L20 6"/></Base>,
  X: (p: IconProps) => <Base {...p}><path d="M18 6 6 18M6 6l12 12"/></Base>,
  Dot: (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="2"/></Base>,
  Globe: (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></Base>,
  Layers: (p: IconProps) => <Base {...p}><path d="m12 2 9 5-9 5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5"/></Base>,
  Play: (p: IconProps) => <Base {...p}><path d="M6 4l14 8-14 8z"/></Base>,
  Pause: (p: IconProps) => <Base {...p}><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></Base>,
  Branch: (p: IconProps) => <Base {...p}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v2a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4V8"/><path d="M12 14v2"/></Base>,
  Brain: (p: IconProps) => <Base {...p}><path d="M9.5 4a3 3 0 0 0-3 3v.5A3 3 0 0 0 4 10.5v1A3 3 0 0 0 6.5 14v.5a3 3 0 0 0 3 3H12V4zM14.5 4a3 3 0 0 1 3 3v.5A3 3 0 0 1 20 10.5v1A3 3 0 0 1 17.5 14v.5a3 3 0 0 1-3 3H12V4z"/></Base>,
  Link: (p: IconProps) => <Base {...p}><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></Base>,
  Zap: (p: IconProps) => <Base {...p}><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></Base>,
  More: (p: IconProps) => <Base {...p}><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></Base>,
  Image: (p: IconProps) => <Base {...p}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></Base>,
  Reply: (p: IconProps) => <Base {...p}><path d="M9 17 4 12l5-5M4 12h11a5 5 0 0 1 5 5v2"/></Base>,
  LogOut: (p: IconProps) => <Base {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></Base>,
  Coin: (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="9"/><path d="M12 6v12M9 9h4.5a2 2 0 0 1 0 4H9h5a2 2 0 0 1 0 4H9"/></Base>,
  Megaphone: (p: IconProps) => <Base {...p}><path d="M3 11v2a3 3 0 0 0 3 3l3 4 1-1-2-3h2l8 4V4l-8 4H6a3 3 0 0 0-3 3z"/></Base>,
  Doc: (p: IconProps) => <Base {...p}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6"/><path d="M8 13h8M8 17h6"/></Base>,
  Calendar: (p: IconProps) => <Base {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></Base>,
  Phone: (p: IconProps) => <Base {...p}><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></Base>,
  Sun: (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></Base>,
  Moon: (p: IconProps) => <Base {...p}><path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z"/></Base>,
  Help: (p: IconProps) => <Base {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 4M12 17h.01"/></Base>,
  Trash: (p: IconProps) => <Base {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14"/></Base>,
};
