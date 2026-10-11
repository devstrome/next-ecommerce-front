'use client'
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiMail, FiPhone, FiMapPin, FiClock, FiSend, FiFacebook, FiInstagram, FiTwitter, FiYoutube, FiArrowUpRight, FiNavigation } from 'react-icons/fi';
import axios from 'axios';
import { resolveSocialLinks, SOCIAL_LINKS } from '../config/socialLinks';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const STORE_LOCATION = {
  latitude: 23.7979072937477,
  longitude: 90.38341171599906,
  name: 'BELORELLA',
  address: '200/1 North Ibrahimpur, Mushibari Road, Dhaka-1206',
};
const STORE_LOGO_URL = 'https://lh3.googleusercontent.com/pw/AP1GczPQ0Sb4QBNtv_cPtmf3dbmQtXytl7nJPyf50do6zqikDgUH4fhZvstwWhc6PA2cQBjF63rR1OB48OuaU_IZgtmhd5tMTj3pvHwCzDAZq7lndOUYGEme8avdEt21Evh9uYWo-UKb0dBFW2Mblp900tA=w945-h945-s-no-gm?authuser=0';
const CONTACT_MAP_URL = 'https://www.google.com/maps/embed?pb=!1m14!1m12!1m3!1d271.33110450500544!2d90.38341171599906!3d23.7979072937477!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!5e0!3m2!1sen!2sbd!4v1791496054381!5m2!1sen!2sbd';
const LEGACY_MAP_CENTER = '!2d90.399!3d23.750';
const uberRideUrl = new URL('https://m.uber.com/looking');
uberRideUrl.searchParams.set('pickup', 'my_location');
uberRideUrl.searchParams.set('drop[0]', JSON.stringify({
  latitude: STORE_LOCATION.latitude,
  longitude: STORE_LOCATION.longitude,
  addressLine1: STORE_LOCATION.name,
  addressLine2: STORE_LOCATION.address,
}));
if (process.env.NEXT_PUBLIC_UBER_CLIENT_ID) {
  uberRideUrl.searchParams.set('client_id', process.env.NEXT_PUBLIC_UBER_CLIENT_ID);
}
const PATHAO_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.pathao.user';
const PATHAO_APP_STORE_URL = 'https://apps.apple.com/app/pathao/id1201700952';

const openPathao = () => {
  if (typeof window === 'undefined') return;
  const userAgent = window.navigator.userAgent || '';
  if (/android/i.test(userAgent)) {
    const fallbackUrl = encodeURIComponent(PATHAO_PLAY_STORE_URL);
    window.location.href = `intent://#Intent;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;package=com.pathao.user;S.browser_fallback_url=${fallbackUrl};end`;
  } else if (/iphone|ipad|ipod/i.test(userAgent)) {
    window.location.href = PATHAO_APP_STORE_URL;
  } else {
    window.open('https://pathao.com/bike/', '_blank', 'noopener,noreferrer');
  }
};

const defaultSettings = {
  businessName: 'BELORELLA',
  email: 'info.belorella@gmail.com',
  phone: '01601-886367',
  address: '200/1 North Ibrahimpur, Mushibari Road, Dhaka-1206',
  mapUrl: CONTACT_MAP_URL,
  socialLinks: SOCIAL_LINKS,
  businessHours: {
    sunThu: '10:00 AM - 8:00 PM',
    friday: '3:00 PM - 8:00 PM',
    saturday: '10:00 AM - 8:00 PM'
  }
};

