import { NextResponse } from 'next/server';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';

export async function POST(request) {
  try {
    const { urls } = await request.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No URLs provided' },
        { status: 400 }
      );
    }

    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Authorization required' },
        { status: 401 }
      );
    }

    const results = [];

    for (const path of urls) {
      const fullUrl = `${BASE_URL}${path}`;

      try {
        const pingRes = await fetch(
          `https://www.google.com/ping?sitemap=${encodeURIComponent(fullUrl)}`,
          { method: 'GET' }
        );
        results.push({ url: fullUrl, status: pingRes.status, ok: pingRes.ok });
      } catch (err) {
        results.push({ url: fullUrl, status: 0, ok: false, error: err.message });
      }

      try {
        const bingRes = await fetch(
          `https://www.bing.com/ping?sitemap=${encodeURIComponent(fullUrl)}`,
          { method: 'GET' }
        );
        results.push({ url: fullUrl, engine: 'bing', status: bingRes.status, ok: bingRes.ok });
      } catch (err) {
        results.push({ url: fullUrl, engine: 'bing', status: 0, ok: false, error: err.message });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const sitemapUrl = `${BASE_URL}/api/seo/sitemap.xml`;

  try {
    const googleRes = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    );

    const bingRes = await fetch(
      `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      { method: 'GET' }
    );

    return NextResponse.json({
      success: true,
      sitemap: sitemapUrl,
      google: { status: googleRes.status, ok: googleRes.ok },
      bing: { status: bingRes.status, ok: bingRes.ok },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
