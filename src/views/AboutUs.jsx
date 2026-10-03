'use client'
import React from 'react';
import Link from 'next/link';
import { FiHeart, FiStar, FiTruck, FiShield, FiUsers, FiTarget, FiFacebook, FiInstagram, FiTwitter, FiYoutube } from 'react-icons/fi';
import NewsletterSubscribe from '../components/NewsletterSubscribe';

export default function AboutUs() {
  return (
    <div className="min-h-screen bg-pure-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-black via-dark-gray to-maybelline-magenta text-pure-white py-20 md:py-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-wide">
            About Belorella
          </h1>
          <p className="text-lg md:text-xl text-pure-white/80 leading-relaxed max-w-2xl mx-auto">
            Your trusted destination for premium fashion and lifestyle products in Bangladesh
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="font-heading text-2xl md:text-3xl font-bold text-black mb-6">Our Story</h2>
            <p className="text-dark-gray leading-relaxed mb-4">
              Belorella was born from a passion for bringing quality fashion and beauty products to Bangladesh. We believe everyone deserves access to premium products without compromise.
            </p>
            <p className="text-dark-gray leading-relaxed">
              What started as a small venture has grown into a trusted e-commerce destination, serving thousands of satisfied customers across the country with genuine products and exceptional service.
            </p>
          </div>
          <div className="bg-gradient-to-br from-maybelline-light via-maybelline-light to-pure-white rounded-2xl p-8 md:p-12 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Belorella" className="w-44 h-44 md:w-52 md:h-52 object-contain rounded-2xl mix-blend-multiply" style={{ filter: 'drop-shadow(0 8px 24px rgba(220,20,60,0.15))' }} />
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 py-16 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="font-heading text-2xl md:text-3xl font-bold text-black text-center mb-12">Why Choose Us</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: <FiShield size={28} />, title: '100% Genuine', desc: 'Every product is authenticated and sourced directly from authorized distributors.' },
              { icon: <FiTruck size={28} />, title: 'Fast Delivery', desc: 'Quick and reliable delivery across Bangladesh with real-time order tracking.' },
              { icon: <FiHeart size={28} />, title: 'Customer First', desc: 'Your satisfaction is our priority. Easy returns and dedicated support.' },
              { icon: <FiStar size={28} />, title: 'Best Prices', desc: 'Premium products at competitive prices with regular deals and offers.' },
              { icon: <FiUsers size={28} />, title: 'Trusted Community', desc: 'Thousands of happy customers who keep coming back for quality.' },
              { icon: <FiTarget size={28} />, title: 'Our Mission', desc: 'To make premium fashion and beauty accessible to everyone in Bangladesh.' },
            ].map((item, i) => (
              <div key={i} className="bg-pure-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-maybelline-light rounded-lg flex items-center justify-center text-maybelline-pink mb-4">
                  {item.icon}
                </div>
                <h3 className="font-heading text-lg font-bold text-black mb-2">{item.title}</h3>
                <p className="text-dark-gray text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stay Connected */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-black mb-4">Stay Connected</h2>
        <p className="text-dark-gray mb-8 max-w-xl mx-auto">
          Be the first to know about new arrivals, exclusive offers, and beauty insights.
        </p>
        <NewsletterSubscribe source="about" />
        <div className="flex items-center justify-center gap-4 mt-10">
          {[
            { icon: <FiFacebook size={22} />, href: 'https://www.facebook.com/BELORELLA', label: 'Facebook', color: 'hover:bg-[#1877F2] hover:border-[#1877F2]' },
            { icon: <FiInstagram size={22} />, href: 'https://www.instagram.com/belorella.ig', label: 'Instagram', color: 'hover:bg-[#E4405F] hover:border-[#E4405F]' },
            { icon: <FiTwitter size={22} />, href: 'https://x.com/BELORELLAX', label: 'X', color: 'hover:bg-black hover:border-black' },
            { icon: <FiYoutube size={22} />, href: 'https://www.youtube.com/@BELORELLA', label: 'YouTube', color: 'hover:bg-[#FF0000] hover:border-[#FF0000]' },
          ].map((s) => (
            <a
              key={s.label}
              href={s.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-12 h-12 rounded-full border-2 border-cool-gray flex items-center justify-center text-dark-gray ${s.color} hover:text-pure-white transition-all duration-200`}
              aria-label={s.label}
            >
              {s.icon}
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 py-16 md:py-20 text-center">
        <h2 className="font-heading text-2xl md:text-3xl font-bold text-black mb-4">Start Shopping Today</h2>
        <p className="text-dark-gray mb-8 max-w-xl mx-auto">
          Discover our curated collection of fashion, beauty, and lifestyle products.
        </p>
        <Link
          href="/products"
          className="inline-block bg-maybelline-pink text-pure-white px-8 py-3 rounded-lg font-medium hover:bg-maybelline-magenta transition-colors"
        >
          Explore Products
        </Link>
      </section>
    </div>
  );
}
