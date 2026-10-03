export const dynamic = 'force-dynamic';
import BlogListPage from './BlogListClient';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com';

export const metadata = {
  title: 'Blog',
  description: 'Read the latest tips, trends, and news from Belorella. Beauty guides, skincare advice, and fashion inspiration.',
  keywords: 'Belorella blog, beauty tips, skincare advice, fashion trends, makeup guide Bangladesh',
  openGraph: { title: 'Blog | Belorella', description: 'Read the latest tips, trends, and news from Belorella.' },
  alternates: { canonical: `${SITE_URL}/blog` },
};

export default function Page() { return <BlogListPage />; }
