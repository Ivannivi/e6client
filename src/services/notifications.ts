const scheduledIds: number[] = [];
const webTimeouts = new Map<number, ReturnType<typeof setTimeout>>();

let nextId = 1;

function isNative(): boolean {
  return !!window.Capacitor?.isNativePlatform?.();
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (isNative()) {
    try {
      const result = await window.Capacitor!.Plugins.LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch {
      return false;
    }
  }

  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export async function scheduleLocal(
  title: string,
  body: string,
  delayMs: number
): Promise<number | null> {
  const id = nextId++;
  scheduledIds.push(id);

  if (isNative()) {
    try {
      await window.Capacitor!.Plugins.LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at: new Date(Date.now() + delayMs) },
          },
        ],
      });
      return id;
    } catch {
      return null;
    }
  }

  // Web fallback using the standard Notification API.
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return null;
  }

  const timeout = setTimeout(() => {
    try {
      // eslint-disable-next-line no-new
      new Notification(title, { body });
    } catch {
      // Ignore notifications blocked by the browser.
    }
    webTimeouts.delete(id);
  }, delayMs);

  webTimeouts.set(id, timeout);
  return id;
}

export async function cancelNotifications(): Promise<void> {
  if (isNative()) {
    try {
      await window.Capacitor!.Plugins.LocalNotifications.cancel({
        notifications: scheduledIds.map((id) => ({ id })),
      });
    } catch {
      // Ignore cancel failures.
    }
  }

  webTimeouts.forEach((timeout) => clearTimeout(timeout));
  webTimeouts.clear();
  scheduledIds.length = 0;
}

export async function registerPush(): Promise<void> {
  if (!isNative()) {
    // eslint-disable-next-line no-console
    console.log('[Push] Push registration is only available on native platforms.');
    return;
  }

  try {
    const permission = await window.Capacitor!.Plugins.PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      // eslint-disable-next-line no-console
      console.log('[Push] Permission denied.');
      return;
    }

    let removeRegistration: (() => void) | undefined;
    let removeError: (() => void) | undefined;

    removeRegistration = (
      await window.Capacitor!.Plugins.PushNotifications.addListener('registration', (token) => {
        // eslint-disable-next-line no-console
        console.log('[Push] Token received:', 'value' in token ? token.value : token);
        removeRegistration?.();
        removeError?.();
      })
    ).remove;

    removeError = (
      await window.Capacitor!.Plugins.PushNotifications.addListener('registrationError', (err) => {
        // eslint-disable-next-line no-console
        console.error('[Push] Registration error:', 'error' in err ? err.error : err);
        removeRegistration?.();
        removeError?.();
      })
    ).remove;

    window.Capacitor!.Plugins.PushNotifications.register();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[Push] Failed to register for push notifications:', e);
  }
}
