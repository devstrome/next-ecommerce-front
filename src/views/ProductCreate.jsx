'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import Creatable from 'react-select/creatable';
import { FaPlus, FaTrash, FaEdit, FaTimes } from 'react-icons/fa';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { useRouter } from "next/navigation";
import { getStorage } from "../lib/storage";
import SEOEditor from '../components/SEOEditor';

const ProductCreate = () => {
  const [categoryTree, setCategoryTree] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [genders, setGenders] = useState([]);
  const [badges, setBadges] = useState([]);
  const [measureTypes, setMeasureTypes] = useState([]);
  const [shippingTypes, setShippingTypes] = useState([]);
  const [selectedCategoryObj, setSelectedCategoryObj] = useState(null);
  const [selectedSubcategoryObj, setSelectedSubcategoryObj] = useState(null);

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
  const [variant, setVariant] = useState({
    selectedColor: '',
    selectedColorHex: '',
    sizes: [],
    prices: [],
    discountPrices: [],
    badgeNames: [],
    badgeColors: [],
    stockBySize: [],
    description: '',
    images: [],
    shippingIds: [],
    specifications: [],
  });

  const [editingVariantIndex, setEditingVariantIndex] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [isVariantVisible, setIsVariantVisible] = useState(false);
  const [variantCount, setVariantCount] = useState(0);

  const router = useRouter();

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [treeRes, colorsRes, sizesRes, gendersRes, badgesRes, unitsRes, shippingRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/categories/tree`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/colors`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/sizes`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/genders`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/badges`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/units`),
          axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/shipping`),
        ]);

        setCategoryTree(treeRes.data);
        setColors(colorsRes.data);
        setSizes(sizesRes.data);
        setGenders(gendersRes.data);
        setBadges(badgesRes.data);
        setMeasureTypes(unitsRes.data);
        setShippingTypes(shippingRes.data || []);
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    };

    fetchOptions();
  }, []);

  const topLevelOptions = categoryTree.map(c => ({ value: c.name, label: c.name }));
  const subcategoryOptions = (selectedCategoryObj?.children || []).map(c => ({ value: c.name, label: c.name }));
  const brandOptionsFromSubcategory = (selectedSubcategoryObj?.brands || []).map(b => ({ value: b, label: b }));
  const colorOptions = colors.map(c => ({ value: c.name, label: `${c.name} (${c.hexCode})` }));
  const sizeOptions = sizes.map(s => ({ value: s.name, label: s.name }));
  const genderOptions = genders.map(g => ({ value: g.type, label: g.type }));
  const badgeOptions = badges.map(b => ({ value: b.name, label: `${b.name} (${b.color})` }));
  const measureTypeOptions = measureTypes.map(m => ({
    value: m.measureType,
    label: `${m.measureType} (${m.unitName})`,
    unitName: m.unitName,
  }));
  const shippingOptions = shippingTypes.map(s => ({ value: s._id, label: `${s.name} ($${Number(s.charge).toFixed(2)}, ${s.estimatedDays}d)` }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'mainBadgeName') {
      const selectedBadge = badges.find((badge) => badge.name === value);
      const mainBadgeColor = selectedBadge ? selectedBadge.color : '';
      setProduct((prev) => ({
        ...prev,
        mainBadgeName: value,
        mainBadgeColor,
      }));
    } else {
      setProduct((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSeoChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({
      ...prev,
      seo: { ...prev.seo, [name]: value },
    }));
  };

  const handleVariantChange = (e) => {
    const { name, value } = e.target;
    setVariant((prev) => ({ ...prev, [name]: value }));
  };

  const handleVariantImageChange = (e) => {
    setVariant((prev) => ({ ...prev, images: Array.from(e.target.files) }));
  };

  const addSizePrice = () => {
    setVariant((prev) => ({
      ...prev,
      sizes: [...prev.sizes, ''],
      prices: [...prev.prices, ''],
      discountPrices: [...prev.discountPrices, ''],
      stockBySize: [...prev.stockBySize, ''],
    }));
  };

  const addSpecification = () => {
    setVariant((prev) => ({
      ...prev,
      specifications: [...prev.specifications, { name: '', value: '', unit: '' }],
    }));
  };

  const handleSpecificationChange = (index, field, value) => {
    setVariant((prev) => {
      const updatedSpecs = [...prev.specifications];
      updatedSpecs[index] = { ...updatedSpecs[index], [field]: value };
      return { ...prev, specifications: updatedSpecs };
    });
  };

  const removeSpecification = (index) => {
    setVariant((prev) => ({
      ...prev,
      specifications: prev.specifications.filter((_, i) => i !== index),
    }));
  };

  const handleSizePriceChange = (index, value, type) => {
    setVariant((prev) => {
      const updatedArray = [...prev[type]];
      updatedArray[index] = value;
      return { ...prev, [type]: updatedArray };
    });
  };

  const handleCategoryChange = (selectedOption) => {
    const value = selectedOption ? selectedOption.value : '';
    const catObj = categoryTree.find(c => c.name === value) || null;
    setProduct((prev) => ({
      ...prev,
      category: value,
      subcategory: '',
      brand: '',
    }));
    setSelectedCategoryObj(catObj);
    setSelectedSubcategoryObj(null);
  };

  const handleSubcategoryChange = (selectedOption) => {
    const value = selectedOption ? selectedOption.value : '';
    const subObj = (selectedCategoryObj?.children || []).find(c => c.name === value) || null;
    setProduct((prev) => ({
      ...prev,
      subcategory: value,
      brand: '',
    }));
    setSelectedSubcategoryObj(subObj);
  };

  const handleMainBadgeChange = (selectedOption) => {
    const badgeColor = selectedOption
      ? badges.find((b) => b.name === selectedOption.value)?.color || ''
      : '';
    setProduct((prev) => ({
      ...prev,
      mainBadgeName: selectedOption ? selectedOption.value : '',
      mainBadgeColor: badgeColor,
    }));
  };

  const handleGenderChange = (selectedOption) => {
    setProduct((prev) => ({
      ...prev,
      gender: selectedOption ? selectedOption.value : '',
    }));
  };

  const handleBrandChange = (selectedOption) => {
    setProduct((prev) => ({
      ...prev,
      brand: selectedOption ? selectedOption.value : '',
    }));
  };

  const handleMeasureTypeChange = (selectedOption) => {
    setProduct((prev) => ({
      ...prev,
      measureType: selectedOption ? selectedOption.value : '',
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

  const handleCreateSize = async (inputValue) => {
    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/sizes`, { name: inputValue }, {
        headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });
      setSizes(prev => [...prev, res.data]);
      const newOpt = { value: inputValue, label: inputValue };
      setVariant(prev => ({ ...prev, sizes: [...prev.sizes, inputValue] }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create size');
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
      setVariant(prev => ({ ...prev, selectedColor: pendingColorName, selectedColorHex: newColorHex }));
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

  const handleVariantColorChange = (selectedOption) => {
    const hex = selectedOption ? colors.find(c => c.name === selectedOption.value)?.hexCode || '' : '';
    setVariant((prev) => ({
      ...prev,
      selectedColor: selectedOption ? selectedOption.value : '',
      selectedColorHex: hex,
    }));
  };

  const handleVariantBadgesChange = (selectedOptions) => {
    const names = selectedOptions ? selectedOptions.map(opt => opt.value) : [];
    const colorsForBadges = names.map(name => {
      const badge = badges.find(b => b.name === name);
      return badge ? badge.color : '';
    });
    setVariant((prev) => ({
      ...prev,
      badgeNames: names,
      badgeColors: colorsForBadges,
    }));
  };

  const handleMainImageChange = (e) => {
    setProduct((prev) => ({ ...prev, mainImage: e.target.files[0] }));
  };

  const saveVariant = () => {
    if (!variant.selectedColor || variant.sizes.length === 0 || !variant.stockBySize.length) {
      alert('Please fill in all required fields for the variant.');
      return;
    }

    if (editingVariantIndex === null) {
      if (variantCount >= 5) {
        alert('You can only add up to 5 variants.');
        return;
      }
      setProduct((prev) => ({
        ...prev,
        variants: [...prev.variants, { ...variant }],
      }));
      setVariantCount((prev) => prev + 1);
    } else {
      setProduct((prev) => {
        const newVariants = [...prev.variants];
        newVariants[editingVariantIndex] = { ...variant };
        return {
          ...prev,
          variants: newVariants,
        };
      });
    }

    setVariant({
      selectedColor: '',
      selectedColorHex: '',
      sizes: [],
      prices: [],
      discountPrices: [],
      badgeNames: [],
      badgeColors: [],
      stockBySize: [],
      description: '',
      images: [],
      shippingIds: [],
      specifications: [],
    });
    setEditingVariantIndex(null);
    setIsVariantVisible(false);
  };

  const editVariant = (index) => {
    const v = product.variants[index];
    setVariant({
      ...v,
      images: v.images.map(imgObj =>
        imgObj.preview
          ? imgObj
          : { ...imgObj, preview: URL.createObjectURL(imgObj.file) }
      ),
    });
    setEditingVariantIndex(index);
    setIsVariantVisible(true);
  };

  const removeVariant = (index) => {
    setProduct((prev) => {
      const newVariants = [...prev.variants];
      newVariants.splice(index, 1);
      return { ...prev, variants: newVariants };
    });
    setVariantCount((prev) => Math.max(prev - 1, 0));

    if (editingVariantIndex === index) {
      setEditingVariantIndex(null);
      setIsVariantVisible(false);
      setVariant({
        selectedColor: '',
        selectedColorHex: '',
        sizes: [],
        prices: [],
        discountPrices: [],
        badgeNames: [],
        badgeColors: [],
        stockBySize: [],
        description: '',
        images: [],
        shippingIds: [],
      });
    }
  };

  const cancelEdit = () => {
    setEditingVariantIndex(null);
    setIsVariantVisible(false);
    setVariant({
      selectedColor: '',
      selectedColorHex: '',
      sizes: [],
      prices: [],
      discountPrices: [],
      badgeNames: [],
      badgeColors: [],
      stockBySize: [],
      description: '',
      images: [],
      shippingIds: [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    for (let i = 0; i < product.variants.length; i++) {
      if (!product.variants[i].images || product.variants[i].images.length === 0) {
        alert(`Please upload images for variant ${i + 1}.`);
        return;
      }
    }

    try {
      console.log( 'Submitting product data:', product, variant);

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
      formData.append('mainImage', product.mainImage);
      formData.append('seo', JSON.stringify(product.seo));

      const variantsWithoutImages = product.variants.map((variant) => ({
        colorName: variant.selectedColor,
        hexCode: variant.selectedColorHex,
        sizes: variant.sizes,
        prices: variant.prices,
        discountPrices: variant.discountPrices,
        badgeNames: variant.badgeNames,
        badgeColors: variant.badgeColors,
        stockBySize: variant.stockBySize,
        description: variant.description,
        measureType: product.measureType,
        unitName: product.unitName,
        shippingIds: Array.isArray(variant.shippingIds) ? variant.shippingIds : (variant.shippingId ? [variant.shippingId] : []),
        specifications: Array.isArray(variant.specifications) ? variant.specifications : [],
      }));

      formData.append('variants', JSON.stringify(variantsWithoutImages));

      product.variants.forEach((variant, index) => {
        variant.images.forEach((imgObj) => {
          formData.append(`images-${index}`, imgObj.file);
        });
      });

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/products`, formData, {
        headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${getStorage('adminAccessToken')}` },
      });

      const createdSku = response.data.product?.sku || response.data.sku || '';
      setSuccessMessage(createdSku ? `Product created successfully! SKU: ${createdSku}` : 'Product created successfully!');

      setProduct({
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
        isPreOrder: false,
        preOrderEstimatedDate: '',
        broadcast: false,
        comingSoon: false,
        variants: [],
        mainImage: null,
        seo: { metaTitle: '', metaDescription: '', metaKeywords: '', ogImage: '' },
      });
      setSelectedCategoryObj(null);
      setSelectedSubcategoryObj(null);
      setVariant({
        selectedColor: '',
        selectedColorHex: '',
        sizes: [],
        prices: [],
        discountPrices: [],
        badgeNames: [],
        badgeColors: [],
        stockBySize: [],
        description: '',
        images: [],
      });
      setVariantCount(0);
      setIsVariantVisible(false);
      setEditingVariantIndex(null);

    } catch (error) {
      console.error('Error creating product:', error);
      alert('Failed to create product. Please try again.');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-pure-white min-h-screen p-4 sm:p-6"
    >
      <div className="max-w-full mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={() => router.back()} className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
            ←
          </button>
          <h1 className="font-heading text-2xl sm:text-3xl text-black">Create Product</h1>
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
            className="w-full px-4 py-3 border border-cool-gray bg-white text-black mb-4 focus:outline-none focus:ring-2 focus:ring-charcoal"
            required
          />

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
            Broadcast this product (show in live feed)
          </label>

          <label className="flex items-center gap-2 mb-4 text-sm text-dark-gray cursor-pointer">
            <input
              type="checkbox"
              checked={product.isPreOrder}
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
                value={product.preOrderEstimatedDate}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
              />
            </div>
          )}

          <label className="flex items-center gap-2 mb-4 text-sm text-dark-gray cursor-pointer">
            <input
              type="checkbox"
              checked={product.comingSoon}
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
              options={badgeOptions}
              classNamePrefix="select"
              value={badgeOptions.find((opt) => opt.value === product.mainBadgeName) || null}
              onChange={handleMainBadgeChange}
              placeholder="Select Main Badge"
              isClearable
            />
            <Creatable
              name="gender"
              options={genderOptions}
              classNamePrefix="select"
              value={genderOptions.find((opt) => opt.value === product.gender) || (product.gender ? { value: product.gender, label: product.gender } : null)}
              onChange={handleGenderChange}
              onCreateOption={handleCreateGender}
              placeholder="Select or Create Gender"
              isSearchable
              isClearable
              formatCreateLabel={(input) => `Create "${input}"`}
            />
            <Creatable
              name="measureType"
              options={measureTypeOptions}
              classNamePrefix="select"
              value={measureTypeOptions.find(
                (opt) =>
                  opt.value === product.measureType &&
                  opt.unitName === product.unitName
              ) || (product.measureType ? { value: product.measureType, label: `${product.measureType} (${product.unitName || '?'})`, unitName: product.unitName } : null)}
              onChange={(selectedOption) => {
                setProduct((prev) => ({
                  ...prev,
                  measureType: selectedOption ? selectedOption.value : '',
                  unitName: selectedOption ? (selectedOption.unitName || '') : '',
                }));
              }}
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
            onChange={handleMainImageChange}
            className="w-full px-4 py-3 border border-cool-gray bg-white text-black mb-4 focus:outline-none focus:ring-2 focus:ring-charcoal"
            required
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
          <div className="border-t border-cool-gray pt-6 mt-6">
            <h2 className="font-heading text-xl mb-4 text-black" style={{ fontFamily: "'Inter', serif" }}>Variant Information</h2>

            {isVariantVisible && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Creatable
                      name="selectedColor"
                      options={colorOptions}
                      className="mb-4"
                      classNamePrefix="select"
                      value={colorOptions.find((opt) => opt.value === variant.selectedColor) || (variant.selectedColor ? { value: variant.selectedColor, label: `${variant.selectedColor} (${variant.selectedColorHex || '?'})` } : null)}
                      onChange={handleVariantColorChange}
                      onCreateOption={(input) => {
                        setPendingColorName(input);
                        setShowColorHexPicker(true);
                      }}
                      placeholder="Select or Create Color"
                      isSearchable
                      isClearable
                      formatCreateLabel={(input) => `Create "${input}" — pick hex code`}
                      required
                    />
                    {showColorHexPicker && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-cool-gray rounded">
                        <span className="text-xs text-dark-gray font-medium whitespace-nowrap">Color: {pendingColorName}</span>
                        <input
                          type="color"
                          value={newColorHex}
                          onChange={(e) => setNewColorHex(e.target.value)}
                          className="w-8 h-8 border-none cursor-pointer"
                        />
                        <span className="text-xs text-mid-gray font-mono">{newColorHex}</span>
                        <button type="button" onClick={handleCreateColorConfirm} className="px-2 py-1 bg-maybelline-pink text-white text-xs rounded">Add</button>
                        <button type="button" onClick={() => { setShowColorHexPicker(false); setPendingColorName(''); }} className="px-2 py-1 bg-mid-gray text-white text-xs rounded">Cancel</button>
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    name="stock"
                    placeholder="Stock per Size"
                    value={variant.stockBySize[0] || ''}
                    onChange={(e) => {
                      const perSize = parseInt(e.target.value) || 0;
                      const newStock = variant.sizes.map(() => perSize);
                      setVariant(prev => ({ ...prev, stockBySize: newStock }));
                    }}
                    className="w-full px-4 py-3 border border-cool-gray bg-white text-black mb-4 focus:outline-none focus:ring-2 focus:ring-charcoal"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <textarea
                    name="description"
                    placeholder="Variant Description"
                    value={variant.description}
                    onChange={handleVariantChange}
                    className="w-full px-4 py-3 border border-cool-gray bg-white text-black mb-4 focus:outline-none focus:ring-2 focus:ring-charcoal"
                    rows="3"
                    required
                  />
                  <div className="mb-4">
                    <label className="block mb-2 font-medium text-dark-gray">Shipping Types (multi)</label>
                    <Select
                      isMulti
                      name="shippingIds"
                      options={shippingOptions}
                      classNamePrefix="select"
                      value={shippingOptions.filter(opt => (variant.shippingIds||[]).includes(opt.value))}
                      onChange={(opts)=> setVariant(prev => ({ ...prev, shippingIds: (opts||[]).map(o=>o.value) }))}
                      placeholder="Select Shipping Types"
                      isClearable
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2 font-medium text-dark-gray">Variant Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          const preview = URL.createObjectURL(file);
                          setVariant(prev => ({
                            ...prev,
                            images: [...prev.images, { file, preview }]
                          }));
                        }
                        e.target.value = '';
                      }}
                      className="mb-2"
                    />
                    <div className="flex flex-wrap gap-4">
                      {variant.images.map((img, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={img.preview}
                            alt={`variant-img-${idx}`}
                            className="w-20 h-20 object-cover border border-cool-gray"
                          />
                          <button
                            type="button"
                            className="absolute top-0 right-0 bg-red-600 text-white p-1"
                            onClick={() => {
                              setVariant(prev => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx)
                              }));
                            }}
                            title="Delete Image"
                          >
                            <FaTrash size={14} />
                          </button>
                          <label
                            className="absolute bottom-0 right-0 bg-black text-white p-1 cursor-pointer"
                            title="Edit Image"
                          >
                            <FaEdit size={14} />
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => {
                                const file = e.target.files[0];
                                if (file) {
                                  const preview = URL.createObjectURL(file);
                                  setVariant(prev => {
                                    const newImages = [...prev.images];
                                    newImages[idx] = { file, preview };
                                    return { ...prev, images: newImages };
                                  });
                                }
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h3 className="font-heading text-lg mb-2 text-black" style={{ fontFamily: "'Inter', serif" }}>Sizes and Prices</h3>
                  {variant.sizes.map((size, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Creatable
                        options={sizeOptions}
                        value={sizeOptions.find((opt) => opt.value === size) || (size ? { value: size, label: size } : null)}
                        onChange={(selectedOption) =>
                          handleSizePriceChange(index, selectedOption ? selectedOption.value : '', 'sizes')
                        }
                        onCreateOption={handleCreateSize}
                        className="flex-2"
                        classNamePrefix="select"
                        placeholder="Select or Create Size"
                        isSearchable
                        isClearable
                        formatCreateLabel={(input) => `Create "${input}"`}
                        required
                      />
                      <input
                        type="number"
                        placeholder="Price"
                        value={variant.prices[index]}
                        onChange={(e) => handleSizePriceChange(index, e.target.value, 'prices')}
                        className="w-50 px-2 py-1 border border-cool-gray bg-white text-black"
                        required
                      />
                      <input
                        type="number"
                        placeholder="Discount Price"
                        value={variant.discountPrices[index]}
                        onChange={(e) => handleSizePriceChange(index, e.target.value, 'discountPrices')}
                        className="w-50 px-2 py-1 border border-cool-gray bg-white text-black"
                      />
                      <input
                        type="number"
                        placeholder="Stock"
                        value={variant.stockBySize[index]}
                        onChange={(e) => {
                          const newStock = [...variant.stockBySize];
                          newStock[index] = e.target.value;
                          setVariant(prev => ({ ...prev, stockBySize: newStock }));
                        }}
                        className="w-50 px-2 py-1 border border-cool-gray bg-white text-black"
                        required
                      />
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => {
                          setVariant((prev) => {
                            const sizes = [...prev.sizes];
                            const prices = [...prev.prices];
                            const discountPrices = [...prev.discountPrices];
                            const stockBySize = [...prev.stockBySize];
                            sizes.splice(index, 1);
                            prices.splice(index, 1);
                            discountPrices.splice(index, 1);
                            stockBySize.splice(index, 1);
                            return { ...prev, sizes, prices, discountPrices, stockBySize };
                          });
                        }}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSizePrice}
                    className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition"
                  >
                    <FaPlus /> Add Size
                  </button>
                </div>

                <Select
                  isMulti
                  name="badgeNames"
                  options={badgeOptions}
                  className="mb-4"
                  classNamePrefix="select"
                  value={badgeOptions.filter((opt) => variant.badgeNames.includes(opt.value))}
                  onChange={handleVariantBadgesChange}
                  placeholder="Select Badges"
                  isClearable
                />

                <div className="mb-4">
                  <h3 className="font-heading text-lg mb-2 text-black" style={{ fontFamily: "'Inter', serif" }}>Specifications</h3>
                  {variant.specifications.map((spec, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="Specification Name"
                        value={spec.name}
                        onChange={(e) => handleSpecificationChange(index, 'name', e.target.value)}
                        className="flex-1 px-2 py-1 border border-cool-gray bg-white text-black"
                      />
                      <input
                        type="text"
                        placeholder="Value"
                        value={spec.value}
                        onChange={(e) => handleSpecificationChange(index, 'value', e.target.value)}
                        className="flex-1 px-2 py-1 border border-cool-gray bg-white text-black"
                      />
                      <input
                        type="text"
                        placeholder="Unit (optional)"
                        value={spec.unit}
                        onChange={(e) => handleSpecificationChange(index, 'unit', e.target.value)}
                        className="w-32 px-2 py-1 border border-cool-gray bg-white text-black"
                      />
                      <button
                        type="button"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => removeSpecification(index)}
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addSpecification}
                    className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition"
                  >
                    <FaPlus /> Add Specification
                  </button>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={saveVariant}
                    className="bg-black text-white px-6 py-3 hover:bg-maybelline-pink transition"
                  >
                    {editingVariantIndex === null ? 'Add Variant' : 'Save Variant'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-cool-gray text-dark-gray px-6 py-3 hover:bg-blush transition"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}

            {!isVariantVisible && (
              <button
                type="button"
                onClick={() => setIsVariantVisible(true)}
                disabled={variantCount >= 5}
                className={`mt-4 bg-black text-white px-6 py-3 w-full hover:bg-maybelline-pink transition ${
                  variantCount >= 5 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                Add Variant
              </button>
            )}
          </div>

          {product.variants.length > 0 && (
            <div className="mt-8">
              <h2 className="font-heading text-xl mb-4 text-black" style={{ fontFamily: "'Inter', serif" }}>Added Variants</h2>
              {product.variants.map((v, idx) => (
                <div
                  key={idx}
                  className="mb-6 p-4 border border-cool-gray bg-pure-white relative"
                >
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    title="Remove Variant"
                  >
                    <FaTrash size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => editVariant(idx)}
                    className="absolute top-2 right-10 text-maybelline-pink hover:text-rose"
                    title="Edit Variant"
                  >
                    <FaEdit size={18} />
                  </button>

                  <p className="text-black"><strong>Color:</strong> {v.selectedColor}{' '}
                    <span style={{ color: v.selectedColorHex }}>■</span>
                  </p>
                  <p className="text-dark-gray"><strong>Stock:</strong> {v.stockBySize.join(', ')}</p>
                  <p className="text-dark-gray"><strong>Description:</strong> {v.description}</p>
                  <p className="text-black"><strong>Sizes & Prices:</strong></p>
                  <ul className="list-disc ml-6 text-dark-gray">
                    {v.sizes.map((size, i) => (
                      <li key={i}>
                        {size} ({product.measureType}) — Price: {v.prices[i]} — Discount Price:{' '}
                        {v.discountPrices[i]}
                      </li>
                    ))}
                  </ul>
                  <p className="text-dark-gray"><strong>Badges:</strong> {v.badgeNames.join(', ')}</p>
                  <p className="text-dark-gray"><strong>Specifications:</strong></p>
                  <ul className="list-disc ml-6 text-dark-gray">
                    {v.specifications && v.specifications.length > 0 ? (
                      v.specifications.map((spec, i) => (
                        <li key={i}>
                          {spec.name}: {spec.value} {spec.unit}
                        </li>
                      ))
                    ) : (
                      <li>No specifications added</li>
                    )}
                  </ul>
                  <p className="text-dark-gray"><strong>Images:</strong> {v.images.length} file(s) uploaded</p>
                </div>
              ))}
            </div>
          )}
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
              itemId={null}
              itemName={product.name || 'new-product'}
            />
          </div>
          </div>

          <button
            type="submit"
            disabled={product.variants.length === 0}
            className={`mt-8 bg-black text-white px-6 py-4 w-full hover:bg-maybelline-pink transition ${
              product.variants.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Create Product
          </button>
        </div>
      </div>
    </form>
  );
};

export default ProductCreate;