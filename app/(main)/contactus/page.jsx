export const dynamic = 'force-dynamic'
import ContactUsPageClient from './ContactUsPageClient'

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '')

export const metadata = {
  title: { absolute: 'Contact BELORELLA | Customer Support Bangladesh' },
  description: 'Contact BELORELLA customer support in Bangladesh for help with products, orders, delivery, returns, and your account.',
  alternates: { canonical: `${SITE_URL}/contact` },
  robots: { index: false, follow: true },
}

export default function Page() { return <ContactUsPageClient /> }
