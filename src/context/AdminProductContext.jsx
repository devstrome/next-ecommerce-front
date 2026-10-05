'use client'
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { getStorage } from '../lib/storage';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const AdminProductContext = createContext(null);

export const useAdminProduct = () => useContext(AdminProductContext);

const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

export const AdminProductProvider = ({ children }) => {
  const [categoryTree, setCategoryTree] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [genders, setGenders] = useState([]);
  const [badges, setBadges] = useState([]);
  const [measureTypes, setMeasureTypes] = useState([]);
  const [shippingTypes, setShippingTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const treeRef = useRef([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [treeRes, colorsRes, sizesRes, gendersRes, badgesRes, unitsRes, shippingRes] = await Promise.all([
        axios.get(`${API_URI}/api/categories/tree`),
        axios.get(`${API_URI}/api/colors`),
        axios.get(`${API_URI}/api/sizes`),
        axios.get(`${API_URI}/api/genders`),
        axios.get(`${API_URI}/api/badges`),
        axios.get(`${API_URI}/api/units`),
        axios.get(`${API_URI}/api/shipping`),
      ]);
      setCategoryTree(treeRes.data || []);
      treeRef.current = treeRes.data || [];
      setColors(colorsRes.data || []);
      setSizes(sizesRes.data || []);
      setGenders(gendersRes.data || []);
      setBadges(badgesRes.data || []);
      setMeasureTypes(unitsRes.data || []);
      setShippingTypes(shippingRes.data || []);
    } catch (err) {
      console.error('Error loading product options:', err);
      setError(err.response?.data?.message || 'Failed to load product options');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const serverError = (err) => new Error(err.response?.data?.message || err.response?.data?.error || 'Request failed');

  const createCategory = async (name, parent = null) => {
    try {
      const res = await axios.post(`${API_URI}/api/categories`, { name, parent }, authHeaders());
      await refresh();
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const createBrand = async (categoryId, brand) => {
    try {
      const res = await axios.post(`${API_URI}/api/categories/${categoryId}/brands`, { brand }, authHeaders());
      await refresh();
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const removeBrand = async (categoryId, brand) => {
    try {
      const res = await axios.delete(`${API_URI}/api/categories/${categoryId}/brands`, { ...authHeaders(), data: { brand } });
      await refresh();
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const createColor = async (name, hexCode = '#DC143C') => {
    try {
      const res = await axios.post(`${API_URI}/api/colors`, { name, hexCode }, authHeaders());
      setColors(prev => [...prev, res.data]);
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const createSize = async (name) => {
    try {
      const res = await axios.post(`${API_URI}/api/sizes`, { name }, authHeaders());
      setSizes(prev => [...prev, res.data]);
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const createGender = async (type) => {
    try {
      const res = await axios.post(`${API_URI}/api/genders`, { type }, authHeaders());
      setGenders(prev => [...prev, res.data]);
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const createBadge = async (name, color = '#DC143C') => {
    try {
      const res = await axios.post(`${API_URI}/api/badges`, { name, color }, authHeaders());
      setBadges(prev => [...prev, res.data]);
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const createMeasureType = async (measureType, unitName) => {
    try {
      const res = await axios.post(`${API_URI}/api/units`, { measureType, unitName }, authHeaders());
      setMeasureTypes(prev => [...prev, res.data]);
      return res.data;
    } catch (err) { throw serverError(err); }
  };

  const findCategoryByName = (name, nodes = treeRef.current) => {
    for (const node of nodes) {
      if (node.name === name) return node;
      const found = findCategoryByName(name, node.children || []);
      if (found) return found;
    }
    return null;
  };

  const value = {
    categoryTree,
    colors,
    sizes,
    genders,
    badges,
    measureTypes,
    shippingTypes,
    loading,
    error,
    refresh,
    createCategory,
    createBrand,
    removeBrand,
    createColor,
    createSize,
    createGender,
    createBadge,
    createMeasureType,
    findCategoryByName,
  };

  return <AdminProductContext.Provider value={value}>{children}</AdminProductContext.Provider>;
};
