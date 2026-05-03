// Apple-style primitives: Card, Pill, Button, KPI, Avatar.

import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';

export function Card({
  glass,
  children,
  style,
  className,
  ...rest
}: {
  glass?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={['sx-card', glass && 'glass', className].filter(Boolean).join(' ')}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  sub,
  right,
}: {
  title: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="sx-card-hd">
      <div>
        <h3>{title}</h3>
        {sub && <div className="sub" style={{ marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function CardBody({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div className="sx-card-bd" style={style}>{children}</div>;
}

export function Pill({
  tone,
  dot,
  children,
  style,
}: {
  tone?: 'hot' | 'warm' | 'cold' | 'green';
  dot?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const cls = ['sx-pill', tone, dot && 'dot'].filter(Boolean).join(' ');
  return <span className={cls} style={style}>{children}</span>;
}

type ButtonProps = {
  kind?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'lg';
  icon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  kind = 'default',
  size,
  icon,
  children,
  className,
  ...rest
}: ButtonProps) {
  const cls = ['sx-btn', kind !== 'default' && kind, size, !children && 'icon', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function KPI({
  label,
  value,
  unit,
  delta,
  deltaDir = 'flat',
  sub,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  sub?: string;
}) {
  const arrow = deltaDir === 'up' ? '↑' : deltaDir === 'down' ? '↓' : '→';
  return (
    <div>
      <div className="sx-kpi-label">{label}</div>
      <div className="sx-kpi-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {(delta || sub) && (
        <div className={'sx-kpi-delta ' + deltaDir}>
          {delta && <span>{arrow} {delta}</span>}
          {sub && <span style={{ color: 'var(--text-3)', marginLeft: delta ? 6 : 0 }}>{sub}</span>}
        </div>
      )}
    </div>
  );
}

function stringToHue(s: string, l = 50) {
  let h = 0;
  for (let i = 0; i < (s || '').length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return `hsl(${Math.abs(h) % 360} 30% ${l}%)`;
}

export function Avatar({
  name,
  color,
  online,
  size = 32,
}: {
  name?: string;
  color?: string;
  online?: boolean;
  size?: number;
}) {
  const initials = (name || '?')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const bg =
    color ||
    `linear-gradient(135deg, ${stringToHue(name || '?', 60)}, ${stringToHue(name || '?', 30)})`;
  return (
    <div
      className={'sx-avatar' + (online ? ' online' : '')}
      style={{ width: size, height: size, fontSize: size * 0.38, background: bg }}
    >
      {initials}
    </div>
  );
}
