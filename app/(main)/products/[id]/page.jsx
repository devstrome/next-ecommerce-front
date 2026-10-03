export const dynamic = 'force-dynamic'
import ProductViewPageClient from './ProductViewPageClient'

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';
const SITE_NAME = 'Belorella';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URI}/api/products/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: `Product | ${SITE_NAME}` };
    const product = await res.json();
    const seo = product.seo || {};
    const title = seo.metaTitle || `${product.brand ? product.brand + ' ' : ''}${product.name} | ${SITE_NAME}`;
    const description = seo.metaDescription || `Shop ${product.name} at Belorella. Best prices, fast delivery in Bangladesh.`;
    const image = seo.ogImage || product.mainImage || '/logo.png';
    const url = `${SITE_URL}/products/${id}`;

    return {
      title,
      description,
      keywords: seo.metaKeywords || `${product.name}, ${product.brand}, Belorella, buy online, Bangladesh`,
      openGraph: {
        title,
        description,
        url,
        siteName: SITE_NAME,
        images: [{ url: image, width: 1200, height: 630, alt: product.name }],
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
      alternates: { canonical: url },
    };
  } catch {
    return { title: `Product | ${SITE_NAME}` };
  }
}

export default async function Page({ params }) {
  const { id } = await params;
  return <ProductViewPageClient id={id} />
}