export default function ContactPageClient() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('contactSettings');
      if (stored) {
        const savedSettings = JSON.parse(stored);
        const savedMapUrl = String(savedSettings.mapUrl || '');
        const mapUrl = !savedMapUrl || savedMapUrl.includes(LEGACY_MAP_CENTER) ? CONTACT_MAP_URL : savedMapUrl;
        const nextSettings = {
          ...defaultSettings,
          ...savedSettings,
          mapUrl,
          socialLinks: resolveSocialLinks(savedSettings.socialLinks),
        };
        setSettings(nextSettings);
        if (JSON.stringify(nextSettings) !== JSON.stringify(savedSettings)) {
          localStorage.setItem('contactSettings', JSON.stringify(nextSettings));
        }
      }
    } catch {}
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');
    setSent(false);
    try {
      await axios.post(`${API_URI}/api/contact/submit`, form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-maybelline-pink to-maybelline-magenta text-pure-white py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-wide mb-3">Get In Touch</h1>
          <p className="text-pure-white/80 text-sm sm:text-base max-w-xl mx-auto">
            We would love to hear from you. Reach out to us for any inquiries, feedback, or support.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* Contact Info + Map Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Contact Information */}
          <div>
            <h2 className="text-xl font-bold text-black mb-6">Contact Information</h2>
            <div className="space-y-5">
              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-maybelline-light flex items-center justify-center flex-shrink-0">
                  <FiMail className="text-maybelline-pink" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">Email</p>
                  <a href={`mailto:${settings.email}`} className="text-sm text-gray-600 hover:text-maybelline-pink transition-colors">
                    {settings.email}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-maybelline-light flex items-center justify-center flex-shrink-0">
                  <FiPhone className="text-maybelline-pink" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">Phone</p>
                  <a href={`tel:${settings.phone.replace(/-/g, '')}`} className="text-sm text-gray-600 hover:text-maybelline-pink transition-colors">
                    {settings.phone}
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-maybelline-light flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="text-maybelline-pink" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">Address</p>
                  <p className="text-sm text-gray-600">
                    {settings.address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-maybelline-light flex items-center justify-center flex-shrink-0">
                  <FiClock className="text-maybelline-pink" size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">Business Hours</p>
                  <div className="text-sm text-gray-600 space-y-0.5">
                    <p>Sunday - Thursday: {settings.businessHours.sunThu}</p>
                    <p>Friday: {settings.businessHours.friday}</p>
                    <p>Saturday: {settings.businessHours.saturday}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="mt-6">
              <p className="text-sm font-semibold text-black mb-3">Follow Us</p>
              <div className="flex items-center gap-3">
                <a href={settings.socialLinks.facebook} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-maybelline-pink hover:text-pure-white transition-all">
                  <FiFacebook size={18} />
                </a>
                <a href={settings.socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-maybelline-pink hover:text-pure-white transition-all">
                  <FiInstagram size={18} />
                </a>
                <a href={settings.socialLinks.youtube} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-maybelline-pink hover:text-pure-white transition-all">
                  <FiYoutube size={18} />
                </a>
                <a href={settings.socialLinks.twitter} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-maybelline-pink hover:text-pure-white transition-all">
                  <FiTwitter size={18} />
                </a>
              </div>
            </div>
          </div>

          {/* Google Map */}
          <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-gray-200 shadow-sm lg:min-h-[440px]">
            <iframe
              src={settings.mapUrl}
              className="pointer-events-none absolute inset-0 h-full w-full"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              title="BELORELLA Store Location"
            />
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${STORE_LOCATION.latitude},${STORE_LOCATION.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-full flex-col items-center"
              aria-label="Open BELORELLA store location in Google Maps"
            >
              <span className="flex items-center gap-2 rounded-full border border-white bg-white px-3 py-2 shadow-lg transition hover:scale-105">
                <Image src={STORE_LOGO_URL} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-0.5" />
                <span className="text-left">
                  <span className="block text-xs font-bold uppercase tracking-wide text-black">BELORELLA</span>
                  <span className="block text-[10px] text-gray-600">Tap to open map</span>
                </span>
              </span>
              <FiMapPin className="-mt-1 text-maybelline-pink drop-shadow-md" size={32} fill="currentColor" stroke="white" strokeWidth={1.75} />
            </a>
          </div>

          <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:hidden">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-maybelline-light text-maybelline-pink"><FiNavigation size={16} /></span>
              <div>
                <p className="text-sm font-semibold text-black">Ride to our store</p>
                <p className="text-xs text-gray-500">Your destination is pinned in the ride link.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={uberRideUrl.toString()}
                className="flex min-h-12 items-center justify-between rounded-xl bg-black px-3.5 py-2.5 text-white transition hover:bg-gray-800"
              >
                <span><span className="block text-sm font-semibold">Uber</span><span className="block text-[10px] text-white/70">Open ride</span></span>
                <FiArrowUpRight size={16} />
              </a>
              <button
                type="button"
                onClick={openPathao}
                className="flex min-h-12 items-center justify-between rounded-xl bg-maybelline-pink px-3.5 py-2.5 text-white transition hover:bg-maybelline-magenta"
              >
                <span><span className="block text-sm font-semibold">Pathao</span><span className="block text-[10px] text-white/75">Open app</span></span>
                <FiArrowUpRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 sm:p-8 max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-black mb-6 text-center">Send Us a Message</h2>

          {sent && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 mb-6 text-sm">
              Your message has been sent successfully. We will get back to you soon!
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                <input
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                rows={5}
                placeholder="Write your message here..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent resize-none"
                required
              />
            </div>
            <div className="text-center">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex items-center gap-2 bg-maybelline-pink text-pure-white px-8 py-3 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <FiSend size={16} /> {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
