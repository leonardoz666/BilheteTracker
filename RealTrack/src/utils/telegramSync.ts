const TELEGRAM_UPDATE_STORAGE_KEY = 'realtrack:telegram-update';
const TELEGRAM_UPDATE_CHANNEL = 'realtrack-telegram-update';
const TELEGRAM_UPDATE_EVENT = 'apostas-updated';

type TelegramUpdateMessage = {
  type: 'telegram-update';
  timestamp: number;
};

type TelegramUpdateDetail = {
  trigger?: string;
  timestamp?: number;
};

const parseTimestamp = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
};

const triggerListeners = (notify: () => void, timestampTracker: { lastHandled: number }, timestamp?: number) => {
  if (typeof timestamp === 'number') {
    if (timestamp <= timestampTracker.lastHandled) {
      return;
    }
    timestampTracker.lastHandled = timestamp;
  } else {
    timestampTracker.lastHandled = Date.now();
  }
  notify();
};

export const signalTelegramUpdate = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const timestamp = Date.now();
  const payload: TelegramUpdateMessage = { type: 'telegram-update', timestamp };

  if (typeof window.BroadcastChannel === 'function') {
    try {
      const channel = new BroadcastChannel(TELEGRAM_UPDATE_CHANNEL);
      channel.postMessage(payload);
      channel.close();
    } catch {
      // Ignora falha de broadcast
    }
  }

  try {
    window.localStorage.setItem(TELEGRAM_UPDATE_STORAGE_KEY, String(timestamp));
  } catch {
    // Ignora falha de armazenamento
  }

  try {
    const event = new CustomEvent<TelegramUpdateDetail>(TELEGRAM_UPDATE_EVENT, {
      detail: { trigger: 'telegram-webapp', timestamp },
    });
    window.dispatchEvent(event);
  } catch {
    window.dispatchEvent(new Event(TELEGRAM_UPDATE_EVENT));
  }
};

export const subscribeToTelegramUpdate = (listener: () => void): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const tracker = { lastHandled: 0 };
  const notify = (timestamp?: number) => triggerListeners(listener, tracker, timestamp);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === TELEGRAM_UPDATE_STORAGE_KEY) {
      notify(parseTimestamp(event.newValue ?? undefined));
    }
  };

  window.addEventListener('storage', handleStorage);

  let channel: BroadcastChannel | undefined;
  if (typeof window.BroadcastChannel === 'function') {
    try {
      channel = new BroadcastChannel(TELEGRAM_UPDATE_CHANNEL);
      channel.onmessage = (event: MessageEvent<TelegramUpdateMessage>) => {
        const data = event.data;
        if (data && data.type === 'telegram-update') {
          notify(parseTimestamp(data.timestamp));
        }
      };
    } catch {
      channel = undefined;
    }
  }

  const handleWindowEvent: EventListener = (event) => {
    const customEvent = event as CustomEvent<TelegramUpdateDetail>;
    if (customEvent.detail?.trigger === 'telegram-webapp') {
      notify(parseTimestamp(customEvent.detail.timestamp));
    }
  };

  window.addEventListener(TELEGRAM_UPDATE_EVENT, handleWindowEvent);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(TELEGRAM_UPDATE_EVENT, handleWindowEvent);
    if (channel) {
      channel.onmessage = null;
      channel.close();
    }
  };
};
