'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { FiArrowLeft, FiPlus } from 'react-icons/fi';
import SEOHead from '../../../../src/components/SEOHead';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

function FaqAccordion({ content }) {
  const [openIndex, setOpenIndex] = useState(null);

  const parseFaqItems = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    const items = [];
    const buttons = div.querySelectorAll('.faq-question, button');
    buttons.forEach((btn) => {
      const question = btn.textContent.replace('+', '').replace('-', '').trim();
      let answer = '';
      let next = btn.nextElementSibling;
      if (next && next.classList.contains('faq-answer')) {
        answer = next.innerHTML;
      } else {
        next = btn.parentElement.querySelector('.faq-answer');
        if (next) answer = next.innerHTML;
      }
      if (question) items.push({ question, answer });
    });
    return items;
  };

  const faqItems = parseFaqItems(content);

  if (faqItems.length === 0) {
    return <div className="prose prose-lg max-w-none text-dark-gray leading-relaxed" dangerouslySetInnerHTML={{ __html: content }} style={{ lineHeight: '1.8' }} />;
  }

  return (
    <div className="space-y-4">
      {faqItems.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-cool-gray overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
          >
            <span className="font-semibold text-black text-lg">{item.question}</span>
            <span className={`flex-shrink-0 w-8 h-8 rounded-full bg-maybelline-light flex items-center justify-center transition-transform duration-300 ${openIndex === i ? 'rotate-45' : ''}`}>
              <FiPlus size={18} className="text-maybelline-pink" />
            </span>
          </button>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: openIndex === i ? '300px' : '0' }}
          >
            <div className="px-6 pb-5 text-dark-gray leading-relaxed" dangerouslySetInnerHTML={{ __html: item.answer }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GenericContent({ content }) {
  return (
    <div
      className="prose prose-lg max-w-none text-dark-gray leading-relaxed"
      dangerouslySetInnerHTML={{ __html: content }}
      style={{ lineHeight: '1.8' }}
    />
  );
}

export default function HelpPageClient({ slug }) {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [allPages, setAllPages] = useState([]);

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
    if (slug) fetchPage();
    fetchAll();
  }, [slug]);

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

  return (
    <div className="min-h-screen bg-pure-white">
      <SEOHead
        title={page.seo?.metaTitle || `${page.title} | Belorella`}
        description={page.seo?.metaDescription || ''}
        keywords={page.seo?.metaKeywords}
      />

      <div className="bg-gradient-to-r from-black via-dark-gray to-maybelline-magenta text-pure-white py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-pure-white/60 hover:text-pure-white transition mb-4">
            <FiArrowLeft size={14} /> Home
          </Link>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">
            {page.icon} {page.title}
          </h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {slug === 'faq' ? (
          <FaqAccordion content={page.content} />
        ) : (
          <GenericContent content={page.content} />
        )}

        {allPages.length > 1 && (
          <div className="mt-12 pt-8 border-t border-cool-gray">
            <h3 className="font-heading text-lg font-bold text-black mb-4">Other Help Pages</h3>
            <div className="flex flex-wrap gap-3">
              {allPages.filter(p => p.slug !== slug).map((p) => (
                <Link
                  key={p.slug}
                  href={`/help/${p.slug}`}
                  className="px-4 py-2 border border-cool-gray rounded-lg text-sm text-dark-gray hover:text-maybelline-pink hover:border-maybelline-pink transition"
                >
                  {p.icon} {p.title}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
