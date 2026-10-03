'use client'
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const defaultSlides = [
  {
    _id: "default-1",
    tag: "New Arrivals",
    title: "New Collection",
    highlight: "Collection",
    subtitle: "Discover the season's defining looks",
    cta: "Explore Now",
    link: "/products?sort=newest",
    bgImage: "",
    bgGradient: "from-maybelline-light via-pure-white to-maybelline-rose/10",
    textColor: "#1A1A1A",
    highlightColor: "#DC143C",
  },
  {
    _id: "default-2",
    tag: "Best Sellers",
    title: "Timeless Beauty",
    highlight: "Beauty",
    subtitle: "Curated essentials for every occasion",
    cta: "Shop Beauty",
    link: "/products?category=makeup",
    bgImage: "",
    bgGradient: "from-cool-gray via-pure-white to-maybelline-light",
    textColor: "#1A1A1A",
    highlightColor: "#DC143C",
  },
  {
    _id: "default-3",
    tag: "Premium Edit",
    title: "Luxury Redefined",
    highlight: "Redefined",
    subtitle: "Premium fashion & accessories for the discerning",
    cta: "View Collection",
    link: "/products?category=fashion",
    bgImage: "",
    bgGradient: "from-maybelline-light via-pure-white to-cool-gray",
    textColor: "#1A1A1A",
    highlightColor: "#DC143C",
  },
];

const HeroSection = () => {
  const [slides, setSlides] = useState(defaultSlides);
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const fetchSlides = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URI}/api/hero-slides`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setSlides(data);
        }
      } catch {
        // use defaults
      }
    };
    fetchSlides();
  }, []);

  const goTo = useCallback((index) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent(index);
    setTimeout(() => setIsAnimating(false), 800);
  }, [isAnimating]);

  const next = useCallback(() => goTo((current + 1) % slides.length), [current, goTo, slides.length]);
  const prev = useCallback(() => goTo((current - 1 + slides.length) % slides.length), [current, goTo, slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  useEffect(() => {
    if (current >= slides.length) setCurrent(0);
  }, [slides.length, current]);

  const slide = slides[current];

  const renderTitle = (title, highlight) => {
    if (!highlight || !title || !title.includes(highlight)) return title;
    const idx = title.indexOf(highlight);
    const color = slide.highlightColor || '#DC143C';
    return (
      <>
        {title.slice(0, idx)}
        <span style={{ color }}>{highlight}</span>
        {title.slice(idx + highlight.length)}
      </>
    );
  };

  const hasBgImage = !!slide.bgImage;

  return (
    <section className="relative h-screen min-h-[600px] max-h-[900px] w-full overflow-hidden bg-pure-white">
      {hasBgImage ? (
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${slide.bgImage})` }}
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${slide.bgGradient || 'from-maybelline-light via-pure-white to-maybelline-rose/10'} transition-all duration-1000`} />
      )}

      <div
        className="absolute right-0 top-0 w-1/2 h-full transition-all duration-1000"
        style={{ background: hasBgImage ? 'transparent' : `linear-gradient(135deg, ${slide.highlightColor || '#DC143C'}10, transparent)` }}
      >
        {!hasBgImage && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-[90%] h-3/4 rounded-l-[100px] opacity-60 transition-all duration-1000"
            style={{ background: `radial-gradient(ellipse at center, ${slide.highlightColor || '#DC143C'}15 0%, transparent 70%)` }}
          />
        )}
      </div>

      <div className="relative h-full max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="flex items-center h-full">
          <div className="max-w-xl relative z-10" key={slide._id}>
            {slide.tag && (
              <p className="section-tag mb-4 animate-fade-up" style={{ color: slide.highlightColor || '#DC143C' }}>
                {slide.tag}
              </p>
            )}
            <h1
              className="font-heading text-display-sm sm:text-display-md md:text-display-lg lg:text-display-xl xl:text-display-2xl leading-tight mb-6 animate-fade-up"
              style={{ color: slide.textColor || '#1A1A1A' }}
            >
              {renderTitle(slide.title, slide.highlight)}
            </h1>
            <p className="font-sans text-base sm:text-lg text-dark-gray max-w-lg mb-10 animate-fade-up">
              {slide.subtitle}
            </p>
            <Link href={slide.link || '/products'} className="btn-primary inline-flex animate-fade-up">
              {slide.cta || 'Shop Now'}
            </Link>
          </div>
        </div>

        <button
          onClick={prev}
          className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-mid-gray hover:text-black hover:bg-cool-gray rounded-full transition-all duration-300"
          aria-label="Previous slide"
        >
          <FiChevronLeft size={24} />
        </button>
        <button
          onClick={next}
          className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-mid-gray hover:text-black hover:bg-cool-gray rounded-full transition-all duration-300"
          aria-label="Next slide"
        >
          <FiChevronRight size={24} />
        </button>

        <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-3">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-[3px] rounded-full transition-all duration-500 ${
                i === current
                  ? "w-10"
                  : "w-6 bg-black/20 hover:bg-black/40"
              }`}
              style={i === current ? { backgroundColor: slide.highlightColor || '#DC143C' } : undefined}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
