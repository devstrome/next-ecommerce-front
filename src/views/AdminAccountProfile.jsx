'use client'

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FiCamera, FiSave, FiShield, FiUser } from 'react-icons/fi';
import { useAdmin } from '../context/AdminContext';

const API = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function AdminAccountProfile() {
  const { admin, updateAdminData } = useAdmin();
  const [form, setForm] = useState({ firstName: '', lastName: '', userName: '', email: '' });
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      firstName: admin?.firstName || '',
      lastName: admin?.lastName || '',
      userName: admin?.userName || '',
      email: admin?.email || '',
    });
  }, [admin]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  const changeField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setMessage('');
    setError('');
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value.trim()));
      if (imageFile) payload.append('image', imageFile);
      const response = await axios.patch(`${API}/api/admin/me`, payload);
      const updatedAdmin = response.data?.admin;
      if (!updatedAdmin) throw new Error('The server did not return the updated profile.');
      updateAdminData(updatedAdmin);
      setImageFile(null);
      setMessage('Your profile has been updated.');
    } catch (saveError) {
      setError(saveError.response?.data?.message || saveError.message || 'Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const avatar = previewUrl || admin?.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${admin?.firstName || ''} ${admin?.lastName || ''}`)}&background=B1123B&color=fff`;

  return (
    <main className="min-h-[calc(100vh-8rem)] bg-[#fafafa] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#B1123B] text-white"><FiUser size={21} /></span>
          <div>
            <h1 className="text-2xl font-semibold text-[#1b1b1b]">Admin Profile</h1>
            <p className="text-sm text-gray-500">Manage your account information</p>
          </div>
        </header>

        <form onSubmit={saveProfile} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="font-semibold text-gray-900">Personal information</h2>
            <p className="mt-1 text-sm text-gray-500">Changes are saved to your admin account.</p>
          </div>
          <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-4">
              <img src={avatar} alt="Admin profile" className="h-20 w-20 rounded-full border-2 border-[#e11d48] object-cover" />
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <FiCamera /> Change photo
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setImageFile(event.target.files?.[0] || null)} />
              </label>
              <span className="text-xs text-gray-500">PNG, JPG, or WebP</span>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                ['firstName', 'First name', 'text'],
                ['lastName', 'Last name', 'text'],
                ['userName', 'Username', 'text'],
                ['email', 'Email address', 'email'],
              ].map(([name, label, type]) => (
                <label key={name} className="block text-sm font-medium text-gray-700">
                  {label}
                  <input name={name} type={type} required value={form[name]} onChange={changeField} autoComplete={name === 'email' ? 'email' : 'off'}
                    className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-[#B1123B] focus:ring-2 focus:ring-[#B1123B]/15" />
                </label>
              ))}
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
              <FiShield className="text-[#B1123B]" />
              <span>{admin?.superAdmin ? 'Super administrator' : 'Administrator'}</span>
            </div>
            {message && <p role="status" className="text-sm text-emerald-700">{message}</p>}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
          <div className="flex justify-end border-t border-gray-100 px-6 py-4">
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-[#B1123B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#8f0e2f] disabled:cursor-not-allowed disabled:opacity-60">
              <FiSave /> {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
