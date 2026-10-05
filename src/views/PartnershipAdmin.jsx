'use client'
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { getStorage } from '../lib/storage';
import {
  FaArrowLeft, FaPlus, FaHandshake, FaCoins, FaChartPie, FaTrash,
  FaCheckCircle, FaClock, FaWallet
} from 'react-icons/fa';

const API = process.env.NEXT_PUBLIC_API_URI;

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-maybelline-pink bg-white text-gray-900 min-h-[44px]';
const labelCls = 'block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1';
const sectionTitleCls = 'text-base font-bold text-gray-900 flex items-center gap-2 mb-4 pb-2 border-b border-gray-200';
const btnPrimary =
  'px-4 py-2 rounded-md bg-maybelline-pink hover:bg-maybelline-magenta text-white text-sm font-semibold transition min-h-[44px] inline-flex items-center gap-2 disabled:opacity-50';

const round2 = (n) => Math.round(Number(n) * 100) / 100;
const fmt = (n) => `BDT ${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const periodLabel = (p) => {
  const [y, m] = String(p || '').split('-');
  return m && MONTHS[Number(m) - 1] ? `${MONTHS[Number(m) - 1]} ${y}` : p;
};

const PartnershipAdmin = () => {
  const router = useRouter();
  const headers = useMemo(() => {
    const token = getStorage('adminAccessToken') || getStorage('adminToken') || getStorage('accessToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const [state, setState] = useState({ totalAsset: 0, partners: [], contributions: [] });
  const [profits, setProfits] = useState([]);
  const [loading, setLoading] = useState(true);

  const [contribForm, setContribForm] = useState({ partnerId: '', amount: '', note: '' });
  const [partnerForm, setPartnerForm] = useState({ name: '', amount: '' });
  const [profitForm, setProfitForm] = useState({
    period: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    amount: '',
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [stateRes, profitsRes] = await Promise.all([
        axios.get(`${API}/api/partnership`, { headers }),
        axios.get(`${API}/api/partnership/profits`, { headers: headers2 }),
      ]);
      setState(stateRes.data);
      setProfits(Array.isArray(profitsRes.data) ? profitsRes.data : []);
      setContribForm((f) => ({
        ...f,
        partnerId: f.partnerId || stateRes.data.partners[0]?._id || '',
      }));
    } catch (e) {
      console.error('Partnership load failed:', e);
      toast.error('Failed to load partnership data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  // Live profit split preview (mirrors backend rounding)
  const preview = useMemo(() => {
    const amount = Number(profitForm.amount) || 0;
    if (amount <= 0 || state.totalAsset <= 0 || state.partners.length === 0) return null;
    const shares = state.partners.map((p) => ({
      name: p.name,
      percentage: p.percentage,
      amount: round2((amount * p.totalAmount) / state.totalAsset),
    }));
    const remainder = round2(amount - round2(shares.reduce((s, x) => s + x.amount, 0)));
    if (remainder !== 0) {
      let biggest = 0;
      shares.forEach((s, i) => { if (s.amount > shares[biggest].amount) biggest = i; });
      shares[biggest].amount = round2(shares[biggest].amount + remainder);
    }
    return { amount, shares };
  }, [profitForm.amount, state]);

  const addContribution = async (e) => {
    e.preventDefault();
    const amount = Number(contribForm.amount);
    if (!contribForm.partnerId) { toast.error('Select a partner'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter an amount greater than 0'); return; }
    try {
      const res = await axios.post(`${API}/api/partnership/contributions`, {
        partnerId: contribForm.partnerId,
        amount,
        note: contribForm.note,
      }, { headers });
      setState(res.data);
      setContribForm((f) => ({ ...f, amount: '', note: '' }));
      toast.success('Contribution added — percentages updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add contribution');
    }
  };

  const addPartner = async (e) => {
    e.preventDefault();
    if (!partnerForm.name.trim()) { toast.error('Enter partner name'); return; }
    try {
      const res = await axios.post(`${API}/api/partnership/partners`, {
        name: partnerForm.name.trim(),
        amount: Number(partnerForm.amount) || 0,
      }, { headers });
      setState(res.data);
      setPartnerForm({ name: '', amount: '' });
      toast.success('Partner added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add partner');
    }
  };

  const removePartner = async (p) => {
    if (!window.confirm(`Remove "${p.name}"? Their amount will leave the total asset.`)) return;
    try {
      const res = await axios.delete(`${API}/api/partnership/partners/${p._id}`, { headers });
      setState(res.data);
      toast.success('Partner removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove partner');
    }
  };

  const distributeProfit = async (e) => {
    e.preventDefault();
    const amount = Number(profitForm.amount);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(profitForm.period)) { toast.error('Pick a valid month'); return; }
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('Enter a profit amount greater than 0'); return; }
    if (state.totalAsset <= 0) { toast.error('Add partner assets first — total asset is 0'); return; }
    try {
      const res = await axios.post(`${API}/api/partnership/profits`, {
        period: profitForm.period,
        amount,
      }, { headers });
      setProfits((prev) => [res.data, ...prev]);
      setProfitForm((f) => ({ ...f, amount: '' }));
      toast.success(`${periodLabel(res.data.period)} profit distributed`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to distribute profit');
    }
  };

  const toggleStatus = async (profit) => {
    const next = profit.status === 'paid' ? 'pending' : 'paid';
    try {
      const res = await axios.patch(`${API}/api/partnership/profits/${profit._id}`, { status: next }, { headers });
      setProfits((prev) => prev.map((p) => (p._id === profit._id ? res.data : p)));
      toast.success(next === 'paid' ? 'Marked as paid' : 'Marked as pending');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const deleteProfit = async (profit) => {
    if (!window.confirm(`Delete the ${periodLabel(profit.period)} distribution?`)) return;
    try {
      await axios.delete(`${API}/api/partnership/profits/${profit._id}`, { headers });
      setProfits((prev) => prev.filter((p) => p._id !== profit._id));
      toast.success('Distribution deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const totalDistributed = profits.reduce((s, p) => s + (p.totalProfit || 0), 0);
  const pendingCount = profits.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 rounded hover:bg-white transition min-h-[44px] min-w-[44px] flex items-center justify-center" aria-label="Back">
              <FaArrowLeft className="text-gray-700" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FaHandshake className="text-maybelline-pink" /> Partnership Management
              </h1>
              <p className="text-sm text-gray-500">Partner assets, ownership percentages and monthly profit distribution</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500">
            <div className="animate-spin h-8 w-8 border-b-2 border-maybelline-pink mx-auto mb-3"></div>
            Loading partnership data...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow border-l-4 border-maybelline-pink p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FaWallet /> Total Asset</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{fmt(state.totalAsset)}</p>
              </div>
              <div className="bg-white rounded-lg shadow border-l-4 border-gray-900 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FaHandshake /> Partners</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{state.partners.length}</p>
              </div>
              <div className="bg-white rounded-lg shadow border-l-4 border-green-600 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FaCoins /> Profit Distributed</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{fmt(totalDistributed)}</p>
              </div>
              <div className="bg-white rounded-lg shadow border-l-4 border-amber-500 p-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><FaClock /> Pending Payouts</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{pendingCount}</p>
              </div>
            </div>

            {/* Partners + percentage */}
            <section className="bg-white rounded-lg shadow p-5">
              <h2 className={sectionTitleCls}><FaChartPie className="text-maybelline-pink" /> Partners &amp; Ownership</h2>
              {state.partners.length === 0 ? (
                <p className="text-sm text-gray-500">No partners yet — add one below.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {state.partners.map((p) => (
                    <div key={p._id} className="border border-gray-200 rounded-lg p-4 relative group">
                      <button
                        onClick={() => removePartner(p)}
                        className="absolute top-2 right-2 text-gray-300 hover:text-red-500 transition p-1"
                        aria-label={`Remove ${p.name}`}
                      >
                        <FaTrash size={12} />
                      </button>
                      <p className="font-semibold text-gray-900 truncate pr-6">{p.name}</p>
                      <p className="text-lg font-bold text-maybelline-pink mt-1">{p.percentage.toFixed(2)}%</p>
                      <p className="text-sm text-gray-600">{fmt(p.totalAmount)}</p>
                      <div className="h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-maybelline-pink to-maybelline-magenta rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, p.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Contribution + Add partner */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="bg-white rounded-lg shadow p-5">
                <h2 className={sectionTitleCls}><FaCoins className="text-maybelline-pink" /> Add Contribution</h2>
                <form onSubmit={addContribution} className="space-y-3">
                  <div>
                    <label className={labelCls}>Partner *</label>
                    <select
                      className={inputCls}
                      value={contribForm.partnerId}
                      onChange={(e) => setContribForm((f) => ({ ...f, partnerId: e.target.value }))}
                    >
                      <option value="">Select partner...</option>
                      {state.partners.map((p) => (
                        <option key={p._id} value={p._id}>{p.name} — currently {fmt(p.totalAmount)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Amount (BDT) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={inputCls}
                      value={contribForm.amount}
                      onChange={(e) => setContribForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="e.g. 20000"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Note (optional)</label>
                    <input
                      className={inputCls}
                      value={contribForm.note}
                      onChange={(e) => setContribForm((f) => ({ ...f, note: e.target.value }))}
                      placeholder="e.g. Cash investment"
                    />
                  </div>
                  <button type="submit" className={btnPrimary} disabled={state.partners.length === 0}>
                    <FaPlus size={12} /> Add Contribution
                  </button>
                </form>
              </section>

              <section className="bg-white rounded-lg shadow p-5">
                <h2 className={sectionTitleCls}><FaHandshake className="text-maybelline-pink" /> Add Partner</h2>
                <form onSubmit={addPartner} className="space-y-3">
                  <div>
                    <label className={labelCls}>Partner Name *</label>
                    <input
                      className={inputCls}
                      value={partnerForm.name}
                      onChange={(e) => setPartnerForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. A, B, C or full name"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Initial Amount (BDT)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className={inputCls}
                      value={partnerForm.amount}
                      onChange={(e) => setPartnerForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="e.g. 20000"
                    />
                  </div>
                  <button type="submit" className={btnPrimary}><FaPlus size={12} /> Add Partner</button>
                  <p className="text-xs text-gray-500">
                    Percentages = partner amount ÷ total asset. Adding amounts anywhere recalculates every partner&apos;s share automatically.
                  </p>
                </form>
              </section>
            </div>

            {/* Contribution history */}
            <section className="bg-white rounded-lg shadow p-5">
              <h2 className={sectionTitleCls}>Contribution History</h2>
              {state.contributions.length === 0 ? (
                <p className="text-sm text-gray-500">No contributions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Partner</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {state.contributions.map((c) => (
                        <tr key={c._id}>
                          <td className="px-3 py-2 text-gray-600">{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{c.partner}</td>
                          <td className="px-3 py-2 text-right text-green-700 font-semibold">{fmt(c.amount)}</td>
                          <td className="px-3 py-2 text-gray-500">{c.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Profit distribution */}
            <section className="bg-white rounded-lg shadow p-5">
              <h2 className={sectionTitleCls}><FaCoins className="text-maybelline-pink" /> Monthly Profit Distribution</h2>
              <form onSubmit={distributeProfit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end mb-5">
                <div>
                  <label className={labelCls}>Month *</label>
                  <input
                    type="month"
                    className={inputCls}
                    value={profitForm.period}
                    onChange={(e) => setProfitForm((f) => ({ ...f, period: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelCls}>Profit Amount (BDT) *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className={inputCls}
                    value={profitForm.amount}
                    onChange={(e) => setProfitForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <button type="submit" className={`${btnPrimary} w-full justify-center`} disabled={!preview}>
                    <FaChartPie size={13} /> Distribute
                  </button>
                </div>
              </form>

              {/* Live preview */}
              {preview && (
                <div className="bg-maybelline-light/50 border border-maybelline-pink/30 rounded-md p-4 mb-5">
                  <p className="text-xs font-semibold text-maybelline-magenta uppercase tracking-wide mb-2">
                    Preview — {periodLabel(profitForm.period)} split of {fmt(preview.amount)}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {preview.shares.map((s) => (
                      <div key={s.name} className="bg-white rounded-md p-3 border border-gray-200">
                        <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.percentage.toFixed(2)}%</p>
                        <p className="text-sm font-bold text-maybelline-pink">{fmt(s.amount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distributions table */}
              {profits.length === 0 ? (
                <p className="text-sm text-gray-500">No monthly distributions yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Profit</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Breakdown</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {profits.map((p) => (
                        <tr key={p._id}>
                          <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{periodLabel(p.period)}</td>
                          <td className="px-3 py-3 text-right font-semibold text-gray-900">{fmt(p.totalProfit)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {p.distributions.map((d) => (
                                <span key={`${p._id}-${d.name}`} className="inline-flex items-center gap-1 bg-cool-gray rounded px-2 py-0.5 text-xs text-gray-700">
                                  <span className="font-semibold">{d.name}</span>
                                  <span className="text-gray-500">{d.percentage.toFixed(1)}%</span>
                                  <span className="text-maybelline-pink font-semibold">{fmt(d.amount)}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                              p.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {p.status === 'paid' ? <FaCheckCircle size={10} /> : <FaClock size={10} />}
                              {p.status === 'paid' ? 'Paid' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => toggleStatus(p)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded border transition min-h-[36px] mr-2 ${
                                p.status === 'paid'
                                  ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                                  : 'border-green-600 text-green-700 hover:bg-green-50'
                              }`}
                            >
                              {p.status === 'paid' ? 'Mark pending' : 'Mark paid'}
                            </button>
                            <button
                              onClick={() => deleteProfit(p)}
                              className="text-xs font-semibold px-3 py-1.5 rounded border border-red-200 text-red-500 hover:bg-red-50 transition min-h-[36px]"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnershipAdmin;
