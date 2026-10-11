const PUBLIC_SITE_ORIGIN = 'https://belorella.com';

/**
 * Build links for sharing from the public storefront, even when the current
 * browser is running on localhost or another development host.
 */
export function getPublicSiteUrl(path = '/') {
  try {
    const candidate = String(path || '/');
    const safePath = candidate.startsWith('/') && !candidate.startsWith('//')
      ? candidate
      : `/${candidate.replace(/^\/+/, '')}`;
    return new URL(safePath, PUBLIC_SITE_ORIGIN).toString();
  } catch {
    return PUBLIC_SITE_ORIGIN;
  }
}

export function getPublicCurrentUrl(fallbackPath = '/') {
  if (typeof window === 'undefined') return getPublicSiteUrl(fallbackPath);
  return getPublicSiteUrl(`${window.location.pathname}${window.location.search}${window.location.hash}`);
}
