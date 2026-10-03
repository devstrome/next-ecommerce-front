export const dynamic = 'force-dynamic';
import BlogDetailClient from './BlogDetailClient';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';
const SITE_NAME = 'Belorella';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  try {
    const res = await fetch(`${API_URI}/api/blogs/by-slug/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return { title: `Blog | ${SITE_NAME}` };
    const blog = await res.json();
    const seo = blog.seo || {};
    const title = seo.metaTitle || `${blog.title} | ${SITE_NAME} Blog`;
    const description = seo.metaDescription || blog.excerpt || `Read "${blog.title}" on Belorella. Tips, trends, and more.`;
    const image = seo.ogImage || blog.coverImage || '/logo.png';
    const url = `${SITE_URL}/blog/${slug}`;

    return {
      title,
      description,
      keywords: seo.metaKeywords || `${blog.title}, ${blog.category}, Belorella, blog`,
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
  return <BlogDetailClient slug={slug} />;
}
