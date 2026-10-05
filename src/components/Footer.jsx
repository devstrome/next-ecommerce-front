'use client'
import React from 'react';
import Link from 'next/link';
import { FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiMail, FiPhone, FiMapPin } from 'react-icons/fi';

const socialLinks = [
  { icon: <FiFacebook size={18} />, href: 'https://www.facebook.com/BELORELLA', label: 'Facebook' },
  { icon: <FiInstagram size={18} />, href: 'https://www.instagram.com/belorella.ig', label: 'Instagram' },
  { icon: <FiTwitter size={18} />, href: 'https://x.com/BELORELLAX', label: 'X' },
  { icon: <FiYoutube size={18} />, href: 'https://www.youtube.com/@BELORELLA', label: 'YouTube' },
];

export default function Footer() {
  return (
    <footer className="bg-black text-pure-white border-t-4 border-maybelline-pink">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <h3 className="font-heading text-xl tracking-[0.2em] uppercase font-bold mb-4 text-maybelline-pink">BELORELLA</h3>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              Your trusted destination for premium fashion and lifestyle products in Bangladesh.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full border border-gray-600 flex items-center justify-center text-gray-400 hover:text-pure-white hover:bg-maybelline-pink hover:border-maybelline-pink transition-all duration-200"
                  aria-label={s.label}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-maybelline-pink">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Products', href: '/products' },
                { label: 'About Us', href: '/about' },
                { label: 'Blog', href: '/blog' },
                { label: 'Contact Us', href: '/contactus' },
                { label: 'Wishlist', href: '/wishlist' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-maybelline-pink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-maybelline-pink">Help</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'FAQ', href: '/help/faq' },
                { label: 'Shipping Policy', href: '/help/shipping-policy' },
                { label: 'Return Policy', href: '/help/return-policy' },
                { label: 'Privacy Policy', href: '/help/privacy' },
                { label: 'Terms & Conditions', href: '/help/terms' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-gray-400 hover:text-maybelline-pink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4 text-maybelline-pink">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-2.5">
                <FiMapPin size={16} className="text-maybelline-pink mt-0.5 flex-shrink-0" />
                <span className="text-sm text-gray-400">North Ibrahimpur, Dhaka-1206</span>
              </li>
              <li className="flex items-start gap-2.5">
                <FiMail size={16} className="text-maybelline-pink mt-0.5 flex-shrink-0" />
                <a href="mailto:info.belorella@gmail.com" className="text-sm text-gray-400 hover:text-maybelline-pink transition-colors">
                  info.belorella@gmail.com
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <FiPhone size={16} className="text-maybelline-pink mt-0.5 flex-shrink-0" />
                <a href="tel:+8801601886367" className="text-sm text-gray-400 hover:text-maybelline-pink transition-colors">
                  01601-886367
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            &copy; {new Date().getFullYear()} BELORELLA. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            {socialLinks.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-maybelline-pink transition-colors"
                aria-label={s.label}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
