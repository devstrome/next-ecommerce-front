export const dynamic = 'force-dynamic'
import HomePageClient from './HomePageClient'
import { BRAND } from '../../src/config/brand'

const SITE_NAME = 'BELORELLA';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '');
const HOME_TITLE = 'BELORELLA | Premium Fashion, Beauty & Lifestyle in Bangladesh';

export const metadata = {
  title: { absolute: HOME_TITLE },
  description: 'Shop the latest fashion, beauty, and lifestyle trends with unbeatable prices. Quality products delivered to your doorstep in Bangladesh.',
  keywords: 'BELORELLA, online shopping Bangladesh, fashion, beauty, makeup, skincare, haircare, luxury, ecommerce Bangladesh',
  openGraph: {
    title: HOME_TITLE,
    description: 'Shop the latest fashion, beauty, and lifestyle trends with unbeatable prices.',
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [{ url: BRAND.EMAIL_LOGO_URL, width: 512, height: 512, alt: SITE_NAME }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: HOME_TITLE,
    description: 'Shop the latest fashion, beauty, and lifestyle trends with unbeatable prices.',
    images: [BRAND.EMAIL_LOGO_URL],
  },
  alternates: { canonical: SITE_URL },
};

export default function Page() { return <HomePageClient /> }
