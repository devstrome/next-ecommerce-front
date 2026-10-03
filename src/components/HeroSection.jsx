'use client'
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight, FiArrowRight } from "react-icons/fi";

const defaultSlides = [
  {
    _id: "default-1",
    tag: "New Arrivals",
    title: "The New Collection",
    highlight: "Collection",
    subtitle: "Discover the season's defining looks — curated for the modern wardrobe.",
    cta: "Explore Now",
    link: "/products",
    bgImage: "",
    bgGradient: "from-[#F6F1EC] via-pure-white to-[#EFE7E0]",
    textColor: "#1A1A1A",
    highlightColor: "#DC143C",
  },
  {
    _id: "default-2",
    tag: "Best Sellers",
    title: "Timeless Beauty",
    highlight: "Beauty",
    subtitle: "Curated essentials for every occasion, chosen by thousands.",
    cta: "Shop Beauty",
    link: "/products",
    bgGradient: "from-cool-gray via-pure-white to-[#F6F1EC]",
    textColor: "#1A1A1A",
    highlightColor: "#DC143C",
  },
  {
    _id: "default-3",
    tag: "Premium Edit",
    title: "Luxury Redefined",
    highlight: "Redefined",
    subtitle: "Premium fashion & accessories for the discerning.",
    cta: "View Collection",
    link: "/products",
    bgGradient: "from-[#F1F1F1] via-pure-white to-maybelline-light",
    textColor: "#1A1A1A",
    highlightColor: "#DC143C",
  },
];

const AUTOPLAY_MS = 6000;
const pad = (n) => String(n).padStart(2, '0');

