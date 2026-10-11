'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FiEdit2, FiPlus, FiRefreshCw, FiSearch, FiTrash2 } from 'react-icons/fi';
import { createRegionRequest, deleteRegionRequest, fetchRegions, selectRegions, updateRegionRequest } from '../store/slices/regionSlice';

export default function RegionsAdmin() {
  const dispatch = useDispatch();
  const regions = useSelector(selectRegions);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      setLoading(true);
      await dispatch(fetchRegions()).unwrap();
    } catch (requestError) {
      setError(typeof requestError === 'string' ? requestError : 'Could not load regions');
    } finally { setLoading(false); }
  }, [dispatch]);

  useEffect(() => { refresh(); }, [refresh]);

  const filtered = useMemo(() => regions.filter((region) =>
    `${region.name} ${region.slug}`.toLowerCase().includes(search.trim().toLowerCase())), [regions, search]);

  const resetForm = () => { setForm({ name: '', description: '' }); setEditingId(null); };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (editingId) await dispatch(updateRegionRequest({ id: editingId, data: form })).unwrap();
      else await dispatch(createRegionRequest(form)).unwrap();
      resetForm();
    } catch (requestError) {
      setError(typeof requestError === 'string' ? requestError : 'Could not save region');
    } finally { setSaving(false); }
  };

  const edit = (region) => {
    setEditingId(region._id);
    setForm({ name: region.name, description: region.description || '' });
  };

  const toggle = async (region) => {
    setError('');
    try {
      await dispatch(updateRegionRequest({ id: region._id, data: { isActive: !region.isActive } })).unwrap();
    } catch (requestError) { setError(typeof requestError === 'string' ? requestError : 'Could not update region'); }
  };

  const remove = async (region) => {
    setError('');
    try {
      await dispatch(deleteRegionRequest(region._id)).unwrap();
    } catch (requestError) { setError(typeof requestError === 'string' ? requestError : 'Could not delete region'); }
  };

  return (
    <section className="p-4 sm:p-6 space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-black">Regions</h1>
          <p className="text-sm text-dark-gray">Manage the regions used by product configurations.</p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex items-center gap-2 px-4 py-2 border border-cool-gray bg-white text-black">
          <FiRefreshCw /> Refresh
        </button>
      </header>

      {error && <div role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-3 items-end bg-white border border-cool-gray p-4">
        <label className="text-sm text-dark-gray">Region name
          <input required maxLength={80} value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className="mt-1 w-full border border-cool-gray px-3 py-2 text-black" placeholder="e.g. Bangladesh" />
        </label>
        <label className="text-sm text-dark-gray">Description
          <input maxLength={240} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} className="mt-1 w-full border border-cool-gray px-3 py-2 text-black" placeholder="Optional" />
        </label>
        <button disabled={saving} className="inline-flex items-center justify-center gap-2 bg-maybelline-pink px-4 py-2 text-white disabled:opacity-50">
          {editingId ? <FiEdit2 /> : <FiPlus />} {saving ? 'Saving…' : editingId ? 'Save Region' : 'Add Region'}
        </button>
        {editingId && <button type="button" onClick={resetForm} className="px-4 py-2 border border-cool-gray text-black">Cancel</button>}
      </form>

      <div className="bg-white border border-cool-gray">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cool-gray p-4">
          <h2 className="font-semibold text-black">Region List ({filtered.length})</h2>
          <label className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="border border-cool-gray py-2 pl-9 pr-3" placeholder="Search regions" />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-dark-gray">
              <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Slug</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th></tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="4" className="p-6 text-center text-dark-gray">Loading regions…</td></tr> : filtered.map((region) => (
                <tr key={region._id} className="border-t border-cool-gray">
                  <td className="px-4 py-3 font-medium text-black"><div>{region.name}</div>{region.description && <div className="mt-1 text-xs text-dark-gray">{region.description}</div>}</td>
                  <td className="px-4 py-3 text-dark-gray">{region.slug}</td>
                  <td className="px-4 py-3"><button type="button" onClick={() => toggle(region)} className={region.isActive ? 'text-green-700' : 'text-mid-gray'}>{region.isActive ? 'Active' : 'Inactive'}</button></td>
                  <td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => edit(region)} className="inline-flex items-center gap-1 rounded bg-green-50 px-3 py-1.5 text-green-700"><FiEdit2 /> Edit</button><button type="button" onClick={() => remove(region)} className="inline-flex items-center gap-1 rounded bg-red-50 px-3 py-1.5 text-red-700"><FiTrash2 /> Delete</button></div></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-dark-gray">No regions found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
