export const dynamic = 'force-dynamic';
import HelpPageClient from './HelpPageClient';
import { notFound } from 'next/navigation';
import { BRAND } from '../../../../src/config/brand';

const API_URI = (process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000').replace(/\/+$/, '');
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '');

async function fetchHelpPage(slug) {
  try {
    const response = await fetch(`${API_URI}/api/help-pages/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function fetchHelpPages() {
  try {
    const response = await fetch(`${API_URI}/api/help-pages`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const pages = await response.json();
    return Array.isArray(pages) ? pages.filter((page) => page.active) : [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const page = await fetchHelpPage(slug);
  if (!page) return {
    title: { absolute: `Help page not found | ${BRAND.NAME}` },
    robots: { index: false, follow: true },
  };

  const title = page.seo?.metaTitle || `${page.title} | ${BRAND.NAME}`;
  const description = page.seo?.metaDescription || `Helpful information about ${page.title} and shopping with ${BRAND.NAME} in Bangladesh.`;
  const canonical = `${SITE_URL}/help/${encodeURIComponent(page.slug || slug)}`;
  const image = page.seo?.ogImage || BRAND.EMAIL_LOGO_URL;
  return {
    title: { absolute: title },
    description,
    ...(page.seo?.metaKeywords ? { keywords: page.seo.metaKeywords } : {}),
    alternates: { canonical },
    openGraph: {
      type: 'article',
      url: canonical,
      siteName: BRAND.NAME,
      title,
      description,
      images: [{ url: image, alt: page.title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const [page, pages] = await Promise.all([fetchHelpPage(slug), fetchHelpPages()]);
  if (!page) notFound();

  const canonical = `${SITE_URL}/help/${encodeURIComponent(page.slug || slug)}`;
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    url: canonical,
    ...(page.seo?.metaDescription ? { description: page.seo.metaDescription } : {}),
    inLanguage: 'en-BD',
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Help center', item: `${SITE_URL}/help` },
      { '@type': 'ListItem', position: 3, name: page.title, item: canonical },
    ],
  };
  const safeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pageSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
    <HelpPageClient slug={slug} initialPage={page} initialPages={pages} />
  </>;
}
