'use client'
import React, { useState } from 'react';
import axios from 'axios';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function NewsletterSubscribe({ source = 'home', compact = false }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage('');
    setIsError(false);

    try {
      const res = await axios.post(`${API_URI}/api/subscribers/subscribe`, {
        email,
        source,
      });
      setMessage(res.data.message || 'Subscribed successfully!');
      setEmail('');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div>
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email address"
            required
            className="flex-1 px-5 py-3 bg-pure-white border border-cool-gray text-black placeholder:text-dark-gray/40 font-sans text-sm focus:outline-none focus:border-maybelline-pink transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary whitespace-nowrap disabled:opacity-50"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </form>
        {message && (
          <p className={`mt-3 text-sm text-center ${isError ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your email address"
          required
          className="flex-1 px-5 py-3 bg-pure-white border border-cool-gray text-black placeholder:text-dark-gray/40 font-sans text-sm focus:outline-none focus:border-maybelline-pink transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-primary whitespace-nowrap disabled:opacity-50"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      {message && (
        <p className={`mt-3 text-sm text-center ${isError ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}
    </div>
  );
}
