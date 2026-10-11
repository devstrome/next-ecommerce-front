export const SOCIAL_LINKS = Object.freeze({
  facebook: 'https://www.facebook.com/BELORELLA',
  instagram: 'https://www.instagram.com/belorella.ig',
  twitter: 'https://x.com/BELORELLAX',
  youtube: 'https://www.youtube.com/@BELORELLA',
});

const LEGACY_DEFAULTS = Object.freeze({
  facebook: ['https://facebook.com', 'https://www.facebook.com'],
  instagram: ['https://instagram.com', 'https://www.instagram.com'],
  twitter: ['https://twitter.com', 'https://www.twitter.com'],
  youtube: ['https://youtube.com', 'https://www.youtube.com'],
});

export const resolveSocialLinks = (savedLinks = {}) => Object.fromEntries(
  Object.entries(SOCIAL_LINKS).map(([network, defaultUrl]) => {
    const savedUrl = String(savedLinks?.[network] || '').trim();
    const legacyUrls = LEGACY_DEFAULTS[network];
    return [network, savedUrl && !legacyUrls.includes(savedUrl) ? savedUrl : defaultUrl];
  })
);
