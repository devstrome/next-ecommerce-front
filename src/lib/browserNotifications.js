import { BRAND } from '../config/brand';

const recentNativeTags = new Map();

export const browserNotificationsAvailable = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const getBrowserNotificationPermission = () =>
  browserNotificationsAvailable() ? Notification.permission : 'unsupported';

export const requestBrowserNotificationPermission = async () => {
  if (!browserNotificationsAvailable()) return 'unsupported';
  if (Notification.permission !== 'default') return Notification.permission;
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
};

export const showBrowserNotification = ({ title, body, image, url, tag, data = {} }) => {
  if (!browserNotificationsAvailable() || Notification.permission !== 'granted') return null;
  if (tag) {
    const lastShown = recentNativeTags.get(tag) || 0;
    if (Date.now() - lastShown < 10000) return null;
    recentNativeTags.set(tag, Date.now());
    if (recentNativeTags.size > 100) {
      const oldestTag = recentNativeTags.keys().next().value;
      recentNativeTags.delete(oldestTag);
    }
  }

  try {
    const notification = new Notification(title || BRAND.NAME, {
      body: String(body || '').slice(0, 500),
      icon: BRAND.EMAIL_LOGO_URL,
      badge: BRAND.ICON_URL,
      ...(image ? { image } : {}),
      tag,
      renotify: Boolean(tag),
      data: { ...data, url },
    });

    notification.onclick = (event) => {
      event.preventDefault();
      window.focus();
      if (url) window.location.assign(url);
      notification.close();
    };
    window.setTimeout(() => notification.close(), 15000);
    return notification;
  } catch (error) {
    console.warn('Unable to show browser notification:', error);
    return null;
  }
};

const readNotificationFeed = (key) => {
  if (typeof window === 'undefined' || !key) return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || '[]');
    return Array.isArray(value) ? value.slice(0, 50) : [];
  } catch {
    return [];
  }
};

const writeNotificationFeed = (key, notifications) => {
  if (typeof window === 'undefined' || !key) return;
  try { window.localStorage.setItem(key, JSON.stringify(notifications.slice(0, 50))); } catch {}
};

export const notificationFeedStorage = { read: readNotificationFeed, write: writeNotificationFeed };
