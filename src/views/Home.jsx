'use client'
import React, { useState, useEffect } from 'react';
import HeroSection from "../components/HeroSection";
import Slider from "../components/Slider";
import axios from 'axios';
import Link from "next/link";
import { FiArrowRight, FiTruck, FiShield, FiHeadphones, FiStar } from 'react-icons/fi';
import PopupAd from '../components/PopupAd';
import NewsletterSubscribe from '../components/NewsletterSubscribe';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

function Home() {
  const [topRatedSlides, setTopRatedSlides] = useState([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const fetchTopRatedSlides = async () => {
      try {
        const response = await axios.get(`${API_URI}/api/topratedslides`);
        setTopRatedSlides(response.data);
      } catch (error) {
        console.error('Error fetching top rated slides:', error);
      } finally {
        setTopRatedLoading(false);
      }
    };
    fetchTopRatedSlides();
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URI}/api/categories/tree`);
        const data = await res.json();
        const active = data.filter(c => c.isActive !== false);
        setCategories(active);
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    };
    fetchCategories();
  }, []);

  return (
    <div className="bg-pure-white">
      <HeroSection />

      {/* ─── CATEGORY GRID ─────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-[1440px] mx-auto page-padding">
          <div className="text-center mb-12 sm:mb-16">
            <p className="section-tag mb-4">Collections</p>
            <h2 className="section-title">Shop by Category</h2>
            <div className="w-16 h-[1px] bg-maybelline-pink mx-auto mt-6" />
          </div>
          {categoriesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="card flex flex-col items-center justify-center p-6 aspect-[4/5]">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-cool-gray shimmer mb-4" />
                  <div className="h-4 w-20 bg-cool-gray shimmer rounded mb-2" />
                  <div className="h-3 w-16 bg-cool-gray shimmer rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
              {categories.slice(0, 8).map((cat, i) => (
                <Link
                  key={cat._id}
                  href={`/products?category=${cat.slug}`}
                  className="card group flex flex-col items-center justify-center text-center p-6 aspect-[4/5]"
                >
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-pure-white flex items-center justify-center mb-4 shadow-sm group-hover:shadow-md transition-all duration-500 group-hover:scale-105 overflow-hidden">
                    {cat.image ? (
                      <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-sans font-bold text-xl text-maybelline-pink">{String(i + 1).padStart(2, '0')}</span>
                    )}
                  </div>
                  <h3 className="font-sans font-bold text-lg sm:text-xl text-black mb-1.5 group-hover:text-maybelline-pink transition-colors duration-300">{cat.name}</h3>
                  <p className="font-sans text-xs text-dark-gray/60 tracking-wide">
                    {cat.children ? `${cat.children.length} subcategories` : 'Browse'}
                  </p>
                </Link>
              ))}
            </div>
          )}
          <div className="text-center mt-10">
            <Link href="/products" className="btn-secondary text-xs gap-2">
              View All Products <FiArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── CAMPAIGN BANNER ───────────────────────────── */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="max-w-[1440px] mx-auto page-padding">
          <div className="text-center">
            <p className="section-tag mb-4">Limited Edition</p>
            <h2 className="font-sans font-bold text-display-md sm:text-display-lg lg:text-display-xl text-black leading-tight mb-6">
              The Spring Edit
            </h2>
            <p className="font-sans text-base text-dark-gray/70 max-w-md mx-auto mb-8">
              Discover our curated collection of fresh essentials for the season.
              From lightweight textures to vibrant hues — refresh your beauty routine.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/products?sort=newest" className="btn-primary">
                Shop the Edit
              </Link>
              <Link href="/products?sale=true" className="btn-secondary">
                View Sale
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── BEST SELLERS ──────────────────────────────── */}
      {topRatedSlides.length > 0 && (
        <section className="section-padding">
          <div className="max-w-[1440px] mx-auto page-padding">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-12 gap-4">
              <div>
                <p className="section-tag mb-4">Customer Favorites</p>
                <h2 className="section-title">Best Sellers</h2>
                <div className="w-16 h-[1px] bg-maybelline-pink mt-6" />
              </div>
              <Link href="/products" className="flex items-center gap-2 font-sans text-sm text-dark-gray hover:text-black transition-colors">
                View All <FiArrowRight size={14} />
              </Link>
            </div>

            {topRatedLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="card">
                    <div className="aspect-[3/4] bg-cool-gray shimmer" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 bg-cool-gray shimmer rounded" />
                      <div className="h-3 w-2/3 bg-cool-gray shimmer rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {topRatedSlides.slice(0, 8).map((slide) => (
                  <div key={slide._id} className="card group">
                    <div className="relative aspect-[3/4] flex items-center justify-center overflow-hidden">
                      <img
                        src={slide.imageUrl}
                        alt={slide.name}
                        className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                      {slide.mainBadgeName && (
                        <span className="absolute top-3 left-3 font-sans text-[10px] tracking-wider uppercase text-pure-white px-2.5 py-1" style={{ backgroundColor: slide.mainBadgeColor || '#B1123B' }}>
                          {slide.mainBadgeName}
                        </span>
                      )}
                      <div className="absolute top-3 right-3 flex items-center gap-1 font-sans text-xs text-pure-white bg-black/80 px-2 py-1">
                        <FiStar size={10} className="text-maybelline-pink" />
                        {slide.rating || 0}
                      </div>
                    </div>
                    <div className="p-4">
                      <Link href={`/products/${slide.productId}`}>
                        <h3 className="font-sans text-sm font-medium text-black line-clamp-2 leading-snug group-hover:text-maybelline-pink transition-colors duration-300">
                          {slide.name}
                        </h3>
                      </Link>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-sans text-sm font-semibold text-black">BDT {slide.price}</span>
                        {slide.discountPrice && slide.discountPrice < slide.price && (
                          <span className="font-sans text-xs text-dark-gray/60 line-through">BDT {slide.discountPrice}</span>
                        )}
                      </div>
                      <p className="font-sans text-xs text-dark-gray/60 mt-1.5">{slide.totalReviews || 0} reviews</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ─── SPECIAL OFFERS SLIDER ─────────────────────── */}
      <section className="section-padding">
        <div className="max-w-[1440px] mx-auto page-padding">
          <div className="text-center mb-12 sm:mb-16">
            <p className="section-tag mb-4">Featured</p>
            <h2 className="section-title">Special Offers</h2>
            <div className="w-16 h-[1px] bg-maybelline-pink mx-auto mt-6" />
          </div>
          <Slider />
        </div>
      </section>

      {/* ─── BRAND STORY ───────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-[1440px] mx-auto page-padding">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="aspect-[4/5] bg-gradient-to-br from-maybelline-light via-maybelline-light to-pure-white flex items-center justify-center overflow-hidden rounded-2xl">
              <img src="/logo.png" alt="Belorella" className="w-44 h-44 md:w-52 md:h-52 object-contain rounded-[35px] mix-blend-multiply" style={{ filter: 'drop-shadow(0 8px 24px rgba(220,20,60,0.15))' }} />
            </div>
            <div>
              <p className="section-tag mb-4">Our Story</p>
              <h2 className="font-sans font-bold text-display-sm sm:text-display-md lg:text-display-lg text-black leading-tight mb-6">
                Where Beauty Meets Confidence
              </h2>
              <p className="font-sans text-sm sm:text-base text-dark-gray/80 leading-relaxed mb-8 max-w-lg">
                At Belorella, we believe that beauty is an expression of individuality. 
                Our curated collections bring together the finest products from around the 
                world — because you deserve nothing less than extraordinary.
              </p>
              <Link href="/about" className="btn-primary text-xs gap-2">
                Learn More About Us <FiArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST BADGES ──────────────────────────────── */}
      <section className="section-padding">
        <div className="max-w-[1440px] mx-auto page-padding">
          <div className="text-center mb-12 sm:mb-16">
            <p className="section-tag mb-4">Why Belorella</p>
            <h2 className="section-title">The Belorella Experience</h2>
            <div className="w-16 h-[1px] bg-maybelline-pink mx-auto mt-6" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { icon: FiTruck, title: "Free Shipping", desc: "On orders over BDT 2,500. Fast & reliable delivery across Bangladesh." },
              { icon: FiShield, title: "Authentic Products", desc: "Every item is verified for quality and authenticity. Shop with confidence." },
              { icon: FiHeadphones, title: "Premium Support", desc: "Dedicated customer care team ready to assist you anytime." },
            ].map((item) => (
              <div key={item.title} className="text-center group">
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-pure-white flex items-center justify-center group-hover:bg-maybelline-pink transition-colors duration-500">
                  <item.icon size={22} className="text-black group-hover:text-pure-white transition-colors duration-500" />
                </div>
                <h3 className="font-sans font-bold text-xl text-black mb-2">{item.title}</h3>
                <p className="font-sans text-sm text-dark-gray/70 leading-relaxed max-w-xs mx-auto">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── NEWSLETTER ────────────────────────────────── */}
      <section className="py-16 sm:py-20 border-t border-cool-gray">
        <div className="max-w-[600px] mx-auto page-padding text-center">
          <p className="section-tag mb-4">Stay Connected</p>
          <h2 className="font-sans font-bold text-display-sm sm:text-display-md text-black mb-4">
            Join the Belorella World
          </h2>
          <p className="font-sans text-sm sm:text-base text-dark-gray/70 mb-8">
            Be the first to know about new arrivals, exclusive offers, and beauty insights.
          </p>
          <NewsletterSubscribe source="home" />
        </div>
      </section>

      <PopupAd />
    </div>
  );
}

export default Home;
