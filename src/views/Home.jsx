'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { FiArrowRight, FiStar } from 'react-icons/fi';
import HeroSection from '../components/HeroSection';
import Slider from '../components/Slider';
import ProductCard from '../components/ProductCard';
import ProductCartModal from '../components/ProductCartModal';
import NewsletterSubscribe from '../components/NewsletterSubscribe';
import PopupAd from '../components/PopupAd';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const MARQUEE_ITEMS = [
  'Free Shipping over BDT 2,500',
  '100% Authentic Products',
  'New Drops Every Week',
  'Nationwide Delivery',
  'Easy 7-Day Returns',
  'Dedicated Customer Care',
];

const SectionHeading = ({ index, tag, title, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-10 sm:mb-14">
    <div>
      <div className="flex items-center gap-4 mb-5">
        <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-maybelline-pink">
          {index}
        </span>
        <span className="block w-8 h-[1px] bg-black/20" />
        <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-dark-gray/70">
          {tag}
        </span>
      </div>
      <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl leading-tight text-black">
        {title}
      </h2>
    </div>
    {action}
  </div>
);

const ViewAllLink = ({ href = '/products', label = 'View All' }) => (
  <Link
    href={href}
    className="group inline-flex items-center gap-2 font-sans text-[11px] font-semibold tracking-[0.22em] uppercase text-black border-b border-black/25 pb-1 hover:border-maybelline-pink hover:text-maybelline-pink transition-colors duration-300 shrink-0"
  >
    {label}
    <FiArrowRight size={13} className="group-hover:translate-x-1 transition-transform duration-300" />
  </Link>
);

function Home() {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [newArrivals, setNewArrivals] = useState([]);
  const [newLoading, setNewLoading] = useState(true);
  const [topRated, setTopRated] = useState([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);
  const [cartModalProductId, setCartModalProductId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_URI}/api/categories/tree`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data.filter((c) => c.isActive !== false));
        }
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_URI}/api/products`, { params: { limit: 8 } });
        if (Array.isArray(data)) setNewArrivals(data);
      } catch (err) {
        console.error('Error fetching new arrivals:', err);
      } finally {
        setNewLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get(`${API_URI}/api/topratedslides`);
        if (Array.isArray(data)) setTopRated(data);
      } catch (err) {
        console.error('Error fetching best sellers:', err);
      } finally {
        setTopRatedLoading(false);
      }
    };
    load();
  }, []);

  const salePrice = (item) =>
    item.discountPrice && item.discountPrice < (item.price ?? item.mainPrice)
      ? item.discountPrice
      : (item.price ?? item.mainPrice);
  const originalPrice = (item) => item.price ?? item.mainPrice;

  return (
    <div className="bg-pure-white">
      <HeroSection />

      {/* ─── MARQUEE ────────────────────────────────────── */}
      <div className="bg-black text-pure-white overflow-hidden py-3.5 select-none">
        <div className="flex w-max animate-marquee">
          {[0, 1].map((half) => (
            <div key={half} className="flex items-center shrink-0">
              {MARQUEE_ITEMS.map((item) => (
                <span key={`${half}-${item}`} className="flex items-center">
                  <span className="font-sans text-[10px] sm:text-[11px] font-medium tracking-[0.25em] uppercase whitespace-nowrap px-6 sm:px-8">
                    {item}
                  </span>
                  <span className="text-maybelline-pink text-[8px]">◆</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ─── CATEGORY INDEX ─────────────────────────────── */}
      {(categoriesLoading || categories.length > 0) && (
        <section className="section-padding">
          <div className="max-w-[1440px] mx-auto page-padding">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-20 border-t border-black/10">
              <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start">
                <div className="flex items-center gap-4 mb-5">
                  <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-maybelline-pink">
                    § 01
                  </span>
                  <span className="block w-8 h-[1px] bg-black/20" />
                  <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-dark-gray/70">
                    The Departments
                  </span>
                </div>
                <h2 className="font-display font-medium text-4xl sm:text-5xl leading-[1.05] text-black mb-6">
                  Shop by<br />Category
                </h2>
                <p className="font-sans text-sm text-dark-gray/70 leading-relaxed max-w-xs mb-8">
                  From colour-drenched makeup to finishing touches — the full index of
                  everything we carry, department by department.
                </p>
                <ViewAllLink href="/products" label="Browse the Store" />
              </div>

              <div className="lg:col-span-8 border-t border-black/10 lg:border-t-0">
                {categoriesLoading ? (
                  [...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-6 py-7 border-b border-black/10">
                      <span className="font-sans text-xs text-mid-gray/50 tracking-widest">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="h-7 w-52 shimmer" />
                    </div>
                  ))
                ) : (
                  categories.slice(0, 8).map((cat, i) => (
                    <Link
                      key={cat._id}
                      href={`/products?category=${encodeURIComponent(cat.slug || cat.name)}`}
                      className="group grid grid-cols-[2.5rem_1fr_auto] items-center gap-4 sm:gap-6 py-6 sm:py-7 border-b border-black/10 hover:bg-[#FBF9F7] transition-colors duration-300 -mx-4 px-4"
                    >
                      <span className="font-sans text-xs text-mid-gray tracking-widest">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-display text-2xl sm:text-3xl lg:text-[2.1rem] leading-tight text-black group-hover:text-maybelline-pink transition-colors duration-300 truncate">
                          {cat.name}
                        </h3>
                        {cat.children && cat.children.length > 0 && (
                          <p className="mt-1.5 font-sans text-[11px] sm:text-xs text-dark-gray/60 tracking-wide truncate">
                            {cat.children.map((child) => child.name).join('  ·  ')}
                          </p>
                        )}
                      </div>
                      <FiArrowRight
                        size={18}
                        className="text-mid-gray opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-maybelline-pink transition-all duration-300"
                      />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ─── NEW ARRIVALS ───────────────────────────────── */}
      {(newLoading || newArrivals.length > 0) && (
        <section className="pb-16 sm:pb-20 lg:pb-24">
          <div className="max-w-[1440px] mx-auto page-padding">
            <SectionHeading
              index="§ 02"
              tag="Just In"
              title="New Arrivals"
              action={<ViewAllLink href="/products" label="Shop New In" />}
            />
            {newLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="aspect-[3/4] shimmer" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3.5 w-3/4 shimmer" />
                      <div className="h-3.5 w-1/3 shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-10">
                {newArrivals.slice(0, 8).map((product) => (
                  <ProductCard
                    key={product._id}
                    Data={product}
                    onAddToCart={(id) => setCartModalProductId(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── CAMPAIGN BAND ──────────────────────────────── */}
      <section className="bg-black text-pure-white">
        <div className="max-w-[1440px] mx-auto page-padding py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-end">
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="block w-10 h-[1px] bg-maybelline-pink" />
                <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-maybelline-pink">
                  Limited Edition
                </span>
              </div>
              <h2 className="font-display font-medium text-4xl sm:text-5xl lg:text-6xl leading-[1.04] mb-6">
                The Spring Edit —<br />
                <em className="text-maybelline-pink">fresh essentials</em>, curated.
              </h2>
              <p className="font-sans text-sm sm:text-base text-white/60 leading-relaxed max-w-lg mb-9">
                Lightweight textures, vibrant hues and the season&apos;s most-wanted shades.
                A tightly edited selection, refreshed every week.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/products" className="btn-primary">Shop the Edit</Link>
                <Link href="/products" className="btn-outline-light">View Sale</Link>
              </div>
            </div>
            <div className="hidden lg:block border-l border-white/15 pl-10">
              <p className="font-display italic text-2xl xl:text-3xl leading-snug text-white/85">
                &ldquo;Style is a way to say who you are<br />without having to speak.&rdquo;
              </p>
              <p className="mt-5 font-sans text-[11px] tracking-[0.25em] uppercase text-white/40">
                — The Belorella Journal
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BEST SELLERS ───────────────────────────────── */}
      {(!topRatedLoading && topRated.length > 0) && (
        <section className="section-padding">
          <div className="max-w-[1440px] mx-auto page-padding">
            <SectionHeading
              index="§ 03"
              tag="Customer Favorites"
              title="Best Sellers"
              action={<ViewAllLink href="/products" label="Shop Best Sellers" />}
            />
            <div className="flex gap-5 overflow-x-auto snap-x pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
              {topRated.slice(0, 10).map((slide) => (
                <Link
                  key={slide._id}
                  href={`/products/${slide.productId}`}
                  className="group snap-start shrink-0 w-[70%] sm:w-[46%] md:w-[31%] lg:w-[23%]"
                >
                  <div className="relative aspect-[3/4] bg-[#F7F5F3] overflow-hidden">
                    <img
                      src={slide.imageUrl}
                      alt={slide.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                    {slide.mainBadgeName && (
                      <span
                        className="absolute top-3 left-3 font-sans text-[10px] tracking-wider uppercase text-pure-white px-2.5 py-1"
                        style={{ backgroundColor: slide.mainBadgeColor || '#DC143C' }}
                      >
                        {slide.mainBadgeName}
                      </span>
                    )}
                    {slide.rating > 0 && (
                      <span className="absolute top-3 right-3 flex items-center gap-1 font-sans text-[11px] text-black bg-pure-white/95 px-2 py-1">
                        <FiStar size={10} className="text-maybelline-pink" />
                        {Number(slide.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="pt-4">
                    <h3 className="font-display text-base sm:text-lg leading-snug text-black group-hover:text-maybelline-pink transition-colors duration-300 line-clamp-2">
                      {slide.name}
                    </h3>
                    <div className="mt-2 flex items-baseline gap-2.5">
                      <span className="font-sans text-sm font-semibold text-black">
                        BDT {salePrice(slide)}
                      </span>
                      {salePrice(slide) !== originalPrice(slide) && (
                        <span className="font-sans text-xs text-mid-gray line-through">
                          BDT {originalPrice(slide)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 font-sans text-[11px] text-dark-gray/60">
                      {slide.totalReviews || 0} review{(slide.totalReviews || 0) === 1 ? '' : 's'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── SPECIAL OFFERS ─────────────────────────────── */}
      <section className="pb-16 sm:pb-20 lg:pb-24">
        <div className="max-w-[1440px] mx-auto page-padding">
          <SectionHeading
            index="§ 04"
            tag="On Offer"
            title="Special Offers"
            action={<ViewAllLink href="/products" label="All Offers" />}
          />
          <Slider />
        </div>
      </section>

      {/* ─── BRAND STORY ────────────────────────────────── */}
      <section className="border-t border-black/10">
        <div className="max-w-[1440px] mx-auto page-padding py-16 sm:py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <div className="relative aspect-[4/5] bg-[#F6F1EC] flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="Belorella"
                className="w-40 h-40 md:w-48 md:h-48 object-contain mix-blend-multiply"
              />
              <span className="absolute top-6 left-6 font-sans text-[11px] tracking-[0.28em] uppercase text-black/40">
                Est. Bangladesh
              </span>
              <span className="absolute bottom-6 right-6 font-display italic text-5xl text-black/10">B</span>
            </div>
            <div>
              <div className="flex items-center gap-4 mb-6">
                <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-maybelline-pink">
                  § 05
                </span>
                <span className="block w-8 h-[1px] bg-black/20" />
                <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-dark-gray/70">
                  Our Story
                </span>
              </div>
              <h2 className="font-display font-medium text-4xl sm:text-5xl leading-[1.06] text-black mb-6">
                Where beauty meets <em className="text-maybelline-pink">confidence</em>
              </h2>
              <p className="font-sans text-sm sm:text-base text-dark-gray/80 leading-relaxed mb-6 max-w-lg">
                At Belorella, beauty is an expression of individuality. Our curated collections
                bring together the finest products from around the world — because you deserve
                nothing less than extraordinary.
              </p>
              <p className="font-sans text-sm sm:text-base text-dark-gray/80 leading-relaxed mb-9 max-w-lg">
                Every piece is selected by our editors, verified for authenticity, and delivered
                with care across Bangladesh.
              </p>
              <Link href="/about" className="group inline-flex items-center gap-3 bg-black text-pure-white px-8 py-4 font-sans text-[11px] font-semibold tracking-[0.22em] uppercase hover:bg-maybelline-pink transition-colors duration-300">
                About Us
                <FiArrowRight size={14} className="group-hover:translate-x-1 transition-transform duration-300" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EDITORIAL STATS ────────────────────────────── */}
      <section className="border-y border-black/10 bg-[#FBFAF9]">
        <div className="max-w-[1440px] mx-auto page-padding">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-black/10">
            {[
              { value: 'BDT 2,500+', label: 'Free shipping threshold' },
              { value: '100%', label: 'Authentic, verified products' },
              { value: '2–5 Days', label: 'Nationwide delivery' },
              { value: '24/7', label: 'Customer care, always on' },
            ].map((stat) => (
              <div key={stat.label} className="px-5 sm:px-8 py-10 sm:py-14 text-center">
                <p className="font-display text-2xl sm:text-3xl lg:text-4xl text-black mb-2.5">
                  {stat.value}
                </p>
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase text-dark-gray/60">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NEWSLETTER ─────────────────────────────────── */}
      <section className="bg-[#F6F1EC]">
        <div className="max-w-[720px] mx-auto page-padding py-16 sm:py-20 lg:py-24 text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="block w-8 h-[1px] bg-black/20" />
            <span className="font-sans text-[11px] font-semibold tracking-[0.28em] uppercase text-maybelline-pink">
              Stay Connected
            </span>
            <span className="block w-8 h-[1px] bg-black/20" />
          </div>
          <h2 className="font-display font-medium text-3xl sm:text-4xl lg:text-5xl leading-tight text-black mb-5">
            Join the Belorella World
          </h2>
          <p className="font-sans text-sm sm:text-base text-dark-gray/70 mb-9 max-w-md mx-auto">
            New arrivals, exclusive offers and beauty insights — delivered first to your inbox.
          </p>
          <NewsletterSubscribe source="home" />
        </div>
      </section>

      <PopupAd />
      <ProductCartModal
        productId={cartModalProductId}
        isOpen={!!cartModalProductId}
        onClose={() => setCartModalProductId(null)}
      />
    </div>
  );
}

export default Home;
