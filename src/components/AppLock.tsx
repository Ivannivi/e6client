import { useState, useCallback, useEffect } from 'react';
import { cn } from '../utils';
import { Ripple } from './Ripple';

interface AppLockProps {
  enabled: boolean;
  pin: string;
  onUnlock: () => void;
  biometricPrompt?: () => void;
}

export function AppLock({ enabled, pin, onUnlock, biometricPrompt }: AppLockProps) {
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setInput('');
    }
  }, [enabled]);

  const handleKey = useCallback(
    (key: string) => {
      if (!enabled) return;
      setInput((prev) => {
        if (prev.length >= 8) return prev;
        return prev + key;
      });
    },
    [enabled]
  );

  const handleBackspace = useCallback(() => {
    setInput((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
  }, []);

  useEffect(() => {
    if (!enabled || input.length < pin.length || pin.length === 0) return;

    if (input === pin) {
      setInput('');
      onUnlock();
    } else {
      setShake(true);
      const timer = setTimeout(() => {
        setShake(false);
        setInput('');
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [input, pin, enabled, onUnlock]);

  if (!enabled) return null;

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="fixed inset-0 z-[100] bg-surface flex flex-col items-center justify-center p-6">
      <div className={cn('text-center mb-8', shake && 'animate-shake')}>
        <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center mx-auto mb-4">
          <i className="fas fa-lock text-3xl text-on-primary-container" />
        </div>
        <h2 className="text-2xl font-bold text-on-surface mb-1">App Locked</h2>
        <p className="text-sm text-on-surface-variant">Enter your PIN to continue</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: Math.max(pin.length || 4, input.length) }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'w-4 h-4 rounded-full border-2 transition-colors',
              i < input.length
                ? 'bg-primary border-primary'
                : 'bg-transparent border-outline'
            )}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 max-w-xs w-full mb-6">
        {keys.map((key) => (
          <Ripple
            key={key}
            className="rounded-2xl bg-surface-container-high text-on-surface aspect-square flex items-center justify-center text-2xl font-semibold"
            onClick={() => handleKey(key)}
          >
            <span className="flex items-center justify-center w-full h-full">{key}</span>
          </Ripple>
        ))}
        <Ripple
          className="rounded-2xl bg-surface-container-low text-on-surface-variant aspect-square flex items-center justify-center"
          onClick={handleClear}
        >
          <span className="flex items-center justify-center w-full h-full">
            <i className="fas fa-times" />
          </span>
        </Ripple>
        <Ripple
          className="rounded-2xl bg-surface-container-high text-on-surface aspect-square flex items-center justify-center text-2xl font-semibold"
          onClick={() => handleKey('0')}
        >
          <span className="flex items-center justify-center w-full h-full">0</span>
        </Ripple>
        <Ripple
          className="rounded-2xl bg-surface-container-low text-on-surface-variant aspect-square flex items-center justify-center"
          onClick={handleBackspace}
        >
          <span className="flex items-center justify-center w-full h-full">
            <i className="fas fa-backspace" />
          </span>
        </Ripple>
      </div>

      {biometricPrompt && (
        <button
          onClick={biometricPrompt}
          className="flex items-center gap-2 text-primary font-medium"
        >
          <i className="fas fa-fingerprint text-xl" />
          Use biometric
        </button>
      )}
    </div>
  );
}
