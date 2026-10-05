'use client'
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { getStorage } from '../../../../src/lib/storage';
import { toast } from 'react-toastify';
import { printDocument } from '../../../../src/lib/print';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { FiPlus, FiTrash2, FiEdit2, FiDownload, FiCalendar, FiDollarSign, FiTrendingUp, FiShoppingBag, FiFilter, FiX } from 'react-icons/fi';


const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

const DEFAULT_EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Marketing', 'Inventory', 'Shipping', 'Software', 'Office Supplies', 'Miscellaneous'];
const PIE_COLORS = ['#E91E8C', '#FF69B4', '#C71585', '#DB7093', '#FF1493', '#FF6EB4', '#EE82EE', '#DA70D6', '#BA55D3'];

function getExpenseCategories() {
  if (typeof window === 'undefined') return DEFAULT_EXPENSE_CATEGORIES;
  try {
    const stored = localStorage.getItem('expenseCategories');
    return stored ? JSON.parse(stored) : DEFAULT_EXPENSE_CATEGORIES;
  } catch { return DEFAULT_EXPENSE_CATEGORIES; }
}

function saveExpenseCategories(cats) {
  localStorage.setItem('expenseCategories', JSON.stringify(cats));
}

function formatDate(d) {
  return new Date(d).toISOString().split('T')[0];
}

