'use client'
import React, { useCallback, useEffect, useState } from 'react';
import { FaGift, FaHistory, FaCoins } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { getStorage } from '../lib/storage';
import { formatBDT } from '../config/brand';

const API = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const sourceNames = {
  gift_code: 'Gift code redeemed', order_reward: 'Online order reward', order_redemption: 'Used at checkout',
  order_refund: 'Order amount restored', reward_reversal: 'Order reward reversed', pos_redemption: 'Used in store',
  pos_reward: 'In-store purchase reward', pos_refund: 'POS order refund', admin_adjustment: 'Account adjustment',
};

export default function UserLoyalty() {
  const [summary, setSummary] = useState({ balanceBDT: 0, transactions: [], tierName: '', earnRatePercent: 1, enabled: true });
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  const loadLoyalty = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/loyalty/me`, {
        headers: { Authorization: `Bearer ${getStorage('accessToken') || ''}` },
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not load loyalty balance');
      setSummary(data);
    } catch (error) {
      toast.error(error.message || 'Could not load loyalty balance');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLoyalty(); }, [loadLoyalty]);

  const redeemCode = async (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    setRedeeming(true);
    try {
      const response = await fetch(`${API}/api/loyalty/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getStorage('accessToken') || ''}` },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not redeem this code');
      toast.success(`${formatBDT(data.creditedBDT)} added to your loyalty balance`);
      setCode('');
      await loadLoyalty();
      window.dispatchEvent(new Event('loyalty-balance-updated'));
    } catch (error) {
      toast.error(error.message || 'Could not redeem this code');
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.22em] text-maybelline-pink">BELORELLA rewards</p>
        <h1 className="mt-2 text-3xl font-semibold text-black">Loyalty balance</h1>
        <p className="mt-2 text-sm text-dark-gray">Earn BDT on completed purchases and redeem gift codes in your account.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl bg-gradient-to-br from-[#b1123b] to-[#790b28] p-6 text-white shadow-sm">
          <div className="flex items-center gap-3 text-white/80"><FaCoins /><span className="text-sm">Available to use</span></div>
          <div className="mt-5 text-4xl font-semibold">{loading ? '—' : formatBDT(summary.balanceBDT)}</div>
          <p className="mt-3 text-sm text-white/80">Your balance is stored as BDT and can be applied during checkout or at POS.</p>
          {(summary.tierName || summary.enabled) && <div className="mt-5 border-t border-white/20 pt-4 text-sm">
            {summary.tierName && <p className="mb-1 font-semibold">{summary.tierName} tier</p>}
            {summary.enabled
              ? <p>Current earn rate: {Number(summary.earnRatePercent || 0)}% on eligible paid purchases</p>
              : <p>Loyalty rewards are currently paused.</p>}
          </div>}
        </div>

        <form onSubmit={redeemCode} className="rounded-2xl border border-cool-gray bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-50 text-maybelline-pink"><FaGift /></span><div><h2 className="font-semibold text-black">Redeem a gift code</h2><p className="text-sm text-dark-gray">The code value will be added to your BDT balance.</p></div></div>
          <label htmlFor="loyalty-gift-code" className="mt-5 block text-sm font-medium text-black">Gift code</label>
          <div className="mt-2 flex gap-2">
            <input id="loyalty-gift-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="BEL-XXXX-XXXX-XXXX" autoComplete="off" className="min-w-0 flex-1 rounded-lg border border-cool-gray px-4 py-3 uppercase outline-none focus:border-maybelline-pink" />
            <button disabled={redeeming || !code.trim()} className="rounded-lg bg-maybelline-pink px-5 py-3 font-semibold text-white disabled:opacity-50">{redeeming ? 'Adding…' : 'Redeem'}</button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-cool-gray bg-white">
        <div className="flex items-center gap-3 border-b border-cool-gray px-5 py-4"><FaHistory className="text-maybelline-pink" /><div><h2 className="font-semibold text-black">Balance history</h2><p className="text-xs text-dark-gray">Credits, checkout use, and order adjustments</p></div></div>
        {loading ? <p className="p-6 text-sm text-dark-gray">Loading your loyalty history…</p> : summary.transactions?.length ? (
          <div className="divide-y divide-cool-gray">
            {summary.transactions.map((entry) => (
              <div key={entry._id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="font-medium text-black">{sourceNames[entry.source] || 'Balance update'}</p><p className="text-sm text-dark-gray">{entry.note || entry.referenceId || 'BELORELLA loyalty account'}</p><p className="mt-1 text-xs text-mid-gray">{new Date(entry.createdAt).toLocaleString()}</p></div>
                <p className={`font-semibold ${entry.direction === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>{entry.direction === 'credit' ? '+' : '−'}{formatBDT(entry.amountBDT)} <span className="text-xs font-normal text-mid-gray">· balance {formatBDT(entry.balanceAfterBDT)}</span></p>
              </div>
            ))}
          </div>
        ) : <p className="p-6 text-sm text-dark-gray">Your balance activity will appear here.</p>}
      </section>
    </main>
  );
}
