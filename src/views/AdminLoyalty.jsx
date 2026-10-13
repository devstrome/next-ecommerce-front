'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { FaGift, FaCoins, FaKey, FaCopy, FaPlus, FaSyncAlt, FaEdit, FaTrashAlt, FaCheck, FaTimes, FaSearch, FaUsers, FaEnvelope } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { formatBDT } from '../config/brand';

const API = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const adminHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('adminAccessToken') || '' : ''}`,
});

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, { ...options, headers: { ...adminHeaders(), ...(options.headers || {}) }, cache: 'no-store' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export default function AdminLoyalty() {
  const [settings, setSettings] = useState({ enabled: true, earnRatePercent: 1, maxRedeemPercent: 100 });
  const [giftCodes, setGiftCodes] = useState([]);
  const [loyaltyCustomers, setLoyaltyCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [tierForm, setTierForm] = useState({ tierName: 'Bronze', earnRatePercent: '1' });
  const [tierSaving, setTierSaving] = useState(false);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [digitalProducts, setDigitalProducts] = useState([]);
  const [digitalStock, setDigitalStock] = useState([]);
  const [giftForm, setGiftForm] = useState({ amountBDT: '', count: 1, expiresAt: '' });
  const [digitalForm, setDigitalForm] = useState({ productId: '', variantId: '', codes: '' });
  const [issuedCodes, setIssuedCodes] = useState([]);
  const [editingGiftId, setEditingGiftId] = useState(null);
  const [giftEditForm, setGiftEditForm] = useState({ amountBDT: '', expiresAt: '', code: '' });
  const [giftActionId, setGiftActionId] = useState(null);
  const [giftFilters, setGiftFilters] = useState({ search: '', minValue: '', maxValue: '', status: 'all' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsData, giftsData, productsData, stockData, customersData] = await Promise.all([
        apiRequest('/api/admin/loyalty/settings'),
        apiRequest('/api/admin/loyalty/gift-codes'),
        apiRequest('/api/admin/loyalty/digital-products'),
        apiRequest('/api/admin/loyalty/digital-codes'),
        apiRequest('/api/admin/loyalty/customers'),
      ]);
      setSettings(settingsData.settings || settings);
      setGiftCodes(giftsData.codes || []);
      setDigitalProducts(productsData.products || []);
      setDigitalStock(stockData.codes || []);
      setLoyaltyCustomers(customersData.customers || []);
    } catch (error) {
      toast.error(error.message || 'Could not load loyalty settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/loyalty/settings', { method: 'PATCH', body: JSON.stringify(settings) });
      setSettings(data.settings);
      toast.success('Loyalty settings saved');
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  const searchCustomers = async (event) => {
    event.preventDefault();
    setCustomersLoading(true);
    try {
      const data = await apiRequest(`/api/admin/loyalty/customers?search=${encodeURIComponent(customerSearch.trim())}`);
      setLoyaltyCustomers(data.customers || []);
      setSelectedCustomerIds([]);
    } catch (error) { toast.error(error.message || 'Could not search loyalty customers'); }
    finally { setCustomersLoading(false); }
  };

  const toggleCustomer = (userId) => {
    setSelectedCustomerIds((current) => current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]);
  };

  const toggleAllCustomers = () => {
    const visibleIds = loyaltyCustomers.map((customer) => customer.userId);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedCustomerIds.includes(id));
    setSelectedCustomerIds((current) => allSelected
      ? current.filter((id) => !visibleIds.includes(id))
      : [...new Set([...current, ...visibleIds])]);
  };

  const assignTier = async (event) => {
    event.preventDefault();
    if (!selectedCustomerIds.length) { toast.info('Select at least one loyalty customer'); return; }
    setTierSaving(true);
    try {
      const data = await apiRequest('/api/admin/loyalty/tiers', {
        method: 'POST',
        body: JSON.stringify({ ...tierForm, earnRatePercent: Number(tierForm.earnRatePercent), userIds: selectedCustomerIds }),
      });
      const assignedAt = new Date().toISOString();
      setLoyaltyCustomers((current) => current.map((customer) => selectedCustomerIds.includes(customer.userId)
        ? { ...customer, tierName: data.tier.tierName, earnRatePercent: data.tier.earnRatePercent, tierAssignedAt: assignedAt }
        : customer));
      setSelectedCustomerIds([]);
      if (data.emailFailures?.length) {
        toast.warning(`${data.assigned} tier(s) assigned; ${data.emailsSent} email(s) sent and ${data.emailFailures.length} failed`);
      } else {
        toast.success(`${data.assigned} customer(s) assigned to ${data.tier.tierName}; ${data.emailsSent} email(s) sent`);
      }
    } catch (error) { toast.error(error.message || 'Could not assign loyalty tier'); }
    finally { setTierSaving(false); }
  };

  const createGiftCodes = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/loyalty/gift-codes', {
        method: 'POST',
        body: JSON.stringify({ ...giftForm, expiresAt: giftForm.expiresAt || null }),
      });
      setIssuedCodes(data.codes || []);
      toast.success(`${data.codes?.length || 0} gift code(s) generated`);
      const latest = await apiRequest('/api/admin/loyalty/gift-codes');
      setGiftCodes(latest.codes || []);
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  const addDigitalCodes = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/loyalty/digital-codes', {
        method: 'POST', body: JSON.stringify(digitalForm),
      });
      toast.success(`${data.insertedCount || 0} digital code(s) added${data.skippedDuplicates ? `; ${data.skippedDuplicates} duplicate(s) skipped` : ''}`);
      setDigitalForm((current) => ({ ...current, codes: '' }));
      const stock = await apiRequest('/api/admin/loyalty/digital-codes');
      setDigitalStock(stock.codes || []);
    } catch (error) { toast.error(error.message); }
    finally { setSaving(false); }
  };

  const copyIssuedCodes = async () => {
    const text = issuedCodes.map((item) => `${item.code}\t${formatBDT(item.amountBDT)}${item.expiresAt ? `\tExpires ${new Date(item.expiresAt).toLocaleDateString()}` : ''}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast.success('Codes copied'); }
    catch { toast.error('Could not access clipboard'); }
  };

  const copyGiftCode = async (gift) => {
    if (!gift.code) {
      toast.info('This legacy code cannot be recovered. Replace it to create a new copyable code.');
      return;
    }
    try { await navigator.clipboard.writeText(gift.code); toast.success('Gift code copied'); }
    catch { toast.error('Could not access clipboard'); }
  };

  const copyActiveGiftCodes = async (source = giftCodes) => {
    const activeCodes = source.filter((gift) => getGiftStatus(gift) === 'active' && gift.code);
    if (!activeCodes.length) { toast.info('No retrievable active codes to copy'); return; }
    const text = activeCodes.map((gift) => `${gift.code}\t${formatBDT(gift.amountBDT)}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast.success(`${activeCodes.length} active code(s) copied`); }
    catch { toast.error('Could not access clipboard'); }
  };

  const beginGiftEdit = (gift) => {
    setEditingGiftId(String(gift._id));
    setGiftEditForm({
      amountBDT: String(gift.amountBDT ?? ''),
      expiresAt: gift.expiresAt ? new Date(gift.expiresAt).toISOString().slice(0, 10) : '',
      code: gift.code || '',
    });
  };

  const saveGiftEdit = async (giftId) => {
    setGiftActionId(giftId);
    try {
      const data = await apiRequest(`/api/admin/loyalty/gift-codes/${giftId}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...giftEditForm, expiresAt: giftEditForm.expiresAt || null }),
      });
      setGiftCodes((current) => current.map((gift) => String(gift._id) === String(giftId) ? { ...gift, ...data.giftCode, ...(data.code ? { code: data.code } : {}) } : gift));
      setEditingGiftId(null);
      toast.success('Gift code updated');
    } catch (error) { toast.error(error.message); }
    finally { setGiftActionId(null); }
  };

  const deleteGift = async (gift) => {
    if (!window.confirm(`Delete the active ${formatBDT(gift.amountBDT)} gift code ending ${gift.codeSuffix}? This cannot be undone.`)) return;
    setGiftActionId(String(gift._id));
    try {
      await apiRequest(`/api/admin/loyalty/gift-codes/${gift._id}`, { method: 'DELETE' });
      setGiftCodes((current) => current.filter((item) => String(item._id) !== String(gift._id)));
      if (editingGiftId === String(gift._id)) setEditingGiftId(null);
      toast.success('Gift code deleted');
    } catch (error) { toast.error(error.message); }
    finally { setGiftActionId(null); }
  };

  const replaceLegacyGift = async (gift) => {
    if (!window.confirm(`The original code ending ${gift.codeSuffix} is not recoverable. Replace it with a new code worth ${formatBDT(gift.amountBDT)}? The original code will stop working.`)) return;
    setGiftActionId(String(gift._id));
    try {
      const data = await apiRequest(`/api/admin/loyalty/gift-codes/${gift._id}/replace`, { method: 'POST' });
      const replacement = { ...data.giftCode, code: data.code };
      setGiftCodes((current) => current.map((item) => String(item._id) === String(gift._id) ? { ...item, ...replacement } : item));
      try {
        await navigator.clipboard.writeText(data.code);
        toast.success('Replacement created and copied. Save it now; the old code no longer works.');
      } catch {
        toast.success('Replacement created. It is now visible in the code column; copy and save it.');
      }
    } catch (error) { toast.error(error.message); }
    finally { setGiftActionId(null); }
  };

  const selectedProduct = digitalProducts.find((product) => String(product._id) === String(digitalForm.productId));
  const getGiftStatus = (gift) => gift.status === 'active' && gift.expiresAt && new Date(gift.expiresAt).getTime() <= Date.now()
    ? 'expired'
    : gift.status;
  const filteredGiftCodes = giftCodes.filter((gift) => {
    const search = giftFilters.search.trim().toLowerCase();
    if (search && ![gift.code, gift.codeSuffix, gift.batchId].some((value) => String(value || '').toLowerCase().includes(search))) return false;
    if (giftFilters.minValue !== '' && Number(gift.amountBDT) < Number(giftFilters.minValue)) return false;
    if (giftFilters.maxValue !== '' && Number(gift.amountBDT) > Number(giftFilters.maxValue)) return false;
    if (giftFilters.status !== 'all' && getGiftStatus(gift) !== giftFilters.status) return false;
    return true;
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B1123B]">Rewards & fulfillment</p><h1 className="mt-1 text-3xl font-bold text-gray-900">Loyalty and codes</h1><p className="mt-2 text-sm text-gray-600">Manage BDT rewards, one-time gift codes, and digital product fulfillment stock.</p></div>
        <button onClick={loadData} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50"><FaSyncAlt /> Refresh</button>
      </header>

      <form onSubmit={saveSettings} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-pink-50 p-3 text-[#B1123B]"><FaCoins /></span><div><h2 className="text-lg font-semibold">Purchase rewards</h2><p className="text-sm text-gray-500">Rewards are credited once when an online order is paid, or immediately for a POS sale.</p></div></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-gray-700">Earn rate (%)<input type="number" min="0" max="100" step="0.01" value={settings.earnRatePercent} onChange={(event) => setSettings({ ...settings, earnRatePercent: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Maximum redeem per order (%)<input type="number" min="0" max="100" step="1" value={settings.maxRedeemPercent} onChange={(event) => setSettings({ ...settings, maxRedeemPercent: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={Boolean(settings.enabled)} onChange={(event) => setSettings({ ...settings, enabled: event.target.checked })} className="h-4 w-4 accent-[#B1123B]" /> Enable BDT rewards and redemption</label>
          <button disabled={saving} className="self-end rounded-lg bg-[#B1123B] px-5 py-2.5 font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save settings'}</button>
        </div>
      </form>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-pink-50 p-3 text-[#B1123B]"><FaUsers /></span><div><h2 className="text-lg font-semibold">Customer loyalty tiers</h2><p className="text-sm text-gray-500">Select loyalty customers, set their BDT earning percentage, and email them when assigned. Bronze starts at 1%.</p></div></div>
        <form onSubmit={assignTier} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_180px_auto]">
          <label className="text-sm font-medium text-gray-700">Tier name<input maxLength={40} required value={tierForm.tierName} onChange={(event) => setTierForm((current) => ({ ...current, tierName: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <label className="text-sm font-medium text-gray-700">Earn percentage<input type="number" min="0" max="100" step="0.01" required value={tierForm.earnRatePercent} onChange={(event) => setTierForm((current) => ({ ...current, earnRatePercent: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
          <button disabled={tierSaving || !selectedCustomerIds.length} className="inline-flex items-center justify-center gap-2 self-end rounded-lg bg-[#B1123B] px-5 py-2.5 font-semibold text-white disabled:opacity-50"><FaEnvelope /> {tierSaving ? 'Assigning…' : `Assign & email (${selectedCustomerIds.length})`}</button>
        </form>
        <form onSubmit={searchCustomers} className="mb-3 flex gap-2">
          <label className="sr-only" htmlFor="loyalty-customer-search">Search loyalty customers</label>
          <input id="loyalty-customer-search" type="search" value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="Search customer name or email" className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          <button disabled={customersLoading} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"><FaSearch /> Search</button>
          <button type="button" disabled={customersLoading || !customerSearch} onClick={async () => { setCustomerSearch(''); setCustomersLoading(true); try { const data = await apiRequest('/api/admin/loyalty/customers'); setLoyaltyCustomers(data.customers || []); setSelectedCustomerIds([]); } catch (error) { toast.error(error.message); } finally { setCustomersLoading(false); } }} className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50">Clear</button>
        </form>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500"><tr><th className="w-12 px-3 py-3"><input type="checkbox" aria-label="Select all visible loyalty customers" checked={loyaltyCustomers.length > 0 && loyaltyCustomers.every((customer) => selectedCustomerIds.includes(customer.userId))} onChange={toggleAllCustomers} className="h-4 w-4 accent-[#B1123B]" /></th><th className="px-3 py-3">Customer</th><th>Balance</th><th>Tier</th><th>Earn rate</th></tr></thead>
            <tbody>{loyaltyCustomers.map((customer) => <tr key={customer.userId} className="border-t border-gray-100"><td className="px-3 py-3"><input type="checkbox" checked={selectedCustomerIds.includes(customer.userId)} onChange={() => toggleCustomer(customer.userId)} aria-label={`Select ${customer.fullName || customer.email}`} className="h-4 w-4 accent-[#B1123B]" /></td><td className="px-3 py-3"><p className="font-medium text-gray-900">{customer.fullName || 'Customer'}</p><p className="text-xs text-gray-500">{customer.email || 'No email address'}</p></td><td>{formatBDT(customer.balanceBDT)}</td><td>{customer.tierName || <span className="text-gray-400">Global default</span>}</td><td>{customer.earnRatePercent == null ? 'Global rate' : `${Number(customer.earnRatePercent)}%`}</td></tr>)}</tbody>
          </table>
          {customersLoading ? <p className="p-4 text-sm text-gray-500">Loading customers…</p> : !loyaltyCustomers.length && <p className="p-4 text-sm text-gray-500">No customers found.</p>}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-pink-50 p-3 text-[#B1123B]"><FaGift /></span><div><h2 className="text-lg font-semibold">Generate gift balance codes</h2><p className="text-sm text-gray-500">Each code adds its BDT value once to a customer account.</p></div></div>
          <form onSubmit={createGiftCodes} className="grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-gray-700">Value (BDT)<input type="number" min="0.01" step="0.01" required value={giftForm.amountBDT} onChange={(event) => setGiftForm({ ...giftForm, amountBDT: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-gray-700">Number of codes<input type="number" min="1" max="100" step="1" required value={giftForm.count} onChange={(event) => setGiftForm({ ...giftForm, count: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
            <label className="text-sm font-medium text-gray-700">Expiry (optional)<input type="date" value={giftForm.expiresAt} onChange={(event) => setGiftForm({ ...giftForm, expiresAt: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
            <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#B1123B] px-5 py-2.5 font-semibold text-white disabled:opacity-60 sm:col-span-3"><FaPlus /> Generate codes</button>
          </form>
          {!!issuedCodes.length && <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-amber-900">Generated gift codes</p><p className="text-xs text-amber-800">Codes stay available in admin history and are encrypted at rest.</p></div><button onClick={copyIssuedCodes} type="button" className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm"><FaCopy /> Copy all</button></div><div className="mt-3 max-h-44 space-y-1 overflow-auto font-mono text-sm">{issuedCodes.map((item) => <p key={item.code}>{item.code} <span className="font-sans text-gray-600">· {formatBDT(item.amountBDT)}</span></p>)}</div></div>}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-pink-50 p-3 text-[#B1123B]"><FaKey /></span><div><h2 className="text-lg font-semibold">Digital item code stock</h2><p className="text-sm text-gray-500">Add codes you purchase. A code is reserved at checkout and emailed after payment confirmation.</p></div></div>
          {digitalProducts.length ? <form onSubmit={addDigitalCodes} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Digital product<select required value={digitalForm.productId} onChange={(event) => setDigitalForm({ ...digitalForm, productId: event.target.value, variantId: '' })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Select a product</option>{digitalProducts.map((product) => <option key={product._id} value={product._id}>{product.name}{product.sku ? ` · ${product.sku}` : ''}</option>)}</select></label>
            {selectedProduct?.variants?.length > 0 && <label className="block text-sm font-medium text-gray-700">Variant (optional — blank codes work for any variant)<select value={digitalForm.variantId} onChange={(event) => setDigitalForm({ ...digitalForm, variantId: event.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"><option value="">Any variant</option>{selectedProduct.variants.map((variant) => <option key={variant._id} value={variant._id}>{variant.name}</option>)}</select></label>}
            <label className="block text-sm font-medium text-gray-700">Redemption codes<textarea required rows={5} value={digitalForm.codes} onChange={(event) => setDigitalForm({ ...digitalForm, codes: event.target.value })} placeholder="Paste one code per line. Codes are encrypted at rest." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm" /></label>
            <button disabled={saving || !digitalForm.productId} className="inline-flex items-center gap-2 rounded-lg bg-[#B1123B] px-5 py-2.5 font-semibold text-white disabled:opacity-60"><FaPlus /> Add digital codes</button>
          </form> : <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">Mark a product as digital in product creation/editing to manage its redemption code stock here.</p>}
        </section>
      </div>

      {digitalStock.length > 0 && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="mb-3 font-semibold">Digital code stock</h2><div className="overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead><tr className="border-b text-gray-500"><th className="py-3">Product</th><th>Variant</th><th>Available</th><th>Reserved</th><th>Sent</th></tr></thead><tbody>{Object.values(digitalStock.reduce((groups, row) => { const key = `${row.productId}:${row.variantId || ''}`; groups[key] ||= { ...row, available: 0, reserved: 0, sent: 0 }; groups[key][row.status] = row.count; return groups; }, {})).map((row) => <tr key={`${row.productId}:${row.variantId || ''}`} className="border-b last:border-0"><td className="py-3 font-medium">{row.productName}</td><td>{row.variantName || 'Any variant'}</td><td>{row.available || 0}</td><td>{row.reserved || 0}</td><td>{row.sent || 0}</td></tr>)}</tbody></table></div></section>}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Gift code history</h2><p className="text-sm text-gray-500">View, copy, edit, replace legacy codes, or delete active unused codes.</p></div>
          <div className="flex items-center gap-2"><span className="rounded-full bg-gray-100 px-3 py-1 text-sm">{filteredGiftCodes.length} shown / {giftCodes.length} recent</span><button onClick={() => setGiftFilters({ search: '', minValue: '', maxValue: '', status: 'all' })} type="button" className="rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50">Clear filters</button><button onClick={() => copyActiveGiftCodes(filteredGiftCodes)} type="button" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50"><FaCopy /> Copy filtered active</button></div>
        </div>
        <div className="mb-4 grid gap-3 rounded-xl bg-gray-50 p-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-medium text-gray-600">Search code<input type="search" value={giftFilters.search} onChange={(event) => setGiftFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Code, ending, or batch" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /></label>
          <label className="text-xs font-medium text-gray-600">Minimum value (BDT)<input type="number" min="0" step="0.01" value={giftFilters.minValue} onChange={(event) => setGiftFilters((current) => ({ ...current, minValue: event.target.value }))} placeholder="Any" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /></label>
          <label className="text-xs font-medium text-gray-600">Maximum value (BDT)<input type="number" min="0" step="0.01" value={giftFilters.maxValue} onChange={(event) => setGiftFilters((current) => ({ ...current, maxValue: event.target.value }))} placeholder="Any" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /></label>
          <label className="text-xs font-medium text-gray-600">Status<select value={giftFilters.status} onChange={(event) => setGiftFilters((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="active">Active</option><option value="redeemed">Redeemed</option><option value="expired">Expired</option><option value="revoked">Revoked</option></select></label>
        </div>
        {loading ? <p className="py-6 text-sm text-gray-500">Loading…</p> : <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead><tr className="border-b text-gray-500"><th className="py-3">Code</th><th>Value</th><th>Status</th><th>Redeemed by / POS</th><th>Expiry</th><th>Actions</th></tr></thead>
            <tbody>{filteredGiftCodes.map((gift) => {
              const giftId = String(gift._id);
              const isActive = gift.status === 'active';
              const effectiveStatus = getGiftStatus(gift);
              const isEditing = editingGiftId === giftId;
              const isBusy = giftActionId === giftId;
              return <React.Fragment key={giftId}>
                <tr className="border-b last:border-0">
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <span className="break-all font-mono font-medium">{gift.code || `••••-${gift.codeSuffix}`}</span>
                      <button onClick={() => copyGiftCode(gift)} type="button" disabled={!gift.code} aria-label={`Copy gift code ending ${gift.codeSuffix}`} title={gift.code ? 'Copy code' : 'Replace this legacy code to make a copyable code'} className="rounded-md border border-gray-200 p-1.5 text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"><FaCopy /></button>
                    </div>
                    {!gift.code && <span className="text-xs text-amber-700">Legacy record: original text was not saved.</span>}
                  </td>
                  <td>{formatBDT(gift.amountBDT)}</td>
                  <td><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${effectiveStatus === 'active' ? 'bg-emerald-50 text-emerald-700' : effectiveStatus === 'redeemed' ? 'bg-blue-50 text-blue-700' : effectiveStatus === 'expired' ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>{effectiveStatus}</span></td>
                  <td>
                    {gift.redeemedBy ? <div>{`${gift.redeemedBy.firstName || ''} ${gift.redeemedBy.lastName || ''} · ${gift.redeemedBy.email || ''}`}</div> : null}
                    {gift.redeemedPOSOrderNumber ? <div className="text-xs font-medium text-[#B1123B]">POS #{gift.redeemedPOSOrderNumber}</div> : null}
                    {!gift.redeemedBy && !gift.redeemedPOSOrderNumber ? '—' : null}
                  </td>
                  <td>{gift.expiresAt ? new Date(gift.expiresAt).toLocaleDateString() : 'Never'}</td>
                  <td><div className="flex flex-wrap items-center gap-2">
                    {isActive && !gift.code && <button disabled={isBusy} onClick={() => replaceLegacyGift(gift)} type="button" title="Replace the unrecoverable legacy code" className="rounded-lg border border-amber-300 px-2.5 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50 disabled:opacity-50">{isBusy ? 'Working…' : 'Replace code'}</button>}
                    {isActive && <button disabled={isBusy} onClick={() => isEditing ? setEditingGiftId(null) : beginGiftEdit(gift)} type="button" title="Edit amount, expiry, or code" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"><FaEdit /> Edit</button>}
                    {isActive && <button disabled={isBusy} onClick={() => deleteGift(gift)} type="button" title="Delete this active gift code" className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"><FaTrashAlt /> Delete</button>}
                    {!isActive && <span className="text-xs text-gray-400">Locked after redemption</span>}
                  </div></td>
                </tr>
                {isEditing && <tr className="border-b bg-gray-50"><td colSpan={6} className="p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="text-xs font-semibold text-gray-600">Value (BDT)<input type="number" min="0.01" step="0.01" value={giftEditForm.amountBDT} onChange={(event) => setGiftEditForm((current) => ({ ...current, amountBDT: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /></label>
                    <label className="text-xs font-semibold text-gray-600">Expiry date<input type="date" value={giftEditForm.expiresAt} onChange={(event) => setGiftEditForm((current) => ({ ...current, expiresAt: event.target.value }))} className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" /><span className="mt-1 block font-normal">Leave blank for no expiry.</span></label>
                    <label className="text-xs font-semibold text-gray-600">Code<input type="text" autoComplete="off" value={giftEditForm.code} onChange={(event) => setGiftEditForm((current) => ({ ...current, code: event.target.value }))} placeholder="Leave unchanged or enter a replacement" className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm" /><span className="mt-1 block font-normal">Changing it invalidates the old code.</span></label>
                  </div>
                  <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setEditingGiftId(null)} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"><FaTimes /> Cancel</button><button type="button" disabled={isBusy} onClick={() => saveGiftEdit(giftId)} className="inline-flex items-center gap-1 rounded-lg bg-[#B1123B] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><FaCheck /> {isBusy ? 'Saving…' : 'Save changes'}</button></div>
                </td></tr>}
              </React.Fragment>;
            })}</tbody>
          </table>
          {!giftCodes.length && <p className="py-5 text-sm text-gray-500">No gift codes have been generated yet.</p>}
          {!!giftCodes.length && !filteredGiftCodes.length && <p className="py-5 text-sm text-gray-500">No gift codes match these filters.</p>}
        </div>}
      </section>
    </div>
  );
}
