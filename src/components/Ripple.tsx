import { useState, useRef, type Key, type PointerEvent, type ReactNode } from 'react';
import { cn } from '../utils';

interface RippleInstance {
  key: number;
  x: number;
  y: number;
  size: number;
}

interface Props {
  children: ReactNode;
  className?: string;
  color?: 'on-surface' | 'on-primary' | 'on-primary-container';
  onClick?: () => void;
  disabled?: boolean;
  key?: Key;
}

const RIPPLE_COLOR = {
  'on-surface': 'bg-on-surface',
  'on-primary': 'bg-on-primary',
  'on-primary-container': 'bg-on-primary-container',
};

/** MD3 state-layer: press feedback as a circle expanding from the pointer's contact point. */
export function Ripple({ children, className, color = 'on-surface', onClick, disabled }: Props) {
  const [ripples, setRipples] = useState<RippleInstance[]>([]);
  const hostRef = useRef<HTMLDivElement>(null);
  const nextKey = useRef(0);

  const spawnRipple = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled || !hostRef.current) return;
    const rect = hostRef.current.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const key = nextKey.current++;

    setRipples((prev) => [
      ...prev,
      { key, size, x: e.clientX - rect.left - size / 2, y: e.clientY - rect.top - size / 2 },
    ]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.key !== key));
    }, 550);
  };

  return (
    <div
      ref={hostRef}
      onPointerDown={spawnRipple}
      onClick={disabled ? undefined : onClick}
      className={cn('relative overflow-hidden isolate', disabled && 'pointer-events-none', className)}
    >
      {children}
      <span className="absolute inset-0 pointer-events-none">
        {ripples.map((r) => (
          <span
            key={r.key}
            className={cn('absolute rounded-full animate-md-ripple', RIPPLE_COLOR[color])}
            style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
          />
        ))}
      </span>
    </div>
  );
}
