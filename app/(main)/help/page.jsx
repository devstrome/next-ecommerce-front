import Link from 'next/link';
import { BRAND } from '../../../src/config/brand';

export const dynamic = 'force-dynamic';

const API_URI = (process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000').replace(/\/+$/, '');
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '');

export const metadata = {
  title: { absolute: `Help Center | ${BRAND.NAME}` },
  description: 'Find BELORELLA answers about orders, delivery, returns, privacy, and shopping support in Bangladesh.',
  alternates: { canonical: `${SITE_URL}/help` },
  openGraph: {
    type: 'website',
    url: `${SITE_URL}/help`,
    siteName: BRAND.NAME,
    title: `Help Center | ${BRAND.NAME}`,
    description: 'Answers about orders, delivery, returns, privacy, and shopping support.',
    images: [{ url: BRAND.EMAIL_LOGO_URL, alt: BRAND.NAME }],
  },
};

async function getHelpPages() {
  try {
    const response = await fetch(`${API_URI}/api/help-pages`, { next: { revalidate: 300 } });
    if (!response.ok) return [];
    const pages = await response.json();
    return Array.isArray(pages) ? pages.filter((page) => page.active && page.slug) : [];
  } catch {
    return [];
  }
}

export default async function HelpCenterPage() {
  const pages = await getHelpPages();
  return (
    <main className="min-h-[70vh] bg-[#fbf8f7]">
      <header className="bg-[linear-gradient(120deg,#741025_0%,#a30f30_48%,#e31845_100%)] text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-rose-100">BELORELLA · CUSTOMER CARE</p>
          <h1 className="mt-3 font-heading text-3xl font-semibold sm:text-5xl">How can we help?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-base sm:leading-7">
            Clear information about shopping, delivery, returns, and your account.
          </p>
        </div>
      </header>
      <section aria-label="Help topics" className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2 sm:px-6 sm:py-12 lg:grid-cols-3 lg:px-8">
        {pages.map((page) => (
          <Link key={page.slug} href={`/help/${page.slug}`} className="group rounded-2xl border border-[#efe4e3] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md sm:p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f3] text-xl text-[#a30f30]" aria-hidden="true">{page.icon || '•'}</span>
            <h2 className="mt-4 text-lg font-semibold text-slate-900 group-hover:text-[#a30f30]">{page.title}</h2>
            {page.seo?.metaDescription && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{page.seo.metaDescription}</p>}
            <span className="mt-4 inline-flex text-sm font-semibold text-[#a30f30]">Read more <span aria-hidden="true" className="ml-1">→</span></span>
          </Link>
        ))}
        {pages.length === 0 && <p className="rounded-xl border border-[#efe4e3] bg-white p-5 text-sm text-slate-600">Help pages are temporarily unavailable. Please try again soon.</p>}
      </section>
    </main>
  );
}
