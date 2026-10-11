'use client'

import React, { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { FiArrowLeft, FiLock, FiSave } from 'react-icons/fi';

const API = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function AdminAccountSettings() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const changeField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage('');
    setError('');
  };

  const changePassword = async (event) => {
    event.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      setError('The new password and confirmation do not match.');
      return;
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await axios.post(`${API}/api/admin/me/password`, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(response.data?.message || 'Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (changeError) {
      setError(changeError.response?.data?.message || 'Could not update your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[#fafafa] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/dashboard/profile" className="mb-5 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-[#B1123B]">
          <FiArrowLeft /> Back to profile
        </Link>
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#B1123B] text-white"><FiLock size={20} /></span>
          <div>
            <h1 className="text-2xl font-semibold text-[#1b1b1b]">Account Settings</h1>
            <p className="text-sm text-gray-500">Update your admin account password</p>
          </div>
        </header>

        <form onSubmit={changePassword} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Change password</h2>
            <p className="mt-1 text-sm text-gray-500">Use at least 8 characters for your new password.</p>
          </div>
          <div className="space-y-5 p-6">
            {[
              ['currentPassword', 'Current password', 'current-password'],
              ['newPassword', 'New password', 'new-password'],
              ['confirmPassword', 'Confirm new password', 'new-password'],
            ].map(([name, label, autocomplete]) => (
              <label key={name} className="block text-sm font-medium text-gray-700">
                {label}
                <input name={name} type="password" required minLength={name === 'currentPassword' ? undefined : 8} autoComplete={autocomplete}
                  value={form[name]} onChange={changeField}
                  className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#B1123B] focus:ring-2 focus:ring-[#B1123B]/15" />
              </label>
            ))}
            {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end border-t border-gray-100 px-6 py-4">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[#B1123B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8f0e2f] disabled:cursor-not-allowed disabled:opacity-60">
              <FiSave /> {saving ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
