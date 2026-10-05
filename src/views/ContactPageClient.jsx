'use client'
import React, { useState, useEffect } from 'react';
import { FiMail, FiPhone, FiMapPin, FiClock, FiSend, FiFacebook, FiInstagram, FiTwitter, FiYoutube } from 'react-icons/fi';
import axios from 'axios';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const defaultSettings = {
  businessName: 'BELORELLA',
  email: 'info.belorella@gmail.com',
  phone: '01601-886367',
  address: '200/1 North Ibrahimpur, Mushibari Road, Dhaka-1206',
  mapUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.0!2d90.399!3d23.750!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8b33cffc3fb%3A0x0!2s200%2F1%20North%20Ibrahimpur%2C%20Mushibari%20Road%2C%20Dhaka-1206!5e0!3m2!1sen!2sbd!4v1',
  socialLinks: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    youtube: 'https://youtube.com',
    twitter: 'https://twitter.com'
  },
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
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
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
          <div className="relative rounded-xl overflow-hidden border border-gray-200 min-h-[400px]">
            <iframe
              src={settings.mapUrl}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: '400px' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="BELORELLA Store Location"
            />
            <a
              href="https://www.google.com/maps/search/200/1+North+Ibrahimpur+Mushibari+Road+Dhaka"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 z-10"
              aria-label="Open in Google Maps"
            />
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
