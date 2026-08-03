import { cn } from '../utils';
import { Ripple } from './Ripple';

interface Props {
  onRandom: () => void;
  onRefresh: () => void;
  loading?: boolean;
}

export function QuickActions({ onRandom, onRefresh, loading }: Props) {
  return (
    <div className="flex gap-1">
      <Ripple
        className="rounded-full text-on-surface-variant"
        onClick={onRandom}
        disabled={loading}
      >
        <span className={cn('flex items-center justify-center w-10 h-10', loading && 'opacity-50')} title="Random Post (X)">
          <i className="fas fa-random" />
        </span>
      </Ripple>
      <Ripple
        className="rounded-full text-on-surface-variant"
        onClick={onRefresh}
        disabled={loading}
      >
        <span className={cn('flex items-center justify-center w-10 h-10', loading && 'opacity-50')} title="Refresh (R)">
          <i className={cn('fas fa-sync-alt', loading && 'animate-spin')} />
        </span>
      </Ripple>
    </div>
  );
}
