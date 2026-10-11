// Central brand configuration — single source of truth for customer-facing identity.
// NOTE: do not blindly rename technical color tokens (tailwind `maybelline-*`)
// or image asset hosts; this config drives DISPLAY strings only.

export const BRAND = Object.freeze({
  NAME: 'BELORELLA',
  TAGLINE: 'Premium Fashion & Lifestyle',
  ICON_URL: 'https://lh3.googleusercontent.com/pw/AP1GczO_CK4GD4Ulx1zmv_Zpm9X1Wnfh3pmlFEqstk7sSRGmQV_fiEiPxdGK-GGCAKIM7TNsB_bcuCgakfTZLuA_l9GHbvHINoCF4smZCtpCAyAoC92jjg=s512',
  EMAIL_LOGO_URL: 'https://lh3.googleusercontent.com/pw/AP1GczO_CK4GD4Ulx1zmv_Zpm9X1Wnfh3pmlFEqstk7sSRGmQV_fiEiPxdGK-GGCAKIM7TNsB_bcuCgakfTZLuA_l9GHbvHINoCF4smZCtpCAyAoC92jjg=s512',
  CURRENCY: 'BDT',
  SUPPORT_EMAIL: 'notify.belorella@gmail.com'
});

// Money formatting — every POS/print/summary surface uses this (no `$` anywhere).
export const formatBDT = (amount) =>
  `${BRAND.CURRENCY} ${(Number(amount) || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

// Compact money for tight table cells: BDT 1,234
export const formatBDTShort = (amount) =>
  `${BRAND.CURRENCY} ${(Number(amount) || 0).toLocaleString('en-BD', {
    maximumFractionDigits: 2
  })}`;