const HeroSection = () => {
  const [slides, setSlides] = useState(defaultSlides);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/hero-slides`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) setSlides(data);
        }
      } catch {
        // use defaults
      }
    };
    fetchSlides();
  }, []);

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);
  const goTo = (i) => setCurrent(i);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const timer = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(timer);
  }, [current, paused, next, slides.length]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  const slide = slides[current] || defaultSlides[0];
  const onImage = !!slide.bgImage;
  const hasMore = slides.length > 1;

  const renderTitle = (title, highlight) => {
    if (!highlight || !title || !title.includes(highlight)) return title;
    const idx = title.indexOf(highlight);
    const color = slide.highlightColor || '#DC143C';
    return (
      <>
        {title.slice(0, idx)}
        <em className="not-italic" style={{ color }}>{highlight}</em>
        {title.slice(idx + highlight.length)}
      </>
    );
  };

  return (
    <section
      className="group relative w-full overflow-hidden border-b border-black/10 bg-[#F6F1EC]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Media layer (Ken Burns on each slide change) ────── */}
      <div className="absolute inset-0" key={`media-${slide._id}`} aria-hidden="true">
        {onImage ? (
          <img
            src={slide.bgImage}
            alt=""
            className="w-full h-full object-cover object-center animate-hero-zoom"
          />
        ) : (
          <div className={`relative w-full h-full bg-gradient-to-br ${slide.bgGradient || 'from-[#F6F1EC] via-pure-white to-[#EFE7E0]'}`}>
            <span className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-maybelline-pink/10 blur-3xl" />
            <span className="absolute -bottom-32 left-1/4 w-[28rem] h-[28rem] rounded-full bg-maybelline-rose/10 blur-3xl" />
            <span className="absolute bottom-6 right-8 font-display italic text-8xl lg:text-9xl text-black/[0.05] select-none">
              B
            </span>
          </div>
        )}
      </div>

      {/* ── Readability scrims ──────────────────────────────── */}
      {onImage && (
        <>
          <div className="absolute inset-0 lg:hidden bg-gradient-to-t from-black/85 via-black/55 to-black/35" />
          <div className="absolute inset-0 hidden lg:block bg-gradient-to-r from-black/80 via-black/45 to-transparent" />
        </>
      )}

      {/* ── Content ─────────────────────────────────────────── */}
      <div className="relative min-h-[78vh] sm:min-h-[82vh] lg:min-h-[86vh] flex items-center">
        <div
          key={`content-${slide._id}`}
          className="w-full max-w-[1440px] mx-auto page-padding pt-12 pb-32 sm:pb-36 lg:pb-40 animate-fade-up"
        >
          <div className="max-w-2xl">
            {slide.tag && (
              <span
                className={`inline-flex items-center gap-2.5 mb-7 px-4 py-2 font-sans text-[10px] sm:text-[11px] font-semibold tracking-[0.28em] uppercase ${
                  onImage
                    ? 'border border-white/40 bg-white/10 text-white backdrop-blur-sm'
                    : 'border border-black/20 text-black/70'
                }`}
              >
                <span className={`block w-5 h-[1px] ${onImage ? 'bg-white/70' : 'bg-maybelline-pink'}`} />
                {slide.tag}
              </span>
            )}

            <h1
              className={`font-display font-medium text-[2.6rem] leading-[1.03] sm:text-6xl lg:text-7xl xl:text-[5.25rem] tracking-tight mb-6 ${
                onImage ? 'text-pure-white' : ''
              }`}
              style={onImage ? undefined : { color: slide.textColor || '#1A1A1A' }}
            >
              {renderTitle(slide.title, slide.highlight)}
            </h1>

            {slide.subtitle && (
              <p
                className={`font-sans text-sm sm:text-base lg:text-lg leading-relaxed max-w-lg mb-10 ${
                  onImage ? 'text-white/75' : 'text-dark-gray'
                }`}
              >
                {slide.subtitle}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={slide.link || '/products'}
                className={`group/cta inline-flex items-center gap-3 px-8 sm:px-10 py-4 font-sans text-[11px] font-semibold tracking-[0.22em] uppercase transition-colors duration-300 ${
                  onImage
                    ? 'bg-pure-white text-black hover:bg-maybelline-pink hover:text-pure-white'
                    : 'bg-black text-pure-white hover:bg-maybelline-pink'
                }`}
              >
                {slide.cta || 'Shop Now'}
                <FiArrowRight size={14} className="group-hover/cta:translate-x-1 transition-transform duration-300" />
              </Link>
              <Link
                href="/products"
                className={`inline-flex items-center px-8 sm:px-10 py-4 font-sans text-[11px] font-semibold tracking-[0.22em] uppercase border transition-colors duration-300 ${
                  onImage
                    ? 'border-white/50 text-white hover:bg-pure-white hover:text-black hover:border-pure-white'
                    : 'border-black/30 text-black hover:border-black'
                }`}
              >
                Browse All
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom controls: timeline tabs + arrows ─────────── */}
      {hasMore && (
        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-[1440px] mx-auto page-padding pb-6 sm:pb-8 flex items-center justify-between gap-6">
            {/* Timeline tabs (desktop) */}
            <div className="hidden sm:flex items-center gap-5 lg:gap-7">
              {slides.map((s, i) => (
                <button
                  key={s._id || i}
                  onClick={() => goTo(i)}
                  className="flex items-center gap-3"
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === current}
                >
                  <span
                    className={`font-sans text-[11px] tracking-[0.2em] transition-colors duration-300 ${
                      i === current
                        ? (onImage ? 'text-white' : 'text-black')
                        : (onImage ? 'text-white/40 hover:text-white/70' : 'text-black/35 hover:text-black/60')
                    }`}
                  >
                    {pad(i + 1)}
                  </span>
                  <span className={`relative block h-[2px] w-14 lg:w-20 transition-colors duration-300 ${onImage ? 'bg-white/25' : 'bg-black/15'}`}>
                    {i === current && (
                      <span
                        className="absolute left-0 top-0 h-full animate-hero-progress"
                        style={{
                          backgroundColor: onImage ? '#FFFFFF' : '#1A1A1A',
                          animationPlayState: paused ? 'paused' : 'running',
                        }}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>

            {/* Counter (mobile) */}
            <span className={`sm:hidden font-sans text-[11px] tracking-[0.25em] ${onImage ? 'text-white/70' : 'text-black/50'}`}>
              {pad(current + 1)} <span className="opacity-50">/ {pad(slides.length)}</span>
            </span>

            {/* Arrows */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={prev}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  onImage
                    ? 'border-white/40 text-white hover:bg-pure-white hover:text-black hover:border-pure-white'
                    : 'border-black/25 text-black hover:bg-black hover:text-pure-white hover:border-black'
                }`}
                aria-label="Previous slide"
              >
                <FiChevronLeft size={18} />
              </button>
              <button
                onClick={next}
                className={`w-11 h-11 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  onImage
                    ? 'border-white/40 text-white hover:bg-pure-white hover:text-black hover:border-pure-white'
                    : 'border-black/25 text-black hover:bg-black hover:text-pure-white hover:border-black'
                }`}
                aria-label="Next slide"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default HeroSection;