function toBDT(n) {
  return `৳${Number(n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function FinancePageClient() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [startDate, setStartDate] = useState(formatDate(firstOfMonth));
  const [endDate, setEndDate] = useState(formatDate(today));
  const [overview, setOverview] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [expenseLoading, setExpenseLoading] = useState(true);

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseForm, setExpenseForm] = useState({ title: '', category: 'Miscellaneous', amount: '', date: formatDate(today), notes: '' });
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [productCategory, setProductCategory] = useState('');
  const [productBrand, setProductBrand] = useState('');
  const [categoryTree, setCategoryTree] = useState([]);

  useEffect(() => { setExpenseCategories(getExpenseCategories()); fetchCategoryTree(); }, []);

  const fetchCategoryTree = async () => {
    try {
      const res = await axios.get(`${API_URI}/api/categories/tree`);
      setCategoryTree(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };

  const allBrands = useMemo(() => {
    const brands = new Set();
    categoryTree.forEach(cat => {
      if (cat.brands) cat.brands.forEach(b => brands.add(b));
      if (cat.children) cat.children.forEach(sub => {
        if (sub.brands) sub.brands.forEach(b => brands.add(b));
      });
    });
    return [...brands].sort();
  }, [categoryTree]);

  const addCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    if (expenseCategories.some(c => c.toLowerCase() === name.toLowerCase())) return;
    const updated = [...expenseCategories, name];
    setExpenseCategories(updated);
    saveExpenseCategories(updated);
    setNewCategoryName('');
  };

  const deleteCategory = (cat) => {
    if (!confirm(`Delete category "${cat}"? Existing expenses using it will keep their tag.`)) return;
    const updated = expenseCategories.filter(c => c !== cat);
    setExpenseCategories(updated);
    saveExpenseCategories(updated);
  };

  const renameCategory = (oldName) => {
    const newName = prompt(`Rename "${oldName}" to:`, oldName);
    if (!newName || newName.trim() === oldName) return;
    const trimmed = newName.trim();
    if (expenseCategories.some(c => c.toLowerCase() === trimmed.toLowerCase())) return alert('Category already exists');
    const updated = expenseCategories.map(c => c === oldName ? trimmed : c);
    setExpenseCategories(updated);
    saveExpenseCategories(updated);
  };

  const fetchOverview = async (start = startDate, end = endDate, cat = productCategory, brand = productBrand) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ startDate: start, endDate: end });
      if (cat) params.append('productCategory', cat);
      if (brand) params.append('productBrand', brand);
      const res = await axios.get(`${API_URI}/api/admin/finance/overview?${params}`, authHeaders());
      setOverview(res.data.overview || res.data);
    } catch (err) {
      console.error('Failed to fetch finance overview', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (start = startDate, end = endDate) => {
    setExpenseLoading(true);
    try {
      const params = new URLSearchParams({
        page: expensePage,
        limit: 20,
        search: expenseSearch,
        category: expenseCategory,
        startDate: start,
        endDate: end,
      });
      const res = await axios.get(`${API_URI}/api/admin/finance/expenses?${params}`, authHeaders());
      setExpenses(res.data.expenses || res.data.data || []);
      setExpenseTotalPages(res.data.pagination?.pages || res.data.totalPages || 1);
      setExpenseTotal(res.data.pagination?.total || res.data.total || (res.data.expenses || res.data.data || []).length);
    } catch (err) {
      console.error('Failed to fetch expenses', err);
    } finally {
      setExpenseLoading(false);
    }
  };

  useEffect(() => { fetchOverview(); fetchExpenses(); }, [startDate, endDate]);
  useEffect(() => { fetchExpenses(); }, [expensePage, expenseCategory]);

  const applyDateFilter = () => {
    setExpensePage(1);
    fetchOverview();
    fetchExpenses();
  };

  const setPreset = (preset) => {
    const now = new Date();
    let s, e;
    switch (preset) {
      case 'today':
        s = e = formatDate(now);
        break;
      case 'week': {
        const day = now.getDay();
        s = formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() - day));
        e = formatDate(now);
        break;
      }
      case 'month':
        s = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        e = formatDate(now);
        break;
      case 'year':
        s = formatDate(new Date(now.getFullYear(), 0, 1));
        e = formatDate(now);
        break;
      default:
        return;
    }
    setStartDate(s);
    setEndDate(e);
    setExpensePage(1);
    fetchOverview(s, e);
    fetchExpenses(s, e);
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...expenseForm, amount: parseFloat(expenseForm.amount) };
      if (editingExpense) {
        await axios.put(`${API_URI}/api/admin/finance/expenses/${editingExpense._id}`, payload, authHeaders());
      } else {
        await axios.post(`${API_URI}/api/admin/finance/expenses`, payload, authHeaders());
      }
      setShowExpenseModal(false);
      setEditingExpense(null);
      setExpenseForm({ title: '', category: 'Miscellaneous', amount: '', date: formatDate(today), notes: '' });
      fetchExpenses();
      fetchOverview();
    } catch (err) {
      console.error('Failed to save expense', err);
    }
  };

  const handleEditExpense = (exp) => {
    setEditingExpense(exp);
    setExpenseForm({
      title: exp.title,
      category: exp.category,
      amount: exp.amount,
      date: formatDate(exp.date),
      notes: exp.notes || '',
    });
    setShowExpenseModal(true);
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm('Delete this expense?')) return;
    try {
      await axios.delete(`${API_URI}/api/admin/finance/expenses/${id}`, authHeaders());
      fetchExpenses();
      fetchOverview();
    } catch (err) {
      console.error('Failed to delete expense', err);
    }
  };

  const openNewExpenseModal = () => {
    setEditingExpense(null);
    setExpenseForm({ title: '', category: 'Miscellaneous', amount: '', date: formatDate(today), notes: '' });
    setShowExpenseModal(true);
  };

  const revenueExpensesChart = useMemo(() => {
    if (!overview?.dailyRevenue && !overview?.revenueByDay) return [];
    const revData = overview?.dailyRevenue || overview?.revenueByDay || [];
    const expData = overview?.dailyExpenses || overview?.expensesByDay || [];
    const revMap = {};
    revData.forEach(d => { revMap[d._id || d.date] = d.revenue || d.total || 0; });
    const expMap = {};
    expData.forEach(d => { expMap[d._id || d.date] = d.amount || d.total || 0; });
    const allDates = [...new Set([...Object.keys(revMap), ...Object.keys(expMap)])].sort();
    return allDates.map(date => ({
      date: date.length > 5 ? date.slice(5) : date,
      Revenue: revMap[date] || 0,
      Expenses: expMap[date] || 0,
    }));
  }, [overview]);

  const expenseByCategory = useMemo(() => {
    const data = overview?.expenseByCategory || overview?.expensesByCategory || [];
    return data.map(c => ({ name: c._id || c.category, value: c.total || c.amount || 0 }));
  }, [overview]);

  const netProfit = (overview?.totalRevenue || 0) - (overview?.totalExpenses || 0);

  const commonCSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: white; }
    html, body { height: 100%; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    @page {
      size: A4 portrait;
      margin: 16mm 14mm 16mm;
      @top-center { content: "BELORELLA — Confidential Report"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #999; }
      @bottom-center { content: "Page " counter(page) " of " counter(pages); font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #999; }
      @bottom-left { content: "BELORELLA"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; color: #aaa; }
    }
    thead { display: table-header-group; }
    tr, .keep-together { break-inside: avoid; page-break-inside: avoid; }
    h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
    .page { display: flex; flex-direction: column; min-height: 100%; }
    .content { flex: 1; padding: 24px 0; }
    .header { background: linear-gradient(135deg, #DC143C 0%, #9F123C 100%); padding: 28px 40px 24px; text-align: center; border-radius: 8px; }
    .header .brand { font-size: 30px; font-weight: 800; letter-spacing: 10px; color: white; text-transform: uppercase; margin: 8px 0 2px; }
    .header .sub { font-size: 11px; letter-spacing: 4px; color: rgba(255,255,255,0.75); text-transform: uppercase; }
    .titlebar { background: #FFF1F2; padding: 14px 20px; border-bottom: 2px solid #FECDD3; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
    .section { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid #FECDD3; }
    .section .bar { width: 4px; height: 18px; background: #DC143C; border-radius: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #FECDD3; color: #DC143C; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; background: #FFF1F2; }
    th:last-child, td:last-child { text-align: right; }
    .auth-section { padding: 16px 0; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #FECDD3; break-inside: avoid; }
    .auth-box { text-align: center; }
    .auth-box img { max-height: 80px; object-fit: contain; }
    .auth-box .label { font-size: 9px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .auth-box .line { width: 140px; border-bottom: 1px solid #ccc; margin: 0 auto 6px; }
    .footer { padding: 14px 0; text-align: center; margin-top: auto; border-top: 1px solid #eee; }
  `;

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const generatedDate = new Date().toLocaleDateString('en-BD', { year: 'numeric', month: 'long', day: 'numeric' });

  const fetchImageAsDataURI = async (path) => {
    try {
      const res = await fetch(`${origin}${path}`);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch { return ''; }
  };

  const buildPDF = (title, subtitle, bodyContent, images) => {
    const logo = images.logo || '';
    const sign = images.sign || '';
    const seal = images.seal || '';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title><style>${commonCSS}</style></head><body>
      <div class="page">
        <div class="header">
          ${logo ? `<img src="${logo}" alt="BELORELLA" style="border-radius: 10px;height:60px;object-fit:contain;" />` : `<div style="font-size:36px;font-weight:900;color:white;letter-spacing:8px">B</div>`}
          <div class="brand">BELORELLA</div>
          <div class="sub">Premium Fashion &amp; Lifestyle</div>
        </div>
        <div class="titlebar">
          <div>
            <div style="font-size:18px;font-weight:700;color:#DC143C">${title}</div>
            <div style="font-size:12px;color:#666">${subtitle}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:1px">Generated</div>
            <div style="font-size:12px;color:#333">${generatedDate}</div>
          </div>
        </div>
        <div class="content">${bodyContent}</div>
        <div class="auth-section">
          <div class="auth-box">
            ${sign ? `<img src="${sign}" alt="Signature" style="max-height:80px;" />` : `<div style="height:80px"></div>`}
            <div class="line"></div>
            <div class="label">Authorized Signature</div>
          </div>
          <div class="auth-box">
            ${seal ? `<img src="${seal}" alt="Seal" style="max-height:90px;" />` : `<div style="height:90px"></div>`}
            <div class="label">Company Seal</div>
          </div>
          <div class="auth-box">
            <div style="padding-top:30px">
              <div class="line"></div>
              <div class="label">Date: ${generatedDate}</div>
            </div>
          </div>
        </div>
        <div class="footer">
          <div style="font-size:10px;color:#999;letter-spacing:1px">BELORELLA &copy; ${new Date().getFullYear()} &mdash; Confidential Report</div>
        </div>
      </div>
    </body></html>`;
  };

  const openPrintWindow = async (title, subtitle, bodyContent) => {
    const [logo, sign, seal] = await Promise.all([
      fetchImageAsDataURI('/logo.png'),
      fetchImageAsDataURI('/sign.png'),
      fetchImageAsDataURI('/seal.png'),
    ]);
    const html = buildPDF(title, subtitle, bodyContent, { logo, sign, seal });
    if (!printDocument(html)) {
      toast.error('Print window blocked - allow popups for this site');
    }
  };

  const handleExportPDF = async () => {
    const topProductsRows = (overview?.topProducts || []).map((p, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#999;font-weight:600">${i + 1}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#1a1a1a">${p.name || p._id}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6">${p.totalSold}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#DC143C">${toBDT(p.revenue)}</td></tr>`
    ).join('');
    const expenseCatRows = expenseByCategory.map((c, i) =>
      `<div style="display:flex;align-items:center;justify-content:space-between;background:#FFF8FA;border:1px solid #FECDD3;border-radius:8px;padding:10px 14px"><div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${['#DC143C','#E91E63','#F44336','#FF5722','#9C27B0','#673AB7','#3F51B5','#2196F3','#009688'][i % 9]}"></div><span style="font-size:12px;font-weight:500;color:#444">${c.name}</span></div><span style="font-size:13px;font-weight:700;color:#DC143C">${toBDT(c.value)}</span></div>`
    ).join('');
    const orderStatusRows = (overview?.orderStatus || []).map(s =>
      `<div style="background:#FFF8FA;border:1px solid #FECDD3;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#DC143C">${s.count}</div><div style="font-size:10px;color:#888;text-transform:capitalize;font-weight:500">${s._id}</div></div>`
    ).join('');

    const summaryCards = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:28px">
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">REVENUE</div><div style="font-size:20px;font-weight:800;color:#DC143C">${toBDT(overview?.totalRevenue)}</div></div>
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">EXPENSES</div><div style="font-size:20px;font-weight:800;color:#EF4444">${toBDT(overview?.totalExpenses)}</div></div>
      <div style="background:${netProfit >= 0 ? '#F0FDF4' : '#FEF2F2'};border:1px solid ${netProfit >= 0 ? '#BBF7D0' : '#FECACA'};border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">NET PROFIT</div><div style="font-size:20px;font-weight:800;color:${netProfit >= 0 ? '#16A34A' : '#EF4444'}">${toBDT(netProfit)}</div></div>
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">ORDERS</div><div style="font-size:20px;font-weight:800;color:#DC143C">${overview?.orderCount || 0}</div></div>
    </div>`;

    const expenseDetailRows = expenses.map((exp, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#1a1a1a">${exp.title || ''}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6"><span style="background:#FFF1F2;color:#9F123C;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600">${exp.category}</span></td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#EF4444">${toBDT(exp.amount)}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#666">${formatDate(exp.date)}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#888;font-size:11px;word-break:break-word">${exp.notes || '-'}</td></tr>`
    ).join('');

    let body = summaryCards;
    if (topProductsRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Top Selling Products</h2></div><table><thead><tr><th>#</th><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${topProductsRows}</tbody></table></div>`;
    if (expenseDetailRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Expense Details</h2></div><table><thead><tr><th>Title</th><th>Category</th><th style="text-align:right">Amount</th><th>Date</th><th>Notes</th></tr></thead><tbody>${expenseDetailRows}</tbody></table></div>`;
    if (expenseCatRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Expenses by Category</h2></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${expenseCatRows}</div></div>`;
    if (orderStatusRows) body += `<div style="margin-bottom:20px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Order Status</h2></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">${orderStatusRows}</div></div>`;

    await openPrintWindow('Finance Report', `${startDate} to ${endDate}`, body);
  };

  const handleExportIncome = async () => {
    const orderRows = (overview?.dailyRevenue || []).map((d, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#999">${d._id || d.date}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#16A34A">${toBDT(d.total || d.revenue || 0)}</td></tr>`
    ).join('');
    const topProductsRows = (overview?.topProducts || []).map((p, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#999;font-weight:600">${i + 1}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#1a1a1a">${p.name || p._id}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6">${p.totalSold}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#DC143C">${toBDT(p.revenue)}</td></tr>`
    ).join('');
    const orderStatusRows = (overview?.orderStatus || []).map(s =>
      `<div style="background:#FFF8FA;border:1px solid #FECDD3;border-radius:8px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:800;color:#DC143C">${s.count}</div><div style="font-size:10px;color:#888;text-transform:capitalize;font-weight:500">${s._id}</div></div>`
    ).join('');

    const expenseDetailRows = expenses.map((exp, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#1a1a1a">${exp.title || ''}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6"><span style="background:#FFF1F2;color:#9F123C;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600">${exp.category}</span></td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#EF4444">${toBDT(exp.amount)}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#666">${formatDate(exp.date)}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#888;font-size:11px;word-break:break-word">${exp.notes || '-'}</td></tr>`
    ).join('');

    let body = `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:28px">
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">TOTAL REVENUE</div><div style="font-size:22px;font-weight:800;color:#DC143C">${toBDT(overview?.totalRevenue)}</div></div>
      <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">NET PROFIT</div><div style="font-size:22px;font-weight:800;color:#16A34A">${toBDT(netProfit)}</div></div>
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">ORDERS</div><div style="font-size:22px;font-weight:800;color:#DC143C">${overview?.orderCount || 0}</div></div>
    </div>`;
    if (orderRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Daily Revenue Breakdown</h2></div><table><thead><tr><th>Date</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${orderRows}</tbody></table></div>`;
    if (topProductsRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Top Selling Products</h2></div><table><thead><tr><th>#</th><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Revenue</th></tr></thead><tbody>${topProductsRows}</tbody></table></div>`;
    if (expenseDetailRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Expense Details</h2></div><table><thead><tr><th>Title</th><th>Category</th><th style="text-align:right">Amount</th><th>Date</th><th>Notes</th></tr></thead><tbody>${expenseDetailRows}</tbody></table></div>`;
    if (orderStatusRows) body += `<div style="margin-bottom:20px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Order Status</h2></div><div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">${orderStatusRows}</div></div>`;

    await openPrintWindow('Income Report', `${startDate} to ${endDate}`, body);
  };

  const handleExportExpense = async () => {
    const expenseRows = expenses.map((exp, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#1a1a1a">${exp.title || ''}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6"><span style="background:#FFF1F2;color:#9F123C;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600">${exp.category}</span></td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#EF4444">${toBDT(exp.amount)}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#666">${formatDate(exp.date)}</td><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#888;font-size:11px;word-break:break-word">${exp.notes || '-'}</td></tr>`
    ).join('');
    const expenseCatRows = expenseByCategory.map((c, i) =>
      `<div style="display:flex;align-items:center;justify-content:space-between;background:#FFF8FA;border:1px solid #FECDD3;border-radius:8px;padding:10px 14px"><div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${['#DC143C','#E91E63','#F44336','#FF5722','#9C27B0','#673AB7','#3F51B5','#2196F3','#009688'][i % 9]}"></div><span style="font-size:12px;font-weight:500;color:#444">${c.name}</span></div><span style="font-size:13px;font-weight:700;color:#DC143C">${toBDT(c.value)}</span></div>`
    ).join('');
    const dailyExpRows = (overview?.dailyExpenses || []).map((d, i) =>
      `<tr style="background:${i % 2 === 0 ? '#fff' : '#FFF8FA'}"><td style="padding:8px 12px;border-bottom:1px solid #F3F4F6;color:#999">${d._id || d.date}</td><td style="text-align:right;padding:8px 12px;border-bottom:1px solid #F3F4F6;font-weight:600;color:#EF4444">${toBDT(d.total || d.amount || 0)}</td></tr>`
    ).join('');

    let body = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:28px">
      <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">TOTAL EXPENSES</div><div style="font-size:22px;font-weight:800;color:#EF4444">${toBDT(overview?.totalExpenses)}</div></div>
      <div style="background:#FFF1F2;border:1px solid #FECDD3;border-radius:10px;padding:16px;text-align:center"><div style="font-size:9px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px">EXPENSE ITEMS</div><div style="font-size:22px;font-weight:800;color:#DC143C">${expenseTotal}</div></div>
    </div>`;
    if (expenseCatRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Expenses by Category</h2></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${expenseCatRows}</div></div>`;
    if (dailyExpRows) body += `<div style="margin-bottom:28px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">Daily Expenses</h2></div><table><thead><tr><th>Date</th><th style="text-align:right">Amount</th></tr></thead><tbody>${dailyExpRows}</tbody></table></div>`;
    if (expenseRows) body += `<div style="margin-bottom:20px"><div class="section"><div class="bar"></div><h2 style="font-size:15px;font-weight:700;color:#1a1a1a">All Expense Items</h2></div><table><thead><tr><th>Title</th><th>Category</th><th style="text-align:right">Amount</th><th>Date</th><th>Notes</th></tr></thead><tbody>${expenseRows}</tbody></table></div>`;

    await openPrintWindow('Expense Report', `${startDate} to ${endDate}`, body);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white !important; }
          .finance-print-grid { grid-template-columns: 1fr !important; }
        }
        .print-only { display: none; }
      `}</style>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 no-print">
        <h1 className="text-xl sm:text-2xl font-bold text-black flex items-center gap-2">
          <FiDollarSign className="text-maybelline-pink" /> Finance Analytics
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportIncome}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
          >
            <FiDownload size={16} /> Income
          </button>
          <button
            onClick={handleExportExpense}
            className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
          >
            <FiDownload size={16} /> Expense
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition text-sm"
          >
            <FiDownload size={16} /> Full Report
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 no-print">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent" />
          </div>
          <button onClick={applyDateFilter}
            className="flex items-center gap-1 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium">
            <FiFilter size={14} /> Apply
          </button>
          <div className="flex gap-1 ml-auto">
            {[
              ['today', 'Today'],
              ['week', 'This Week'],
              ['month', 'This Month'],
              ['year', 'This Year'],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setPreset(key)}
                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-maybelline-light hover:border-maybelline-pink transition">
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading finance data...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-maybelline-light flex items-center justify-center">
                  <FiDollarSign className="text-maybelline-pink" size={18} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Revenue</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-black truncate">{toBDT(overview?.totalRevenue)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-50 flex items-center justify-center">
                  <FiTrendingUp className="text-red-500" size={18} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Expenses</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-black truncate">{toBDT(overview?.totalExpenses)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <FiTrendingUp className={netProfit >= 0 ? 'text-green-600' : 'text-red-600'} size={18} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Profit</span>
              </div>
              <p className={`text-lg sm:text-2xl font-bold truncate ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{toBDT(netProfit)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-5">
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <FiShoppingBag className="text-purple-600" size={18} />
                </div>
                <span className="text-xs sm:text-sm font-medium text-gray-600">Orders</span>
              </div>
              <p className="text-lg sm:text-2xl font-bold text-black">{overview?.orderCount || 0}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 finance-print-grid">
            {/* Revenue vs Expenses Line Chart */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-black mb-4">Revenue vs Expenses</h2>
              {revenueExpensesChart.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No data for selected period</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={revenueExpensesChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 12 }} stroke="#999" />
                    <Tooltip formatter={(val) => toBDT(val)} />
                    <Line type="monotone" dataKey="Revenue" stroke="#E91E8C" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Expenses" stroke="#999" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Expense by Category Pie Chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
              <h2 className="text-base sm:text-lg font-semibold text-black mb-4">Expenses by Category</h2>
              {expenseByCategory.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No expenses to display</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={expenseByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {expenseByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => toBDT(val)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-1">
                    {expenseByCategory.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2 text-xs">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-gray-600 flex-1 truncate">{c.name}</span>
                        <span className="font-medium text-black">{toBDT(c.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Monthly Comparison */}
          {overview?.monthlyComparison && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h2 className="text-lg font-semibold text-black mb-4">Monthly Comparison</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {overview.monthlyComparison.map((m, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-600 mb-2">{m.label || `Month ${i + 1}`}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-gray-500">Revenue</p>
                        <p className="text-sm font-semibold text-black">{toBDT(m.revenue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Expenses</p>
                        <p className="text-sm font-semibold text-black">{toBDT(m.expenses)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expense Management */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-3 mb-4 no-print">
              <h2 className="text-lg font-semibold text-black">Expense Management</h2>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={expenseSearch}
                  onChange={e => setExpenseSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && fetchExpenses()}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent w-full sm:w-48"
                />
                <select
                  value={expenseCategory}
                  onChange={e => { setExpenseCategory(e.target.value); setExpensePage(1); }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maybelline-pink"
                >
                  <option value="">All Categories</option>
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={openNewExpenseModal}
                  className="flex items-center justify-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium">
                  <FiPlus size={16} /> Add Expense
                </button>
              </div>
            </div>

            {expenseLoading ? (
              <div className="text-center py-8 text-gray-500">Loading expenses...</div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8 text-gray-400">No expenses found.</div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Title</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Category</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">Amount</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-600">Date</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenses.map(exp => (
                        <tr key={exp._id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-3 text-black font-medium">{exp.title}</td>
                          <td className="py-3 px-3">
                            <span className="bg-maybelline-light text-maybelline-magenta px-2 py-0.5 rounded-full text-xs font-medium">
                              {exp.category}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right text-black">{toBDT(exp.amount)}</td>
                          <td className="py-3 px-3 text-gray-500">{formatDate(exp.date)}</td>
                          <td className="py-3 px-3 text-right no-print">
                            <button onClick={() => handleEditExpense(exp)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-blue-600 mr-1">
                              <FiEdit2 size={14} />
                            </button>
                            <button onClick={() => handleDeleteExpense(exp._id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-red-500">
                              <FiTrash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="sm:hidden space-y-3">
                  {expenses.map(exp => (
                    <div key={exp._id} className="border border-gray-200 rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-black text-sm">{exp.title}</p>
                          <span className="bg-maybelline-light text-maybelline-magenta px-2 py-0.5 rounded-full text-xs font-medium">{exp.category}</span>
                        </div>
                        <div className="flex gap-1 no-print">
                          <button onClick={() => handleEditExpense(exp)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-blue-600">
                            <FiEdit2 size={14} />
                          </button>
                          <button onClick={() => handleDeleteExpense(exp._id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-red-500">
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-black">{toBDT(exp.amount)}</span>
                        <span className="text-gray-500 text-xs">{formatDate(exp.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {expenseTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 no-print">
                    <p className="text-xs text-gray-500">Showing page {expensePage} of {expenseTotalPages} ({expenseTotal} total)</p>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setExpensePage(p => Math.max(1, p - 1))}
                        disabled={expensePage === 1}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Prev
                      </button>
                      {Array.from({ length: Math.min(5, expenseTotalPages) }, (_, i) => {
                        let pageNum;
                        if (expenseTotalPages <= 5) pageNum = i + 1;
                        else if (expensePage <= 3) pageNum = i + 1;
                        else if (expensePage >= expenseTotalPages - 2) pageNum = expenseTotalPages - 4 + i;
                        else pageNum = expensePage - 2 + i;
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setExpensePage(pageNum)}
                            className={`px-3 py-1 text-xs border rounded-lg ${pageNum === expensePage ? 'bg-maybelline-pink text-white border-maybelline-pink' : 'border-gray-300 hover:bg-gray-50'}`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setExpensePage(p => Math.min(expenseTotalPages, p + 1))}
                        disabled={expensePage === expenseTotalPages}
                        className="px-3 py-1 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Expense Categories Manager */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
            <button
              onClick={() => setShowCategoryManager(!showCategoryManager)}
              className="flex items-center gap-2 w-full text-left"
            >
              <h2 className="text-lg font-semibold text-black flex-1">Expense Categories</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{expenseCategories.length} categories</span>
              <FiEdit2 size={16} className="text-gray-400" />
            </button>
            {showCategoryManager && (
              <div className="mt-4">
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCategory()}
                    placeholder="New category name..."
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  />
                  <button
                    onClick={addCategory}
                    className="flex items-center gap-1 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium"
                  >
                    <FiPlus size={14} /> Add
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {expenseCategories.map(cat => (
                    <div key={cat} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <span className="text-sm font-medium text-black truncate">{cat}</span>
                      <div className="flex gap-1 flex-shrink-0 ml-2">
                        <button onClick={() => renameCategory(cat)} className="p-1 hover:bg-gray-200 rounded transition text-blue-600" title="Rename">
                          <FiEdit2 size={12} />
                        </button>
                        <button onClick={() => deleteCategory(cat)} className="p-1 hover:bg-gray-200 rounded transition text-red-500" title="Delete">
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Top Selling Products */}
          {overview?.topProducts && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5 mb-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-lg font-semibold text-black">Top Selling Products</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={productCategory}
                    onChange={e => { setProductCategory(e.target.value); fetchOverview(startDate, endDate, e.target.value, productBrand); }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-maybelline-pink"
                  >
                    <option value="">All Categories</option>
                    {categoryTree.map(c => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  <select
                    value={productBrand}
                    onChange={e => { setProductBrand(e.target.value); fetchOverview(startDate, endDate, productCategory, e.target.value); }}
                    className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-maybelline-pink"
                  >
                    <option value="">All Brands</option>
                    {allBrands.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>
              {overview.topProducts.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No products found</p>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-3 font-medium text-gray-600">#</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">Product Name</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">Category</th>
                          <th className="text-left py-3 px-3 font-medium text-gray-600">Brand</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">Units Sold</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-600">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overview.topProducts.map((p, i) => (
                          <tr key={p._id || i} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-3 text-gray-500">{i + 1}</td>
                            <td className="py-3 px-3 text-black font-medium">{p.name || 'Unknown'}</td>
                            <td className="py-3 px-3 text-gray-500">{Array.isArray(p.categories) ? p.categories.join(', ') : '-'}</td>
                            <td className="py-3 px-3 text-gray-500">{p.brand || '-'}</td>
                            <td className="py-3 px-3 text-right text-black">{p.totalSold || p.totalQuantity || 0}</td>
                            <td className="py-3 px-3 text-right text-black">{toBDT(p.revenue || p.totalRevenue || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Mobile cards */}
                  <div className="sm:hidden space-y-2">
                    {overview.topProducts.map((p, i) => (
                      <div key={p._id || i} className="bg-gray-50 rounded-lg px-3 py-2.5">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-maybelline-pink w-5">{i + 1}.</span>
                            <span className="text-sm font-medium text-black truncate">{p.name || 'Unknown'}</span>
                          </div>
                          <span className="font-semibold text-black text-sm">{toBDT(p.revenue || p.totalRevenue || 0)}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 ml-7">
                          <span>{Array.isArray(p.categories) ? p.categories[0] : 'N/A'}</span>
                          {p.brand && <span>• {p.brand}</span>}
                          <span>• {p.totalSold || p.totalQuantity || 0} sold</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Order Status Breakdown */}
          {overview?.orderStatus && overview.orderStatus.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-black">Order Status Breakdown</h2>
                <button
                  onClick={async () => {
                    if (!confirm('Force generate income? This will mark delivered orders with completed payment.')) return;
                    try {
                      await axios.post(`${API_URI}/api/admin/finance/generate-income`, {}, authHeaders());
                      fetchOverview();
                      alert('Income regenerated successfully!');
                    } catch (err) {
                      console.error('Failed to generate income', err);
                      alert(err.response?.data?.message || 'Failed to generate income');
                    }
                  }}
                  className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-4 py-2 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium"
                >
                  <FiDollarSign size={14} /> Force Generate Income
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {overview.orderStatus.map(s => (
                  <div key={s._id || s.status} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                    <span className="text-sm text-gray-600 capitalize">{s._id || s.status}</span>
                    <span className="text-sm font-semibold text-black">{s.count || s.total || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{editingExpense ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }} className="text-gray-400 hover:text-black">
                <FiX size={20} />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={expenseForm.title}
                  onChange={e => setExpenseForm({ ...expenseForm, title: e.target.value })}
                  placeholder="e.g. Office rent for July"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                >
                  {expenseCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (BDT) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={expenseForm.amount}
                  onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-maybelline-pink focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3">
                <button type="submit"
                  className="flex items-center gap-2 bg-maybelline-pink text-pure-white px-5 py-2.5 rounded-lg hover:bg-maybelline-magenta transition text-sm font-medium">
                  <FiPlus size={16} /> {editingExpense ? 'Update' : 'Add Expense'}
                </button>
                <button type="button" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
