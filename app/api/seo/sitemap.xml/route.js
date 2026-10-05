import { NextResponse } from 'next/server';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';

async function fetchProducts() {
  try {
    const res = await fetch(`${API_URI}/api/products?limit=1000`, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.products || []);
  } catch {
    return [];
  }
}

async function fetchBlogPosts() {
  try {
    const res = await fetch(`${API_URI}/api/blogs?limit=100`, { cache: 'no-store' });
    const data = await res.json();
    return Array.isArray(data) ? data : (data.blogs || data.posts || []);
  } catch {
    return [];
  }
}

export async function GET() {
  const [products, blogPosts] = await Promise.all([fetchProducts(), fetchBlogPosts()]);

  const staticUrls = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/products', changefreq: 'daily', priority: '0.9' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
    { loc: '/blog', changefreq: 'daily', priority: '0.7' },
  ];

  const productUrls = products.map((p) => ({
    loc: `/products/${p._id}`,
    changefreq: 'weekly',
    priority: '0.8',
    lastmod: p.updatedAt || p.createdAt || new Date().toISOString(),
  }));

  const blogUrls = blogPosts.map((b) => ({
    loc: `/blog/${b.slug}`,
    changefreq: 'weekly',
    priority: '0.6',
    lastmod: b.updatedAt || b.createdAt || new Date().toISOString(),
  }));

  const allUrls = [...staticUrls, ...productUrls, ...blogUrls];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (u) => `  <url>
    <loc>${BASE_URL}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
${u.lastmod ? `    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : ''}
  </url>`
  )
  .join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
