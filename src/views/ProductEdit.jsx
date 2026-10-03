'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Select from 'react-select';
import Creatable from 'react-select/creatable';
import { FaPlus, FaTrash } from 'react-icons/fa';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useRouter, useParams } from "next/navigation";
import io from 'socket.io-client';
import SEOEditor from '../components/SEOEditor';

const ProductEdit = () => {
  const [categoryTree, setCategoryTree] = useState([]);
  const [selectedCategoryObj, setSelectedCategoryObj] = useState(null);
  const [selectedSubcategoryObj, setSelectedSubcategoryObj] = useState(null);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [genders, setGenders] = useState([]);
  const [badges, setBadges] = useState([]);
  const [shippingTypes, setShippingTypes] = useState([]);
  const [measureTypes, setMeasureTypes] = useState([]);

  const {id} = useParams();
  
  const [product, setProduct] = useState({
    name: '',
    category: '',
    subcategory: '',
    brand: '',
    mainPrice: '',
    discountPrice: '',
    mainBadgeName: '',
    mainBadgeColor: '',
    gender: '',
    measureType: '',
    unitName: '',
    isPreOrder: false,
    preOrderEstimatedDate: '',
    broadcast: false,
    comingSoon: false,
    variants: [],
    mainImage: null,
    seo: {
      metaTitle: '',
      metaDescription: '',
      metaKeywords: '',
      ogImage: '',
    },
  });

  const [seoOpen, setSeoOpen] = useState(false);
  const [basicOpen, setBasicOpen] = useState(true);
  const [variantOpen, setVariantOpen] = useState(false);
  const [newVariantImages, setNewVariantImages] = useState({});
  const [deleteVariantImages, setDeleteVariantImages] = useState({});

  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const socketRef = useRef(null);

  useEffect(() => {
    fetchOptions();
    
    socketRef.current = io(`${process.env.NEXT_PUBLIC_API_URI}`, {
      transports: ['websocket', 'polling'],
      auth: { token: getStorage('adminAccessToken') || '' },
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchOptions = async () => {
    try {
      const [treeRes, colorsRes, sizesRes, gendersRes, badgesRes, productRes, shippingRes, unitsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/categories/tree`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/colors`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/sizes`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/genders`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/badges`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/shipping`),
        axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/units`),
      ]);
      setCategoryTree(treeRes.data);
      setColors(colorsRes.data);
      setSizes(sizesRes.data);
      setGenders(gendersRes.data);
      setBadges(badgesRes.data);
      setShippingTypes(shippingRes.data || []);
      setMeasureTypes(unitsRes.data || []);

      const prod = productRes.data;
      const normalizedVariants = (prod.variants || []).map(v => ({
        selectedColor: v.colorName || '',
        selectedColorHex: v.hexCode || '',
        sizes: Array.isArray(v.sizes) ? v.sizes : [],
        prices: Array.isArray(v.prices) ? v.prices : [],
        discountPrices: Array.isArray(v.discountPrices) ? v.discountPrices : [],
        badgeNames: Array.isArray(v.badgeNames) ? v.badgeNames : [],
        badgeColors: Array.isArray(v.badgeColors) ? v.badgeColors : [],
        stock: v.stock || '',
        stockBySize: Array.isArray(v.stockBySize) ? v.stockBySize : [],
        description: v.description || '',
        images: Array.isArray(v.images) ? v.images : [],
        shippingIds: Array.isArray(v.shippingOptions) ? v.shippingOptions.map(o => o._id || o.shippingId).filter(Boolean) : [],
        specifications: Array.isArray(v.specifications) ? v.specifications : [],
        measureType: v.measureType || prod.measureType || '',
        unitName: v.unitName || prod.unitName || '',
      }));

      const prodCatNames = Array.isArray(prod.categories) ? prod.categories : [];
      const catName = prodCatNames.length > 0 ? prodCatNames[0] : '';
      const subName = prodCatNames.length > 1 ? prodCatNames[1] : '';

      const catObj = treeRes.data.find(c => c.name === catName) || null;
      const subObj = catObj?.children?.find(c => c.name === subName) || null;

      setProduct({
        name: prod.name || '',
        sku: prod.sku || '',
        category: catName,
        subcategory: subName,
        brand: prod.brand || '',
        mainPrice: prod.mainPrice || '',
        discountPrice: prod.discountPrice || '',
        mainBadgeName: prod.mainBadgeName || '',
        mainBadgeColor: prod.mainBadgeColor || '',
        gender: prod.gender || '',
        measureType: prod.measureType || '',
        unitName: prod.unitName || '',
        isPreOrder: prod.isPreOrder || false,
        preOrderEstimatedDate: prod.preOrderEstimatedDate ? new Date(prod.preOrderEstimatedDate).toISOString().split('T')[0] : '',
        broadcast: prod.broadcast || false,
        comingSoon: prod.comingSoon || false,
        variants: normalizedVariants,
        mainImage: prod.mainImage || null,
        seo: {
          metaTitle: prod.seo?.metaTitle || '',
          metaDescription: prod.seo?.metaDescription || '',
          metaKeywords: prod.seo?.metaKeywords || '',
          ogImage: prod.seo?.ogImage || '',
        },
      });
      setSelectedCategoryObj(catObj);
      setSelectedSubcategoryObj(subObj);
      setDeleteVariantImages({});
      setNewVariantImages({});
    } catch (error) {
      console.error('Error fetching options:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mainBadgeName') {
      const selectedBadge = badges.find(badge => badge.name === value);
      const mainBadgeColor = selectedBadge ? selectedBadge.color : '';
      setProduct(prevProduct => ({
        ...prevProduct,
        mainBadgeName: value,
        mainBadgeColor: mainBadgeColor,
      }));
    } else {
      setProduct(prevProduct => ({ ...prevProduct, [name]: value }));
    }
  };

  const handleSeoChange = (e) => {
    const { name, value } = e.target;
    setProduct(prev => ({
      ...prev,
      seo: { ...prev.seo, [name]: value },
    }));
  };

  const handleCreateGender = async (inputValue) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/genders`, { type: inputValue }, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      setGenders(prev => [...prev, res.data]);
      setProduct(prev => ({ ...prev, gender: inputValue }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create gender');
    }
  };

  const [newColorHex, setNewColorHex] = useState('#DC143C');
  const [pendingColorName, setPendingColorName] = useState('');
  const [showColorHexPicker, setShowColorHexPicker] = useState(false);

  const handleCreateColorConfirm = async () => {
    if (!pendingColorName || !newColorHex) return;
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/colors`, { name: pendingColorName, hexCode: newColorHex }, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      setColors(prev => [...prev, res.data]);
      setShowColorHexPicker(false);
      setPendingColorName('');
      setNewColorHex('#DC143C');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create color');
    }
  };

  const handleCreateMeasureType = async (inputValue) => {
    const unitName = prompt('Enter unit name (e.g. g, ml, cm):');
    if (!unitName) return;
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/units`, { measureType: inputValue, unitName }, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      setMeasureTypes(prev => [...prev, res.data]);
      setProduct(prev => ({ ...prev, measureType: inputValue, unitName }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create measure type');
    }
  };

  const handleCreateSize = async (inputValue) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/sizes`, { name: inputValue }, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      setSizes(prev => [...prev, res.data]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create size');
    }
  };

  const colorOptions = colors.map(c => ({ value: c.name, label: `${c.name} (${c.hexCode})` }));
  const sizeOptions = sizes.map(s => ({ value: s.name, label: s.name }));
  const genderOptions = genders.map(g => ({ value: g.type, label: g.type }));
  const measureTypeOptions = measureTypes.map(m => ({
    value: m.measureType,
    label: `${m.measureType} (${m.unitName})`,
    unitName: m.unitName,
  }));

  const updateVariantField = (idx, patch) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      variants[idx] = { ...variants[idx], ...patch };
      return { ...prev, variants };
    });
  };

  const handleVariantSizePriceChange = (vIdx, index, value, type) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      const arr = [...variants[vIdx][type]];
      arr[index] = value;
      variants[vIdx] = { ...variants[vIdx], [type]: arr };
      return { ...prev, variants };
    });
  };

  const addVariantSizeRow = (vIdx) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      variants[vIdx] = {
        ...variants[vIdx],
        sizes: [...variants[vIdx].sizes, ''],
        prices: [...variants[vIdx].prices, ''],
        discountPrices: [...variants[vIdx].discountPrices, ''],
      };
      return { ...prev, variants };
    });
  };

  const removeVariantSizeRow = (vIdx, index) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      const sizesArr = [...variants[vIdx].sizes];
      const pricesArr = [...variants[vIdx].prices];
      const discArr = [...variants[vIdx].discountPrices];
      sizesArr.splice(index, 1);
      pricesArr.splice(index, 1);
      discArr.splice(index, 1);
      variants[vIdx] = { ...variants[vIdx], sizes: sizesArr, prices: pricesArr, discountPrices: discArr };
      return { ...prev, variants };
    });
  };

  const addVariantSpecification = (vIdx) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      variants[vIdx] = {
        ...variants[vIdx],
        specifications: [...(variants[vIdx].specifications || []), { name: '', value: '', unit: '' }],
      };
      return { ...prev, variants };
    });
  };

  const removeVariantSpecification = (vIdx, index) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      const specsArr = [...(variants[vIdx].specifications || [])];
      specsArr.splice(index, 1);
      variants[vIdx] = { ...variants[vIdx], specifications: specsArr };
      return { ...prev, variants };
    });
  };

  const handleVariantSpecificationChange = (vIdx, index, field, value) => {
    setProduct(prev => {
      const variants = [...prev.variants];
      const specsArr = [...(variants[vIdx].specifications || [])];
      specsArr[index] = { ...specsArr[index], [field]: value };
      variants[vIdx] = { ...variants[vIdx], specifications: specsArr };
      return { ...prev, variants };
    });
  };

  const handleSelectVariantImages = (vIdx, files) => {
    setNewVariantImages(prev => ({
      ...prev,
      [vIdx]: [ ...(prev[vIdx] || []), ...Array.from(files) ]
    }));
  };

  const toggleDeleteVariantImage = (vIdx, url) => {
    setDeleteVariantImages(prev => {
      const setForIdx = new Set(prev[vIdx] || []);
      if (setForIdx.has(url)) setForIdx.delete(url); else setForIdx.add(url);
      return { ...prev, [vIdx]: Array.from(setForIdx) };
    });
  };

  const clearVariantImagesSelection = (vIdx) => {
    setNewVariantImages(prev => ({ ...prev, [vIdx]: [] }));
  };

  const handleCategoryChange = (selectedOption) => {
    const value = selectedOption ? selectedOption.value : '';
    setProduct(prev => ({ ...prev, category: value, subcategory: '', brand: '' }));
    setSelectedCategoryObj(categoryTree.find(c => c.name === value) || null);
    setSelectedSubcategoryObj(null);
  };

  const handleSubcategoryChange = (selectedOption) => {
    const value = selectedOption ? selectedOption.value : '';
    setProduct(prev => ({ ...prev, subcategory: value, brand: '' }));
    setSelectedSubcategoryObj(selectedCategoryObj?.children?.find(c => c.name === value) || null);
  };

  const handleBrandChange = (selectedOption) => {
    setProduct(prev => ({ ...prev, brand: selectedOption ? selectedOption.value : '' }));
  };

  const emptyVariant = {
    selectedColor: '',
    selectedColorHex: '',
    description: '',
    stock: 0,
    sizes: [],
    stockBySize: [],
    prices: [],
    discountPrices: [],
    specifications: [],
    shippingIds: [],
    images: [],
  };

  const addVariant = () => {
    setProduct(prev => ({
      ...prev,
      variants: [...prev.variants, { ...emptyVariant }],
    }));
  };

  const removeVariant = (vIdx) => {
    if (!confirm('Remove this variant?')) return;
    setProduct(prev => {
      const variants = [...prev.variants];
      variants.splice(vIdx, 1);
      return { ...prev, variants };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('name', product.name);
    formData.append('categories', JSON.stringify([product.category, product.subcategory].filter(Boolean)));
    formData.append('brand', product.brand);
    formData.append('broadcast', product.broadcast ? 'true' : 'false');
    formData.append('mainPrice', product.mainPrice);
    formData.append('discountPrice', product.discountPrice);
    formData.append('mainBadgeName', product.mainBadgeName);
    formData.append('mainBadgeColor', product.mainBadgeColor);
    formData.append('gender', product.gender);
    formData.append('measureType', product.measureType);
    formData.append('unitName', product.unitName);
    formData.append('isPreOrder', product.isPreOrder ? 'true' : 'false');
    if (product.preOrderEstimatedDate) formData.append('preOrderEstimatedDate', product.preOrderEstimatedDate);
    formData.append('comingSoon', product.comingSoon ? 'true' : 'false');

    if (product.mainImage && typeof product.mainImage !== 'string') {
      formData.append('mainImage', product.mainImage);
    }

    formData.append('seo', JSON.stringify(product.seo));

    const variantsWithoutImages = product.variants.map((v) => ({
      colorName: v.selectedColor,
      hexCode: v.selectedColorHex,
      sizes: v.sizes,
      prices: v.prices,
      discountPrices: v.discountPrices,
      badgeNames: v.badgeNames,
      badgeColors: v.badgeColors,
      stock: v.stock,
      stockBySize: v.stockBySize,
      description: v.description,
      measureType: product.measureType,
      unitName: product.unitName,
      shippingIds: Array.isArray(v.shippingIds) ? v.shippingIds : (v.shippingId ? [v.shippingId] : []),
      specifications: Array.isArray(v.specifications) ? v.specifications : [],
    }));
    formData.append('variants', JSON.stringify(variantsWithoutImages));

    Object.keys(newVariantImages).forEach((key) => {
      const vIdx = Number(key);
      const files = newVariantImages[vIdx];
      if (Array.isArray(files) && files.length > 0) {
        files.forEach((file) => {
          formData.append(`images-${vIdx}`, file);
        });
      }
    });

    Object.keys(deleteVariantImages).forEach((key) => {
      const vIdx = Number(key);
      const toDelete = deleteVariantImages[vIdx];
      if (Array.isArray(toDelete) && toDelete.length > 0) {
        formData.append(`deleteImages-${vIdx}`, JSON.stringify(toDelete));
      }
    });

    try {
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${getStorage('adminAccessToken')}`,
        },
      });
      setSuccessMessage('Product updated successfully!');
      
      if (socketRef.current) {
        socketRef.current.emit('productUpdated', {
          productId: id,
          updateType: 'product_updated',
          timestamp: new Date()
        });
      }
      
      fetchOptions();
      setNewVariantImages({});
      setDeleteVariantImages({});
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    }
  };

  const topLevelOptions = categoryTree.map(c => ({ value: c.name, label: c.name }));
  const subcategoryOptions = (selectedCategoryObj?.children || []).map(c => ({ value: c.name, label: c.name }));
  const brandOptionsFromSubcategory = (selectedSubcategoryObj?.brands || []).map(b => ({ value: b, label: b }));

  return (
    <form onSubmit={handleSubmit} className="bg-pure-white min-h-screen p-4 sm:p-6">
      <div className="max-w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            ←
          </button>
          <h1 className="font-heading text-2xl sm:text-3xl text-black">Edit Product</h1>
        </div>
        {successMessage && (
          <div className="bg-blush text-maybelline-pink border border-rose p-4 mb-4">
            {successMessage}
          </div>
        )}
        <div className="bg-white border border-cool-gray p-4 sm:p-6">
          <input
            type="text"
            name="name"
            placeholder="Product Name"
            value={product.name}
            onChange={handleInputChange}
            className="w-full px-4 py-3 border border-cool-gray bg-white text-black mb-2 focus:outline-none focus:ring-2 focus:ring-charcoal"
            required
          />
          {product.sku && (
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-semibold text-dark-gray uppercase tracking-wider">SKU:</span>
              <span className="text-sm font-mono text-black bg-cool-gray px-3 py-1">{product.sku}</span>
            </div>
          )}

          <div className="sm:hidden mb-4">
            <button
              type="button"
              onClick={() => setBasicOpen(!basicOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-cool-gray text-black font-heading text-sm"
              style={{ fontFamily: "'Inter', serif" }}
            >
              <span>Basic Information</span>
              {basicOpen ? <FiChevronUp size={18} className="text-maybelline-pink" /> : <FiChevronDown size={18} className="text-maybelline-pink" />}
            </button>
          </div>
          <div className={`${basicOpen ? '' : 'hidden'} sm:block`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Select
                name="category"
                options={topLevelOptions}
                value={topLevelOptions.find(o => o.value === product.category) || null}
                onChange={handleCategoryChange}
                placeholder="Select Category"
                isClearable
              />
              {product.category && (
                <Select
                  name="subcategory"
                  options={subcategoryOptions}
                  value={subcategoryOptions.find(o => o.value === product.subcategory) || null}
                  onChange={handleSubcategoryChange}
                  placeholder="Select Subcategory"
                  isClearable
                />
              )}
              {product.subcategory && (
                <Select
                  name="brand"
                  options={brandOptionsFromSubcategory}
                  value={brandOptionsFromSubcategory.find(o => o.value === product.brand) || null}
                  onChange={handleBrandChange}
                  placeholder="Select Brand"
                  isClearable
                />
              )}
            </div>
            <label className="flex items-center gap-2 mb-4 text-sm text-dark-gray cursor-pointer">
              <input
                type="checkbox"
                checked={product.broadcast || false}
                onChange={(e) => setProduct(prev => ({ ...prev, broadcast: e.target.checked }))}
                className="accent-crimson"
              />
              Broadcast this product
            </label>
            <label className="flex items-center gap-2 mb-4 text-sm text-dark-gray cursor-pointer">
              <input
                type="checkbox"
                checked={product.isPreOrder || false}
                onChange={(e) => setProduct(prev => ({ ...prev, isPreOrder: e.target.checked }))}
                className="accent-maybelline-pink"
              />
              Pre-order product
            </label>
            {product.isPreOrder && (
              <div className="mb-4">
                <label className="block mb-1 text-sm font-medium text-dark-gray">Estimated Delivery Date</label>
                <input
                  type="date"
                  name="preOrderEstimatedDate"
                  value={product.preOrderEstimatedDate || ''}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                />
              </div>
            )}
            <label className="flex items-center gap-2 mb-4 text-sm text-dark-gray cursor-pointer">
              <input
                type="checkbox"
                checked={product.comingSoon || false}
                onChange={(e) => setProduct(prev => ({ ...prev, comingSoon: e.target.checked }))}
                className="accent-maybelline-pink"
              />
              Coming Soon (hide Add to Cart)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="number"
                name="mainPrice"
                placeholder="Main Price"
                value={product.mainPrice}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
                required
              />
              <input
                type="number"
                name="discountPrice"
                placeholder="Discount Price"
                value={product.discountPrice}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Select
                name="mainBadgeName"
                options={badges.map(b => ({ value: b.name, label: `${b.name} (${b.color})` }))}
                value={badges.map(b => ({ value: b.name, label: `${b.name} (${b.color})` })).find(o => o.value === product.mainBadgeName) || null}
                onChange={(opt) => {
                  const badgeColor = opt ? badges.find(b => b.name === opt.value)?.color || '' : '';
                  setProduct(prev => ({ ...prev, mainBadgeName: opt ? opt.value : '', mainBadgeColor: badgeColor }));
                }}
                placeholder="Select Main Badge"
                isSearchable
                isClearable
              />
              <Creatable
                name="gender"
                options={genderOptions}
                value={genderOptions.find(o => o.value === product.gender) || (product.gender ? { value: product.gender, label: product.gender } : null)}
                onChange={(opt) => setProduct(prev => ({ ...prev, gender: opt ? opt.value : '' }))}
                onCreateOption={handleCreateGender}
                placeholder="Select or Create Gender"
                isSearchable
                isClearable
                formatCreateLabel={(input) => `Create "${input}"`}
              />
              <Creatable
                name="measureType"
                options={measureTypeOptions}
                value={measureTypeOptions.find(o => o.value === product.measureType && o.unitName === product.unitName) || (product.measureType ? { value: product.measureType, label: `${product.measureType} (${product.unitName || '?'})`, unitName: product.unitName } : null)}
                onChange={(opt) => setProduct(prev => ({ ...prev, measureType: opt ? opt.value : '', unitName: opt ? (opt.unitName || '') : '' }))}
                onCreateOption={handleCreateMeasureType}
                placeholder="Select or Create Measure Type"
                isSearchable
                isClearable
                formatCreateLabel={(input) => `Create "${input}"`}
              />
            </div>
            <input
              type="file"
              name="mainImage"
              onChange={(e) => setProduct({ ...product, mainImage: e.target.files[0] })}
              className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
            />
          </div>

          <div className="sm:hidden mb-4">
            <button
              type="button"
              onClick={() => setVariantOpen(!variantOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-cool-gray text-black font-heading text-sm"
              style={{ fontFamily: "'Inter', serif" }}
            >
              <span>Variant Information</span>
              {variantOpen ? <FiChevronUp size={18} className="text-maybelline-pink" /> : <FiChevronDown size={18} className="text-maybelline-pink" />}
            </button>
          </div>
          <div className={`${variantOpen ? '' : 'hidden'} sm:block`}>
          <div className="border-t border-cool-gray pt-6">
            <h2 className="font-heading text-xl mb-4 text-black" style={{ fontFamily: "'Inter', serif" }}>Variant Information</h2>

            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="border-b border-cool-gray bg-pure-white">
                    <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Color</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Sizes & Prices</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Specifications</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Shipping</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Existing Images</th>
                    <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Add/Replace Images</th>
                  </tr>
                </thead>
                <tbody>
                  {product.variants.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-dark-gray">
                        No variants found.
                      </td>
                    </tr>
                  ) : (
                    product.variants.map((v, vIdx) => (
                      <tr key={vIdx} className="align-top border-b border-cool-gray">
                        <td className="py-3 px-4">
                          <div>
                            <Creatable
                              options={colorOptions}
                              value={colorOptions.find(opt => opt.value === v.selectedColor) || (v.selectedColor ? { value: v.selectedColor, label: `${v.selectedColor} (${v.selectedColorHex || '?'})` } : null)}
                              onChange={(opt) => updateVariantField(vIdx, { selectedColor: opt ? opt.value : '', selectedColorHex: opt ? (colors.find(c => c.name === opt.value)?.hexCode || '') : '' })}
                              onCreateOption={(input) => { setPendingColorName(input); setShowColorHexPicker(true); }}
                              placeholder="Select or Create Color"
                              isSearchable
                              isClearable
                              formatCreateLabel={(input) => `Create "${input}" — pick hex`}
                            />
                            {showColorHexPicker && (
                              <div className="flex items-center gap-2 mt-2 p-2 bg-cool-gray rounded">
                                <span className="text-xs text-dark-gray font-medium whitespace-nowrap">Color: {pendingColorName}</span>
                                <input type="color" value={newColorHex} onChange={(e) => setNewColorHex(e.target.value)} className="w-8 h-8 border-none cursor-pointer" />
                                <span className="text-xs text-mid-gray font-mono">{newColorHex}</span>
                                <button type="button" onClick={handleCreateColorConfirm} className="px-2 py-1 bg-maybelline-pink text-white text-xs rounded">Add</button>
                                <button type="button" onClick={() => { setShowColorHexPicker(false); setPendingColorName(''); }} className="px-2 py-1 bg-mid-gray text-white text-xs rounded">Cancel</button>
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <textarea
                              value={v.description}
                              onChange={(e)=>updateVariantField(vIdx, { description: e.target.value })}
                              placeholder="Description"
                              className="w-full px-3 py-2 border border-cool-gray bg-white text-black"
                              rows={2}
                            />
                          </div>
                          <div className="mt-2 text-sm text-dark-gray">Stock:
                            <input type="number" value={v.stock} onChange={(e)=>updateVariantField(vIdx, { stock: e.target.value })} className="ml-2 px-2 py-1 border border-cool-gray bg-white text-black w-24" />
                          </div>
                          <div className="mt-2 text-sm text-dark-gray">Stock by Size:
                            {v.sizes.map((size, sizeIdx) => (
                              <div key={sizeIdx} className="flex items-center mt-1">
                                <span className="text-xs text-dark-gray w-12">{size}:</span>
                                <input 
                                  type="number" 
                                  value={v.stockBySize[sizeIdx] || 0} 
                                  onChange={(e) => {
                                    const newStockBySize = [...(v.stockBySize || [])];
                                    newStockBySize[sizeIdx] = parseInt(e.target.value) || 0;
                                    updateVariantField(vIdx, { stockBySize: newStockBySize });
                                  }} 
                                  className="ml-1 px-2 py-1 border border-cool-gray bg-white text-black w-16 text-xs" 
                                />
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {(v.sizes || []).map((size, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                              <Creatable
                                options={sizeOptions}
                                value={sizeOptions.find(opt => opt.value === size) || (size ? { value: size, label: size } : null)}
                                onChange={(opt) => handleVariantSizePriceChange(vIdx, i, opt ? opt.value : '', 'sizes')}
                                onCreateOption={handleCreateSize}
                                placeholder="Select or Create Size"
                                isSearchable
                                isClearable
                                formatCreateLabel={(input) => `Create "${input}"`}
                              />
                              <input
                                type="number"
                                placeholder="Price"
                                value={v.prices[i]}
                                onChange={(e)=>handleVariantSizePriceChange(vIdx, i, e.target.value, 'prices')}
                                className="px-2 py-1 border border-cool-gray bg-white text-black w-28"
                              />
                              <input
                                type="number"
                                placeholder="Discount"
                                value={v.discountPrices[i]}
                                onChange={(e)=>handleVariantSizePriceChange(vIdx, i, e.target.value, 'discountPrices')}
                                className="px-2 py-1 border border-cool-gray bg-white text-black w-28"
                              />
                              <button type="button" className="text-red-500" onClick={()=>removeVariantSizeRow(vIdx, i)}>×</button>
                            </div>
                          ))}
                          <button type="button" className="flex items-center bg-black text-white px-3 py-1 text-sm hover:bg-maybelline-pink transition" onClick={()=>addVariantSizeRow(vIdx)}>
                            <FaPlus className="mr-1" /> Add Size
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {(v.specifications || []).map((spec, i) => (
                            <div key={i} className="flex gap-2 mb-2">
                              <input
                                type="text"
                                placeholder="Name"
                                value={spec.name}
                                onChange={(e)=>handleVariantSpecificationChange(vIdx, i, 'name', e.target.value)}
                                className="px-2 py-1 border border-cool-gray bg-white text-black text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Value"
                                value={spec.value}
                                onChange={(e)=>handleVariantSpecificationChange(vIdx, i, 'value', e.target.value)}
                                className="px-2 py-1 border border-cool-gray bg-white text-black text-xs"
                              />
                              <input
                                type="text"
                                placeholder="Unit"
                                value={spec.unit}
                                onChange={(e)=>handleVariantSpecificationChange(vIdx, i, 'unit', e.target.value)}
                                className="px-2 py-1 border border-cool-gray bg-white text-black text-xs w-16"
                              />
                              <button type="button" className="text-red-500" onClick={()=>removeVariantSpecification(vIdx, i)}>×</button>
                            </div>
                          ))}
                          <button type="button" className="flex items-center bg-black text-white px-3 py-1 text-sm hover:bg-maybelline-pink transition" onClick={()=>addVariantSpecification(vIdx)}>
                            <FaPlus className="mr-1" /> Add Spec
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-col gap-2">
                            <select
                              multiple
                              value={Array.isArray(v.shippingIds) ? v.shippingIds : []}
                              onChange={(e)=>{
                                const values = Array.from(e.target.selectedOptions).map(o=>o.value);
                                updateVariantField(vIdx, { shippingIds: values });
                              }}
                              className="w-full px-3 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal min-h-[80px]"
                            >
                              {shippingTypes.map(s => (
                                <option key={s._id} value={s._id}>{s.name} (${Number(s.charge).toFixed(2)}, {s.estimatedDays}d)</option>
                              ))}
                            </select>
                            <button type="button" className="text-xs text-maybelline-pink underline self-start" onClick={()=>{
                              setProduct(prev=>({
                                ...prev,
                                variants: prev.variants.map((vv, idx)=> idx===vIdx ? vv : { ...vv, shippingIds: Array.isArray(v.shippingIds)? [...v.shippingIds] : [] })
                              }));
                            }}>Apply to all variants</button>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-3">
                            {(v.images || []).map(url => (
                              <label key={url} className="relative inline-block">
                                <img src={url} alt="variant" className="w-16 h-16 object-cover border border-cool-gray" />
                                <input
                                  type="checkbox"
                                  onChange={()=>toggleDeleteVariantImage(vIdx, url)}
                                  className="absolute top-1 right-1 w-4 h-4 accent-crimson"
                                  checked={(deleteVariantImages[vIdx]||[]).includes(url)}
                                />
                              </label>
                            ))}
                          </div>
                          {(deleteVariantImages[vIdx]||[]).length > 0 && (
                            <div className="text-xs text-red-500 mt-1">Will delete: {(deleteVariantImages[vIdx]||[]).length} image(s)</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <input type="file" multiple accept="image/*" onChange={(e)=>handleSelectVariantImages(vIdx, e.target.files)} className="mb-2" />
                          {Array.isArray(newVariantImages[vIdx]) && newVariantImages[vIdx].length > 0 && (
                            <div className="text-xs text-dark-gray">Selected: {newVariantImages[vIdx].length} file(s) <button type="button" className="ml-2 text-red-500" onClick={()=>clearVariantImagesSelection(vIdx)}>Clear</button></div>
                          )}
                          <button
                            type="button"
                            onClick={()=>removeVariant(vIdx)}
                            className="mt-3 w-full bg-red-500 text-white text-xs px-2 py-1 hover:bg-red-600 transition"
                          >
                            Remove Variant
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={addVariant}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition"
                >
                  + Add Variant
                </button>
              </div>
            </div>
          </div>
          </div>

          <div className="sm:hidden mb-4 mt-6">
            <button
              type="button"
              onClick={() => setSeoOpen(!seoOpen)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border border-cool-gray text-black font-heading text-sm"
              style={{ fontFamily: "'Inter', serif" }}
            >
              <span>SEO Settings</span>
              {seoOpen ? <FiChevronUp size={18} className="text-maybelline-pink" /> : <FiChevronDown size={18} className="text-maybelline-pink" />}
            </button>
          </div>
          <div className={`${seoOpen ? '' : 'hidden'} sm:block`}>
          <div className="mt-8">
            <SEOEditor
              seo={product.seo}
              onChange={(newSeo) => setProduct({ ...product, seo: newSeo })}
              type="product"
              itemId={product._id || id}
              itemName={product.name || 'product'}
            />
          </div>
          </div>

          <div className="mt-8">
            <button
              type="submit"
              className="bg-black text-white px-4 py-3 hover:bg-maybelline-pink transition w-full"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ProductEdit;