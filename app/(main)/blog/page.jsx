export const dynamic = 'force-dynamic';
import BlogListPage from './BlogListClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';

export const metadata = {
  title: 'Blog',
  description: 'Read the latest tips, trends, and news from BELORELLA. Beauty guides, skincare advice, and fashion inspiration.',
  keywords: 'BELORELLA blog, beauty tips, skincare advice, fashion trends, makeup guide Bangladesh',
  openGraph: { title: 'Blog | BELORELLA', description: 'Read the latest tips, trends, and news from BELORELLA.' },
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function Page() { return <BlogListPage />; }
