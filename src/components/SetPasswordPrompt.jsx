'use client'
import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from '../context/UserContext';

// Shown right after a Google sign-up: the account has no real password yet,
// so the user picks one here (email is already verified by Google).
export default function SetPasswordPrompt() {
  const { mustSetPassword, setPassword, user } = useContext(UserContext);
  const [password, setPasswordValue] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [address, setAddressValue] = useState({ street: '', city: '', state: '', zipCode: '', country: 'Bangladesh' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPhone(user?.phoneNumber || '');
    setAddressValue({
      street: user?.address?.street || '',
      city: user?.address?.city || '',
      state: user?.address?.state || '',
      zipCode: user?.address?.zipCode || '',
      country: user?.address?.country || 'Bangladesh',
    });
  }, [user]);

  if (!mustSetPassword) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    if (!phone.trim()) return setError('Phone number is required');
    setSaving(true);
    try {
      await setPassword(password, {
        phoneNumber: phone.trim(),
        address: {
          street: address.street.trim(),
          city: address.city.trim(),
          state: address.state.trim(),
          zipCode: address.zipCode.trim(),
          country: address.country.trim() || 'Bangladesh',
        },
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to set password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-pure-white w-full max-w-md p-6 sm:p-8">
        <h2 className="font-heading text-2xl text-black mb-1">Set your password</h2>
        <p className="font-sans text-sm text-dark-gray mb-6">
          You signed up with Google{user?.email ? ` (${user.email})` : ''}. Your email is verified —
          choose a password so you can also log in with it directly.
        </p>
        <form className="space-y-4" onSubmit={submit}>
          <div>
            <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">Phone number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
              placeholder="01XXXXXXXXX"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">City</label>
              <input
                value={address.city}
                onChange={(e) => setAddressValue((a) => ({ ...a, city: e.target.value }))}
                className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
                placeholder="Dhaka"
              />
            </div>
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">Country</label>
              <input
                value={address.country}
                onChange={(e) => setAddressValue((a) => ({ ...a, country: e.target.value }))}
                className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
                placeholder="Bangladesh"
              />
            </div>
          </div>
          <div>
            <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">Address</label>
            <input
              value={address.street}
              onChange={(e) => setAddressValue((a) => ({ ...a, street: e.target.value }))}
              className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
              placeholder="House, road, area…"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">State</label>
              <input
                value={address.state}
                onChange={(e) => setAddressValue((a) => ({ ...a, state: e.target.value }))}
                className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
                placeholder="Dhaka"
              />
            </div>
            <div>
              <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">Postal code</label>
              <input
                value={address.zipCode}
                onChange={(e) => setAddressValue((a) => ({ ...a, zipCode: e.target.value }))}
                className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
                placeholder="1000"
              />
            </div>
          </div>
          <div>
            <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="w-full border border-cool-gray px-3 py-2.5 pr-10 font-sans text-sm focus:outline-none focus:border-black"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-gray"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label className="block font-sans text-xs uppercase tracking-wider text-dark-gray mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-cool-gray px-3 py-2.5 font-sans text-sm focus:outline-none focus:border-black"
              placeholder="Repeat password"
            />
          </div>
          {error && <p className="font-sans text-sm text-maybelline-pink">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-maybelline-pink text-pure-white font-sans text-sm font-semibold uppercase tracking-wider py-3 hover:bg-opacity-90 disabled:opacity-60 transition-opacity"
          >
            {saving ? 'Saving…' : 'Save password'}
          </button>
        </form>
      </div>
    </div>
  );
}
