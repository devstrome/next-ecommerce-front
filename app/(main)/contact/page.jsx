export const dynamic = 'force-dynamic'
import ContactPageClient from '../../../src/views/ContactPageClient'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '')

export const metadata = {
  title: { absolute: 'Contact BELORELLA | Customer Support Bangladesh' },
  description: 'Contact BELORELLA customer support in Bangladesh for help with products, orders, delivery, returns, and your account.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/contact`,
    siteName: 'BELORELLA',
    title: 'Contact BELORELLA | Customer Support Bangladesh',
    description: 'Get help with BELORELLA products, orders, delivery, returns, and your account.',
  },
  twitter: { card: 'summary', title: 'Contact BELORELLA', description: 'Get help with orders and shopping at BELORELLA.' },
}

export default function Page() { return <ContactPageClient /> }
