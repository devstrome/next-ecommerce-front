'use client'
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { FiArrowLeft, FiArrowUpRight, FiClock, FiMessageCircle, FiShield } from 'react-icons/fi';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

function HelpRichContent({ content, faq = false }) {
  return (
    <div
      className={`help-rich-content ${faq ? 'help-faq-content' : ''}`}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}

export default function HelpPageClient({ slug, initialPage = null, initialPages = [] }) {
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(!initialPage);
  const [error, setError] = useState('');
  const [allPages, setAllPages] = useState(initialPages);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const res = await axios.get(`${API_URI}/api/help-pages/${slug}`);
        setPage(res.data);
      } catch (err) {
        setError('Page not found');
      } finally {
        setLoading(false);
      }
    };
    const fetchAll = async () => {
      try {
        const res = await axios.get(`${API_URI}/api/help-pages`);
        setAllPages(res.data.filter(p => p.active));
      } catch {}
    };
    if (initialPage?.slug !== slug) fetchPage();
    if (!initialPages.length) fetchAll();
  }, [slug, initialPage, initialPages]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pure-white">
        <div className="text-dark-gray">Loading...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pure-white">
        <h1 className="text-2xl font-bold text-black mb-4">Page Not Found</h1>
        <Link href="/" className="text-maybelline-pink hover:underline flex items-center gap-2">
          <FiArrowLeft /> Go Home
        </Link>
      </div>
    );
  }

  const updatedAt = page.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Dhaka' })
    : '';

  return (
    <div className="min-h-screen bg-[#fbf8f7]">
      <header className="relative isolate overflow-hidden bg-[linear-gradient(120deg,#741025_0%,#a30f30_48%,#e31845_100%)] text-white">
        <div className="pointer-events-none absolute -right-16 -top-32 h-96 w-96 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-2 top-12 h-64 w-64 rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
          <Link href="/" className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 text-sm text-white/85 transition hover:bg-white/20 hover:text-white">
            <FiArrowLeft size={15} /> Back to BELORELLA
          </Link>
          <div className="flex items-start gap-4 sm:gap-5">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-2xl shadow-lg shadow-black/10 sm:h-16 sm:w-16 sm:text-3xl" aria-hidden="true">{page.icon || <FiShield />}</span>
            <div className="max-w-3xl">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[.28em] text-rose-100 sm:text-xs">BELORELLA · CUSTOMER CARE</p>
              <h1 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl md:text-5xl">{page.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/80 sm:text-base sm:leading-7">{page.seo?.metaDescription || 'Helpful information for shopping with BELORELLA in Bangladesh.'}</p>
              {updatedAt && <p className="mt-4 inline-flex items-center gap-2 text-xs text-white/65"><FiClock size={13} /> Updated {updatedAt}</p>}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-7 sm:px-6 sm:py-10 lg:grid-cols-[245px_minmax(0,1fr)] lg:gap-8 lg:px-8 lg:py-12">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <nav aria-label="Help pages" className="rounded-2xl border border-[#efe4e3] bg-white p-3 shadow-[0_10px_32px_rgba(72,22,34,.04)]">
            <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#a40d32]">Help center</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible">
              {allPages.map((item) => {
                const current = item.slug === slug;
                return <Link key={item.slug} href={`/help/${item.slug}`} aria-current={current ? 'page' : undefined}
                  className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition lg:w-full ${current ? 'bg-[#fff0f3] font-semibold text-[#a40d32]' : 'text-slate-600 hover:bg-[#faf5f5] hover:text-[#a40d32]'}`}>
                  <span className="text-base" aria-hidden="true">{item.icon || '•'}</span><span>{item.title}</span>
                </Link>;
              })}
            </div>
          </nav>
          <div className="hidden rounded-2xl bg-[#1b1718] p-5 text-white shadow-[0_14px_35px_rgba(35,10,17,.14)] lg:block">
            <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#e31845]/15 text-[#ff7894]"><FiMessageCircle size={19} /></span>
            <h2 className="text-base font-semibold">Need a hand?</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">Our team can help with an order, delivery, or account question.</p>
            <Link href="/contactus" className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#ff7894] transition hover:text-white">Contact us <FiArrowUpRight size={15} /></Link>
          </div>
        </aside>

        <article className="min-w-0 rounded-2xl border border-[#efe4e3] bg-white p-5 shadow-[0_14px_45px_rgba(72,22,34,.045)] sm:p-8 md:p-10">
          {page.content ? <HelpRichContent content={page.content} faq={slug === 'faq'} /> : (
            <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/50 p-6 text-sm leading-6 text-slate-600">This page is being updated. Please contact our team if you need help.</div>
          )}
          <div className="mt-9 flex flex-col gap-3 rounded-2xl bg-[#fff6f7] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><p className="font-semibold text-slate-900">Still need help?</p><p className="mt-1 text-sm text-slate-600">Send us your question and include your order number if you have one.</p></div>
            <Link href="/contactus" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a30f30] to-[#e31845] px-5 text-sm font-semibold text-white shadow-md shadow-rose-900/10 transition hover:-translate-y-0.5 hover:shadow-lg">Contact BELORELLA <FiArrowUpRight size={16} /></Link>
          </div>
        </article>
      </main>
    </div>
  );
}
