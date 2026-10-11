export const dynamic = 'force-dynamic';
import BlogDetailClient from './BlogDetailClient';
import { BRAND } from '../../../../src/config/brand';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';
const SITE_NAME = 'BELORELLA';
const safeAbsoluteUrl = (value) => {
  try {
    const parsed = new URL(value, SITE_URL);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch { return null; }
};

async function fetchBlog(slug) {
  try {
    const res = await fetch(`${API_URI}/api/blogs/by-slug/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.blog || data;
  } catch {
    return null;
  }
}

const safeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const blog = await fetchBlog(slug);
    if (!blog) return { title: `Blog | ${SITE_NAME}` };
    const seo = blog.seo || {};
    const title = seo.metaTitle || `${blog.title} | ${SITE_NAME} Blog`;
    const description = seo.metaDescription || blog.excerpt || `Read "${blog.title}" on BELORELLA. Tips, trends, and more.`;
    const image = seo.ogImage || blog.coverImage || BRAND.EMAIL_LOGO_URL;
    const url = `${SITE_URL}/blog/${slug}`;

    return {
      title,
      description,
      keywords: seo.metaKeywords || `${blog.title}, ${blog.category}, BELORELLA, blog`,
      openGraph: {
        title,
        description,
        url,
        siteName: SITE_NAME,
        images: [{ url: image, width: 1200, height: 630, alt: blog.title }],
        type: 'article',
        publishedTime: blog.createdAt,
        modifiedTime: blog.updatedAt,
        authors: [blog.author || SITE_NAME],
        tags: blog.tags || [],
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
      alternates: { canonical: url },
    };
  } catch {
    return { title: `Blog | ${SITE_NAME}` };
  }
}

export default async function Page({ params }) {
  const { slug } = await params;
  const blog = await fetchBlog(slug);
  const blogUrl = `${SITE_URL}/blog/${encodeURIComponent(slug)}`;
  const authorName = typeof blog?.author === 'string' ? blog.author : blog?.author?.name;
  const image = safeAbsoluteUrl(blog?.seo?.ogImage || blog?.coverImage);
  const articleSchema = blog?.title ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    ...(blog.seo?.metaDescription || blog.excerpt ? { description: blog.seo?.metaDescription || blog.excerpt } : {}),
    ...(image ? { image } : {}),
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    mainEntityOfPage: { '@type': 'WebPage', '@id': blogUrl },
    ...(authorName ? { author: { '@type': 'Person', name: authorName } } : {}),
    publisher: { '@type': 'Organization', name: SITE_NAME, logo: { '@type': 'ImageObject', url: BRAND.EMAIL_LOGO_URL } },
    ...(blog.category ? { articleSection: blog.category } : {}),
  } : null;
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      ...(blog?.title ? [{ '@type': 'ListItem', position: 3, name: blog.title, item: blogUrl }] : []),
    ],
  };
  return <>
    {articleSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(articleSchema) }} />}
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
    <BlogDetailClient slug={slug} />
  </>;
}
