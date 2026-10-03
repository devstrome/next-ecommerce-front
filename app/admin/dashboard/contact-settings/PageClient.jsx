'use client'
import React, { useState, useEffect } from 'react';
import { getStorage } from '../../../../src/lib/storage';
import { FiSave, FiMapPin, FiPhone, FiMail, FiGlobe, FiClock } from 'react-icons/fi';

const defaultSettings = {
  businessName: 'Belorella',
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
  seoTitle: 'Contact Us - Belorella',
  seoDescription: 'Get in touch with Belorella. Reach out for inquiries, feedback, or support.',
  businessHours: {
    sunThu: '10:00 AM - 8:00 PM',
    friday: '3:00 PM - 8:00 PM',
    saturday: '10:00 AM - 8:00 PM'
  }
};

export default function ContactSettingsClient() {
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('contactSettings');
      if (stored) {
        setSettings({ ...defaultSettings, ...JSON.parse(stored) });
      }
    } catch {}
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      socialLinks: { ...prev.socialLinks, [name]: value }
    }));
  };

  const handleHoursChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      businessHours: { ...prev.businessHours, [name]: value }
    }));
  };

  const handleSave = () => {
    localStorage.setItem('contactSettings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputClass = 'w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-black">Contact Page Settings</h1>
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-2 bg-maybelline-pink text-pure-white px-6 py-2.5 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium"
        >
          <FiSave size={16} />
          {saved ? 'Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="space-y-8">
        {/* Business Info */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <FiGlobe className="text-maybelline-pink" /> Business Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Business Name</label>
              <input name="businessName" value={settings.businessName} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input name="email" type="email" value={settings.email} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input name="phone" value={settings.phone} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <input name="address" value={settings.address} onChange={handleChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Map URL */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <FiMapPin className="text-maybelline-pink" /> Map Embed URL
          </h2>
          <div>
            <label className={labelClass}>Google Maps Embed URL</label>
            <input name="mapUrl" value={settings.mapUrl} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        {/* Social Links */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <FiGlobe className="text-maybelline-pink" /> Social Links
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Facebook URL</label>
              <input name="facebook" value={settings.socialLinks.facebook} onChange={handleSocialChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Instagram URL</label>
              <input name="instagram" value={settings.socialLinks.instagram} onChange={handleSocialChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>YouTube URL</label>
              <input name="youtube" value={settings.socialLinks.youtube} onChange={handleSocialChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>X (Twitter) URL</label>
              <input name="twitter" value={settings.socialLinks.twitter} onChange={handleSocialChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4 flex items-center gap-2">
            <FiClock className="text-maybelline-pink" /> Business Hours
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Sunday - Thursday</label>
              <input name="sunThu" value={settings.businessHours.sunThu} onChange={handleHoursChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Friday</label>
              <input name="friday" value={settings.businessHours.friday} onChange={handleHoursChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Saturday</label>
              <input name="saturday" value={settings.businessHours.saturday} onChange={handleHoursChange} className={inputClass} />
            </div>
          </div>
        </div>

        {/* SEO */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-black mb-4">SEO Settings</h2>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Meta Title</label>
              <input name="seoTitle" value={settings.seoTitle} onChange={handleChange} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Meta Description</label>
              <textarea name="seoDescription" value={settings.seoDescription} onChange={handleChange} rows={3} className={inputClass} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
