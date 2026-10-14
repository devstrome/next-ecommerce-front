import '../src/index.css'
import StoreProvider from './StoreProvider'
import { BRAND } from '../src/config/brand'

const SITE_NAME = 'BELORELLA';
const DEFAULT_DESCRIPTION = 'Shop the latest trends with unbeatable prices. Quality fashion, beauty, and lifestyle products delivered to your doorstep in Bangladesh.';
const DEFAULT_KEYWORDS = 'BELORELLA, online shopping, Bangladesh, ecommerce, fashion, beauty, makeup, luxury, skincare, haircare';
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '');
const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE || '';
const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '';
const socialProfiles = [
  process.env.NEXT_PUBLIC_FACEBOOK_URL,
  process.env.NEXT_PUBLIC_INSTAGRAM_URL,
  process.env.NEXT_PUBLIC_TIKTOK_URL,
  process.env.NEXT_PUBLIC_YOUTUBE_URL,
].filter((value) => {
  try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
});
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: BASE_URL,
  logo: BRAND.EMAIL_LOGO_URL,
  ...(supportPhone || supportEmail ? { contactPoint: {
    '@type': 'ContactPoint',
    ...(supportPhone ? { telephone: supportPhone } : {}),
    ...(supportEmail ? { email: supportEmail } : {}),
    contactType: 'customer service',
  } } : {}),
  ...(socialProfiles.length ? { sameAs: socialProfiles } : {}),
};
const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: BASE_URL,
};
const toSafeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: `${SITE_NAME} - Premium Fashion & Lifestyle`,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  keywords: DEFAULT_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  icons: {
    icon: [{ url: BRAND.EMAIL_LOGO_URL, type: 'image/png', sizes: '512x512' }],
    shortcut: [{ url: BRAND.EMAIL_LOGO_URL, type: 'image/png' }],
    apple: [{ url: BRAND.EMAIL_LOGO_URL, type: 'image/png', sizes: '512x512' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Premium Fashion & Lifestyle`,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: BRAND.EMAIL_LOGO_URL, width: 512, height: 512, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Premium Fashion & Lifestyle`,
    description: DEFAULT_DESCRIPTION,
    images: [BRAND.EMAIL_LOGO_URL],
    creator: '@belorella',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  alternates: { canonical: BASE_URL },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="512x512" href={BRAND.EMAIL_LOGO_URL} />
        <link rel="apple-touch-icon" type="image/png" sizes="512x512" href={BRAND.EMAIL_LOGO_URL} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(organizationSchema) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toSafeJsonLd(websiteSchema) }} />
      </head>
      <body><StoreProvider>{children}</StoreProvider></body>
    </html>
  )
}
