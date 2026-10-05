// Generates and caches a stable per-browser device id, plus a coarse browser
// fingerprint, so the backend ban list can match repeat visitors even when
// the user clears cookies. Not a replacement for true device attestation,
// but enough to make drive-by re-registration painful.
export function getDeviceId() {
  if (typeof window === 'undefined') return '';
  try {
    let id = localStorage.getItem('belorella_device_id');
    if (!id) {
      id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem('belorella_device_id', id);
    }
    return id;
  } catch {
    return '';
  }
}

export function getFingerprint() {
  if (typeof window === 'undefined') return '';
  try {
    const parts = [
      navigator.userAgent || '',
      navigator.platform || '',
      navigator.language || '',
      String(screen.width || 0) + 'x' + String(screen.height || 0),
      String(screen.colorDepth || 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      String((new Date()).getTimezoneOffset()),
    ];
    return btoa(unescape(encodeURIComponent(parts.join('|')))).slice(0, 64);
  } catch {
    return '';
  }
}

// Attach to an outgoing auth request body
export function withDevice(body) {
  return { ...body, deviceId: getDeviceId(), fingerprint: getFingerprint() };
}
