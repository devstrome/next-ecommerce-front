import '../src/index.css'

const SITE_NAME = 'BELORELLA';
const DEFAULT_DESCRIPTION = 'Shop the latest trends with unbeatable prices. Quality fashion, beauty, and lifestyle products delivered to your doorstep in Bangladesh.';
const DEFAULT_KEYWORDS = 'BELORELLA, online shopping, Bangladesh, ecommerce, fashion, beauty, makeup, luxury, skincare, haircare';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';

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
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: BASE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Premium Fashion & Lifestyle`,
    description: DEFAULT_DESCRIPTION,
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Premium Fashion & Lifestyle`,
    description: DEFAULT_DESCRIPTION,
    images: ['/logo.png'],
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
        <link rel="icon" type="image/png" href="/icon.png" />
        <link rel="apple-touch-icon" href="/icon.png" />
      </head>
      <body>{children}</body>
    </html>
  )
}
