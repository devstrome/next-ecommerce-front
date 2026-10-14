export const dynamic = 'force-dynamic'
import AboutUsPageClient from './AboutUsPageClient'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '')

export const metadata = {
  title: { absolute: 'About BELORELLA | Fashion and Beauty in Bangladesh' },
  description: 'Learn about BELORELLA, a Bangladesh destination for fashion, beauty, makeup, skincare, and lifestyle products.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/about`,
    siteName: 'BELORELLA',
    title: 'About BELORELLA | Fashion and Beauty in Bangladesh',
    description: 'Learn about BELORELLA and our fashion, beauty, and lifestyle collections in Bangladesh.',
  },
  twitter: { card: 'summary', title: 'About BELORELLA', description: 'Learn about BELORELLA and our collections in Bangladesh.' },
}

export default function Page() { return <AboutUsPageClient /> }
