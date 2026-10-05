export const dynamic = 'force-dynamic'
import ProductViewPageClient from './ProductViewPageClient'

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';
const SITE_NAME = 'BELORELLA';

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  try {
    const res = await fetch(`${API_URI}/api/products/${id}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: { absolute: `Product | ${SITE_NAME}` } };
    const product = await res.json();

    // Serve variant-specific SEO when ?variant=<variantId> matches
    const variantId = sp?.variant;
    const variant = variantId
      ? (product.variants || []).find(v => String(v._id) === String(variantId))
      : null;
    const hasVariantSeo = variant?.seo?.metaTitle || variant?.seo?.metaDescription;
    const seo = hasVariantSeo ? variant.seo : (product.seo || {});

    const title = seo.metaTitle || `${product.brand ? product.brand + ' ' : ''}${product.name}${variant?.colorName ? ` — ${variant.colorName}` : ''} | ${SITE_NAME}`;
    const description = seo.metaDescription || `Shop ${product.name} at BELORELLA. Best prices, fast delivery in Bangladesh.`;
    const image = seo.ogImage || product.mainImage || '/logo.png';
    const url = variant ? `${SITE_URL}/products/${id}?variant=${variant._id}` : `${SITE_URL}/products/${id}`;

    return {
      title: { absolute: title },
      description,
      keywords: seo.metaKeywords || `${product.name}, ${product.brand}, BELORELLA, buy online, Bangladesh`,
      openGraph: {
        title,
        description,
        url,
        siteName: SITE_NAME,
        images: [{ url: image, width: 1200, height: 630, alt: variant?.colorName ? `${product.name} - ${variant.colorName}` : product.name }],
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
      alternates: { canonical: url },
    };
  } catch {
    return { title: { absolute: `Product | ${SITE_NAME}` } };
  }
}

export default async function Page({ params }) {
  const { id } = await params;
  return <ProductViewPageClient id={id} />
}
