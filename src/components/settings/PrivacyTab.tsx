import { useState, useEffect } from 'react';
import type { Settings } from '../../types';
import { cn } from '../../utils';
import { Ripple } from '../Ripple';
import { scheduleLocal, requestNotificationPermission, registerPush } from '../../services/notifications';

interface PrivacyTabProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

export function PrivacyTab({ settings, onChange }: PrivacyTabProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Reset local PIN inputs when the modal re-opens with a stored PIN.
  useEffect(() => {
    if (settings.appLockEnabled && settings.appLockPin) {
      setPin(settings.appLockPin);
      setConfirmPin(settings.appLockPin);
    } else {
      setPin('');
      setConfirmPin('');
    }
    setPinError(null);
  }, [settings.appLockEnabled, settings.appLockPin]);

  const handleAppLockToggle = () => {
    if (settings.appLockEnabled) {
      onChange({ appLockEnabled: false, appLockPin: '' });
      setPin('');
      setConfirmPin('');
      setPinError(null);
      return;
    }

    if (pin.length === 0 || confirmPin.length === 0) {
      onChange({ appLockEnabled: false });
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match.');
      onChange({ appLockEnabled: false });
      return;
    }

    setPinError(null);
    onChange({ appLockEnabled: true, appLockPin: pin });
  };

  const updatePin = (value: string, isConfirm: boolean) => {
    const sanitized = value.replace(/\D/g, '').slice(0, 8);
    if (isConfirm) {
      setConfirmPin(sanitized);
    } else {
      setPin(sanitized);
    }

    if (pinError) setPinError(null);
  };

  const handleNotificationToggle = async () => {
    const next = !settings.notificationsEnabled;
    if (next) {
      await requestNotificationPermission();
    }
    onChange({ notificationsEnabled: next });
  };

  const handlePushToggle = async () => {
    const next = !settings.pushNotificationsEnabled;
    if (next) {
      await requestNotificationPermission();
      await registerPush();
    }
    onChange({ pushNotificationsEnabled: next });
  };

  const handleTestNotification = async () => {
    if (!settings.notificationsEnabled) {
      const granted = await requestNotificationPermission();
      if (granted) {
        onChange({ notificationsEnabled: true });
      }
    }
    await scheduleLocal('e6client', 'This is a test notification.', 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* App Lock */}
      <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-on-surface font-medium block">App Lock</span>
            <span className="text-xs text-on-surface-variant">Require a PIN to open the app</span>
          </div>
          <Toggle enabled={settings.appLockEnabled} onToggle={handleAppLockToggle} />
        </div>

        {settings.appLockEnabled && (
          <div className="space-y-3 pt-2 border-t border-outline-variant/40">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={pin}
                  onChange={(e) => updatePin(e.target.value, false)}
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
                  placeholder="••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-on-surface-variant mb-1">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={confirmPin}
                  onChange={(e) => updatePin(e.target.value, true)}
                  className="w-full px-3 py-2 border border-outline rounded-md bg-surface text-on-surface focus:ring-2 focus:ring-primary outline-none"
                  placeholder="••••"
                />
              </div>
            </div>
            {pinError && (
              <p className="text-xs text-error">
                <i className="fas fa-exclamation-circle mr-1" />
                {pinError}
              </p>
            )}
            <p className="text-xs text-on-surface-variant">
              A 4–8 digit numeric PIN is required.
            </p>
          </div>
        )}
      </div>

      {/* Biometric */}
      <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
        <div>
          <span className="text-on-surface font-medium block">Use Biometric Unlock</span>
          <span className="text-xs text-on-surface-variant">Allow fingerprint or face unlock when available</span>
        </div>
        <Toggle
          enabled={settings.useBiometric}
          onToggle={() => onChange({ useBiometric: !settings.useBiometric })}
        />
      </div>

      {/* Secure app switcher */}
      <div className="flex items-center justify-between p-3 bg-surface-container-low rounded-lg">
        <div>
          <span className="text-on-surface font-medium block">Secure App Switcher</span>
          <span className="text-xs text-on-surface-variant">Hide content in the app switcher and recent apps</span>
        </div>
        <Toggle
          enabled={settings.secureAppSwitcher}
          onToggle={() => onChange({ secureAppSwitcher: !settings.secureAppSwitcher })}
        />
      </div>

      {/* Notifications */}
      <div className="p-4 bg-surface-container-low rounded-lg border border-outline-variant/40 space-y-4">
        <h3 className="text-lg font-bold text-on-surface">Notifications</h3>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-on-surface font-medium block">Local Notifications</span>
            <span className="text-xs text-on-surface-variant">Allow scheduled in-app notifications</span>
          </div>
          <Toggle enabled={settings.notificationsEnabled} onToggle={handleNotificationToggle} />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-on-surface font-medium block">Push Notifications</span>
            <span className="text-xs text-on-surface-variant">Receive remote push notifications</span>
          </div>
          <Toggle enabled={settings.pushNotificationsEnabled} onToggle={handlePushToggle} />
        </div>

        <Ripple
          className="rounded-full bg-primary text-on-primary"
          onClick={handleTestNotification}
        >
          <span className="block px-4 py-2 text-sm font-medium text-center">
            <i className="fas fa-bell mr-2" />
            Test Notification
          </span>
        </Ripple>
      </div>
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  color = 'bg-primary',
}: {
  enabled: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative w-12 h-6 rounded-full transition-colors duration-200',
        enabled ? color : 'bg-outline'
      )}
    >
      <div
        className={cn(
          'absolute top-1 w-4 h-4 rounded-full bg-surface transition-transform duration-200',
          enabled ? 'left-7' : 'left-1'
        )}
      />
    </button>
  );
}
