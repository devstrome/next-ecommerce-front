import { NextResponse } from 'next/server';

const API_URI = (process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000').replace(/\/+$/, '');
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '');

async function fetchProducts() {
  const products = [];
  const pageSize = 500;
  let offset = 0;
  while (true) {
    try {
      const res = await fetch(`${API_URI}/api/products?limit=${pageSize}&offset=${offset}&fields=sitemap`, { next: { revalidate: 3600 } });
      if (!res.ok) break;
      const data = await res.json();
      const page = Array.isArray(data) ? data : (Array.isArray(data.products) ? data.products : []);
      if (!page.length) break;
      products.push(...page);
      if (Array.isArray(data) || !data.hasMore) break;
      offset += page.length;
    } catch {
      break;
    }
  }
  return products;
}

async function fetchBlogPosts() {
  const posts = [];
  let page = 1;
  let pageCount = 1;
  try {
    do {
      const params = new URLSearchParams({ limit: '50', page: String(page) });
      const res = await fetch(`${API_URI}/api/blogs?${params}`, { next: { revalidate: 3600 } });
      if (!res.ok) break;
      const data = await res.json();
      const batch = Array.isArray(data) ? data : (Array.isArray(data.blogs) ? data.blogs : (data.posts || []));
      if (!Array.isArray(batch) || batch.length === 0) break;
      posts.push(...batch);
      pageCount = Number.isSafeInteger(Number(data.pages)) ? Math.max(1, Number(data.pages)) : 1;
      page += 1;
    } while (page <= pageCount && page <= 1000);
  } catch {
    // Keep pages already fetched if a later page is temporarily unavailable.
  }
  return posts;
}

async function fetchHelpPages() {
  try {
    const res = await fetch(`${API_URI}/api/help-pages`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const pages = await res.json();
    return Array.isArray(pages) ? pages.filter((page) => page.active && page.slug) : [];
  } catch {
    return [];
  }
}

const SITEMAP_URL_LIMIT = 45000;
const xmlEscape = (value) => String(value).replace(/[<>&'\"]/g, (char) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
}[char]));

function renderUrlSet(urls) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${xmlEscape(`${BASE_URL}${url.loc}`)}</loc>
${url.lastmod && Number.isFinite(new Date(url.lastmod).getTime()) ? `    <lastmod>${xmlEscape(new Date(url.lastmod).toISOString())}</lastmod>` : ''}
${url.changefreq ? `    <changefreq>${url.changefreq}</changefreq>` : ''}
${url.priority ? `    <priority>${url.priority}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`;
  return new NextResponse(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}

export async function GET(request) {
  const [products, blogPosts, helpPages] = await Promise.all([fetchProducts(), fetchBlogPosts(), fetchHelpPages()]);

  const staticUrls = [
    { loc: '/', changefreq: 'daily', priority: '1.0' },
    { loc: '/products', changefreq: 'daily', priority: '0.9' },
    { loc: '/about', changefreq: 'monthly', priority: '0.5' },
    { loc: '/contact', changefreq: 'monthly', priority: '0.5' },
    { loc: '/help', changefreq: 'monthly', priority: '0.6' },
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

  const helpUrls = helpPages.map((page) => ({
    loc: `/help/${encodeURIComponent(page.slug)}`,
    changefreq: 'monthly',
    priority: '0.5',
    lastmod: page.updatedAt || page.createdAt,
  }));

  const allUrls = [...staticUrls, ...productUrls, ...blogUrls, ...helpUrls];
  const partValue = new URL(request.url).searchParams.get('part');
  if (partValue !== null) {
    const part = Number.parseInt(partValue, 10);
    const pageCount = Math.max(1, Math.ceil(allUrls.length / SITEMAP_URL_LIMIT));
    if (!Number.isInteger(part) || part < 1 || part > pageCount) return new NextResponse('Invalid sitemap part', { status: 400 });
    return renderUrlSet(allUrls.slice((part - 1) * SITEMAP_URL_LIMIT, part * SITEMAP_URL_LIMIT));
  }

  if (allUrls.length <= SITEMAP_URL_LIMIT) return renderUrlSet(allUrls);
  const sitemapEntries = Array.from({ length: Math.ceil(allUrls.length / SITEMAP_URL_LIMIT) }, (_, index) =>
    `  <sitemap><loc>${xmlEscape(`${BASE_URL}/api/seo/sitemap.xml?part=${index + 1}`)}</loc></sitemap>`
  ).join('\n');
  return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapEntries}\n</sitemapindex>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' },
  });
}
