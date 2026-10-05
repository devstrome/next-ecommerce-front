export const dynamic = 'force-dynamic'
import ProductsPageClient from './ProductsPageClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';

export const metadata = {
  title: 'All Products',
  description: 'Browse our complete collection of fashion, beauty, and lifestyle products. Shop with confidence at BELORELLA.',
  keywords: 'BELORELLA products, fashion, beauty, makeup, skincare, buy online Bangladesh',
  openGraph: { title: 'All Products | BELORELLA', description: 'Browse our complete collection of fashion, beauty, and lifestyle products.' },
  alternates: { canonical: `${SITE_URL}/products` },
};

export default function Page() { return <ProductsPageClient /> }
