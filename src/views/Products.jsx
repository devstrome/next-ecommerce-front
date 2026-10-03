'use client'
import { useEffect, useState, useDeferredValue, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import ProductCartModal from "../components/ProductCartModal";
import Link from "next/link"
import { useSearchParams } from "next/navigation";
import { FaFilter, FaTimes, FaSearch, FaSort, FaTh, FaListUl, FaChevronDown, FaChevronUp } from "react-icons/fa";

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

// Both filter components live at module scope on purpose: if they were
// defined inside Products, every parent re-render (e.g. each keystroke)
// would create a new component type and React would remount the subtree,
// stealing input focus after 1 character and cancelling slider drags.
const FilterSection = ({ title, children, section, icon, expandedSections, toggleSection }) => (
  <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
    <button
      onClick={() => toggleSection(section)}
      className="w-full px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex items-center justify-between text-left"
    >
      <div className="flex items-center gap-3">
        {icon}
        <h3 className="font-semibold text-gray-800">{title}</h3>
      </div>
      {expandedSections[section] ? (
        <FaChevronUp className="text-gray-500" />
      ) : (
        <FaChevronDown className="text-gray-500" />
      )}
    </button>
    {expandedSections[section] && (
      <div className="p-4 border-t border-gray-100">
        {children}
      </div>
    )}
  </div>
);

// Form-style price filter: type Min/Max freely or drag the dual slider,
// nothing is committed until "Apply" is clicked.
const PriceRangeFilter = ({ idPrefix = "pf", maxPrice, priceRange, onPriceChange, onSliderChange, onApply, onReset }) => {
  const rawMin = priceRange.min === '' ? 0 : Math.max(0, Math.min(Number(priceRange.min) || 0, maxPrice));
  const rawMax = priceRange.max === '' ? maxPrice : Math.max(0, Math.min(Number(priceRange.max) || 0, maxPrice));
  const sMin = Math.min(rawMin, rawMax);
  const sMax = Math.max(rawMin, rawMax);
  const pct = (v) => Math.max(0, Math.min(100, (v / maxPrice) * 100));
  const fmt = (v) => Number(v || 0).toLocaleString();
  const minOnTop = pct(sMin) > 55;

  const thumb =
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-maybelline-pink [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-pure-white [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:pointer-events-auto " +
    "[&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-maybelline-pink [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-pure-white [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto";

  return (
    <div className="space-y-4">
      {/* Dual-handle slider */}
      <div className="relative h-6 select-none">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-gray-200 rounded-full" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-maybelline-pink to-maybelline-rose rounded-full"
          style={{ left: `${pct(sMin)}%`, right: `${100 - pct(sMax)}%` }}
        />
        <input
          type="range"
          min="0"
          max={maxPrice}
          step="100"
          value={sMin}
          onChange={(e) => onSliderChange('min', e.target.value)}
          aria-label="Minimum price"
          className={`absolute inset-0 w-full h-6 appearance-none bg-transparent pointer-events-none touch-none ${thumb}`}
          style={{ zIndex: minOnTop ? 30 : 20 }}
        />
        <input
          type="range"
          min="0"
          max={maxPrice}
          step="100"
          value={sMax}
          onChange={(e) => onSliderChange('max', e.target.value)}
          aria-label="Maximum price"
          className={`absolute inset-0 w-full h-6 appearance-none bg-transparent pointer-events-none touch-none ${thumb}`}
          style={{ zIndex: minOnTop ? 20 : 30 }}
        />
      </div>

      {/* Min / Max inputs */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${idPrefix}-min`} className="block text-xs font-medium text-gray-500 mb-1">
            Min (BDT)
          </label>
          <input
            id={`${idPrefix}-min`}
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={priceRange.min}
            onChange={(e) => onPriceChange('min', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-max`} className="block text-xs font-medium text-gray-500 mb-1">
            Max (BDT)
          </label>
          <input
            id={`${idPrefix}-max`}
            type="text"
            inputMode="numeric"
            placeholder={maxPrice.toLocaleString()}
            value={priceRange.max}
            onChange={(e) => onPriceChange('max', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
          />
        </div>
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg text-center">
        BDT {fmt(rawMin)} - BDT {fmt(rawMax)}
      </div>

      <div className="flex gap-2">
        <button
          onClick={onApply}
          className="flex-1 px-4 py-2 bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white text-sm font-semibold rounded-lg hover:from-maybelline-magenta hover:to-maybelline-pink transition-all duration-200"
        >
          Apply
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-all duration-200"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

function Products() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [genders, setGenders] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const deferredSearch = useDeferredValue(searchQuery);
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || "name");
  const [viewMode, setViewMode] = useState("grid");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [appliedPrice, setAppliedPrice] = useState({ min: "", max: "" });
  const maxPrice = 1000000;
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    sort: true,
    category: true,
    brand: true,
    gender: true
  });
  const [cartModalProductId, setCartModalProductId] = useState(null);
  const urlParamsApplied = useRef(false);

  // Read URL params once
  const urlCategory = searchParams.get('category') || '';
  const urlBrand = searchParams.get('brand') || '';
  const urlSort = searchParams.get('sort') || '';
  const urlSearch = searchParams.get('search') || '';
  const urlSale = searchParams.get('sale') || '';

  // Fetch products with query params for server-side filtering
  const getProducts = useCallback(async (query, category, brand) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      if (brand) params.set('brand', brand);
      params.set('limit', '500');
      const url = `${API_URI}/api/products?${params.toString()}`;
      const { data } = await axios.get(url);
      const list = Array.isArray(data) ? data : (data.products || []);
      setProducts(list);
      setFilteredProducts(list);
    } catch (error) {
      console.error("Error fetching products", error);
    }
    setLoading(false);
  }, []);

  // Fetch categories (tree hierarchy)
  const getCategories = async () => {
    try {
      const { data } = await axios.get(`${API_URI}/api/categories/tree`);
      setCategories(data);
      setBrands([]);
    } catch (error) {
      console.error("Error fetching categories", error);
    }
  };

  // Compute brands from selected subcategories only
  const updateBrandsFromSelection = (selectedCats) => {
    const subcategoryNames = [];
    for (const cat of categories) {
      if (cat.children) {
        for (const sub of cat.children) {
          if (selectedCats.includes(sub.name)) {
            subcategoryNames.push(sub.name);
          }
        }
      }
    }
    if (subcategoryNames.length === 0) {
      setBrands([]);
      return;
    }
    const filteredBrands = [...new Set(
      categories.flatMap(cat =>
        (cat.children || [])
          .filter(sub => subcategoryNames.includes(sub.name))
          .flatMap(sub => sub.brands || [])
      )
    )].sort();
    setBrands(filteredBrands);
  };

  // Fetch genders
  const getGenders = async () => {
    try {
      const { data } = await axios.get(`${API_URI}/api/genders`);
      setGenders(data);
    } catch (error) {
      console.error("Error fetching genders", error);
    }
  };

  // Handle category checkbox change
  const handleCategoryChange = (categoryName) => {
    setSelectedCategories((prevSelected) => {
      const updated = prevSelected.includes(categoryName)
        ? prevSelected.filter((c) => c !== categoryName)
        : [...prevSelected, categoryName];
      return updated;
    });
  };

  // Handle gender checkbox change
  const handleGenderChange = (genderName) => {
    setSelectedGenders((prevSelected) =>
      prevSelected.includes(genderName)
        ? prevSelected.filter((g) => g !== genderName)
        : [...prevSelected, genderName]
    );
  };

  const handlePriceChange = (field, value) => {
    const digits = String(value).replace(/[^0-9]/g, '').slice(0, 7);
    setPriceRange(prev => ({ ...prev, [field]: digits }));
  };

  const handleSliderChange = (field, value) => {
    setPriceRange(prev => ({ ...prev, [field]: String(value) }));
  };

  const applyPriceFilter = () => {
    let min = priceRange.min === '' ? 0 : Math.max(0, Math.min(Number(priceRange.min) || 0, maxPrice));
    let max = priceRange.max === '' ? maxPrice : Math.max(0, Math.min(Number(priceRange.max) || 0, maxPrice));
    if (min > max) { const t = min; min = max; max = t; }
    setAppliedPrice({
      min: min <= 0 ? '' : String(min),
      max: max >= maxPrice ? '' : String(max),
    });
  };

  const resetPriceFilter = () => {
    setPriceRange({ min: "", max: "" });
    setAppliedPrice({ min: "", max: "" });
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Apply URL params after categories are loaded
  useEffect(() => {
    if (categories.length === 0 || urlParamsApplied.current) return;
    urlParamsApplied.current = true;

    const urlCat = searchParams.get('category') || '';
    const urlBrandParam = searchParams.get('brand') || '';
    const urlSortParam = searchParams.get('sort') || '';

    if (urlSortParam) {
      setSortBy(urlSortParam);
    }

    if (urlCat) {
      // Find category by slug and select it (and its parent if subcategory)
      const catNameFromSlug = [];
      for (const cat of categories) {
        if (cat.slug === urlCat || cat.name.toLowerCase() === urlCat.toLowerCase()) {
          catNameFromSlug.push(cat.name);
        }
        if (cat.children) {
          for (const sub of cat.children) {
            if (sub.slug === urlCat || sub.name.toLowerCase() === urlCat.toLowerCase()) {
              catNameFromSlug.push(sub.name);
              // Also select parent so brands show up
              if (!catNameFromSlug.includes(cat.name)) {
                catNameFromSlug.push(cat.name);
              }
            }
          }
        }
      }
      if (catNameFromSlug.length > 0) {
        setSelectedCategories(catNameFromSlug);
      }
    }

    if (urlBrandParam) {
      // Find which subcategories have this brand and select them
      const catsWithBrand = [];
      for (const cat of categories) {
        if (cat.children) {
          for (const sub of cat.children) {
            if (sub.brands && sub.brands.some(b => b.toLowerCase() === urlBrandParam.toLowerCase())) {
              if (!catsWithBrand.includes(sub.name)) catsWithBrand.push(sub.name);
              if (!catsWithBrand.includes(cat.name)) catsWithBrand.push(cat.name);
            }
          }
        }
      }
      if (catsWithBrand.length > 0) {
        setSelectedCategories(prev => [...new Set([...prev, ...catsWithBrand])]);
      }
      setSelectedBrands([urlBrandParam]);
    }
  }, [categories, searchParams]);

  // Update brands when selected categories change
  useEffect(() => {
    updateBrandsFromSelection(selectedCategories);
    // Don't clear selected brands if URL brand was set
    const urlBrandParam = searchParams.get('brand');
    if (!urlBrandParam) {
      setSelectedBrands([]);
    }
  }, [selectedCategories, categories]);

  // Apply filtering and sorting
  useEffect(() => {
    let filtered = products;

    if (deferredSearch.trim()) {
      filtered = filtered.filter((product) =>
        product.name.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(deferredSearch.toLowerCase())) ||
        (product.brand && product.brand.toLowerCase().includes(deferredSearch.toLowerCase()))
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((product) => {
        let productCategories = [];
        if (Array.isArray(product.categories)) {
          product.categories.forEach(cat => {
            let val = cat;
            while (typeof val === 'string') {
              try { val = JSON.parse(val); } catch { break; }
            }
            if (Array.isArray(val)) {
              productCategories = productCategories.concat(val);
            } else {
              productCategories.push(val);
            }
          });
        }
        return productCategories.some((category) =>
          selectedCategories.includes(category)
        );
      });
    }

    if (selectedBrands.length > 0) {
      filtered = filtered.filter((product) =>
        selectedBrands.some(b => product.brand && product.brand.toLowerCase() === b.toLowerCase())
      );
    }

    if (selectedGenders.length > 0) {
      filtered = filtered.filter((product) =>
        selectedGenders.includes(product.gender)
      );
    }

    if (appliedPrice.min !== "" || appliedPrice.max !== "") {
      filtered = filtered.filter((product) => {
        const price = product.discountPrice || product.mainPrice;
        const min = appliedPrice.min !== "" ? parseFloat(appliedPrice.min) : 0;
        const max = appliedPrice.max !== "" ? parseFloat(appliedPrice.max) : Infinity;
        return price >= min && price <= max;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-low":
          return (a.discountPrice || a.mainPrice) - (b.discountPrice || b.mainPrice);
        case "price-high":
          return (b.discountPrice || b.mainPrice) - (a.discountPrice || a.mainPrice);
        case "newest":
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
  }, [selectedCategories, selectedBrands, selectedGenders, products, deferredSearch, sortBy, appliedPrice]);

  // Fetch data on mount
  useEffect(() => {
    getCategories();
    getGenders();
    getProducts(urlSearch, urlCategory, urlBrand);
  }, []);

  // Sync URL search param changes
  useEffect(() => {
    const urlSearch = searchParams.get('search') || '';
    setSearchQuery(urlSearch);
    const urlCat = searchParams.get('category') || '';
    const urlBrandParam = searchParams.get('brand') || '';
    getProducts(urlSearch, urlCat, urlBrandParam);
  }, [searchParams]);

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSelectedGenders([]);
    setSearchQuery("");
    setPriceRange({ min: "", max: "" });
    setAppliedPrice({ min: "", max: "" });
    setSortBy("name");
    urlParamsApplied.current = false;
    getProducts();
  };

  const activeFiltersCount = selectedCategories.filter(c => {
    const cat = categories.find(ct => ct.name === c);
    return cat && cat.children; // only count subcategories, not parents
  }).length + selectedBrands.length + selectedGenders.length + 
    (appliedPrice.min !== "" ? 1 : 0) + (appliedPrice.max !== "" ? 1 : 0) + 
    (deferredSearch.trim() !== "" ? 1 : 0);

  const sectionProps = { expandedSections, toggleSection };
  const priceProps = {
    maxPrice,
    priceRange,
    onPriceChange: handlePriceChange,
    onSliderChange: handleSliderChange,
    onApply: applyPriceFilter,
    onReset: resetPriceFilter,
  };

  return (
    <div className="bg-gradient-to-br from-maybelline-light via-pure-white to-white">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-maybelline-pink via-maybelline-rose to-maybelline-magenta py-8 sm:py-12">
        <div className="max-w-7xl mx-auto container-padding-mobile">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-3 sm:mb-4">
              Discover Our Products
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
              Explore our wide range of high-quality products with amazing deals
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto container-padding-mobile py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="w-full lg:w-1/4">
            {/* Mobile Filter Button */}
            <div className="lg:hidden flex items-center justify-between mb-4 sm:mb-6">
              <button
                className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white rounded-full shadow-lg font-semibold hover:from-maybelline-magenta hover:to-maybelline-pink transition-all duration-300 transform hover:scale-105 touch-target text-sm sm:text-base"
                onClick={() => setShowFilters(true)}
              >
                <FaFilter />
                Filters {activeFiltersCount > 0 && (
                  <span className="bg-pure-white text-maybelline-pink px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-bold">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 sm:p-3 rounded-xl transition-all duration-300 transform hover:scale-105 touch-target ${
                    viewMode === "grid" 
                    ? "bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white shadow-lg" 
                    : "bg-pure-white text-gray-600 hover:bg-gray-50 shadow-md"
                }`}
              >
                <FaTh size={14} className="sm:w-4 sm:h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 sm:p-3 rounded-xl transition-all duration-300 transform hover:scale-105 touch-target ${
                  viewMode === "list" 
                    ? "bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white shadow-lg" 
                    : "bg-pure-white text-gray-600 hover:bg-gray-50 shadow-md"
                  }`}
                >
                  <FaListUl size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Filter Drawer */}
            {showFilters && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div
                  className="flex-1 bg-black bg-opacity-50 backdrop-blur-sm"
                  onClick={() => setShowFilters(false)}
                />
                <div className="w-80 max-w-full bg-white shadow-2xl overflow-y-auto">
                  <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6">
                    <div className="flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
                      <button
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                        onClick={() => setShowFilters(false)}
                      >
                        <FaTimes size={20} />
                      </button>
                    </div>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={clearAllFilters}
                        className="mt-4 w-full px-4 py-2 bg-gradient-to-r from-maybelline-pink to-maybelline-magenta text-pure-white rounded-lg hover:from-maybelline-magenta hover:to-maybelline-rose transition-all duration-200 font-semibold transform hover:scale-105"
                      >
                        Clear All Filters ({activeFiltersCount})
                      </button>
                    )}
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <FilterSection {...sectionProps} title="Price Range" section="price" icon={<span className="text-green-500">💰</span>}>
                      <PriceRangeFilter {...priceProps} idPrefix="pf-m" />
                    </FilterSection>

                    <FilterSection {...sectionProps} title="Sort By" section="sort" icon={<FaSort className="text-maybelline-pink" />}>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
                      >
                        <option value="name">Name A-Z</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="newest">Newest First</option>
                      </select>
                    </FilterSection>

                    <FilterSection {...sectionProps} title="Categories" section="category" icon={<span className="text-maybelline-pink">📂</span>}>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {categories.length > 0 ? (
                          categories.map((category) => (
                            <div key={category._id}>
                              <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 group">
                                <input
                                  type="checkbox"
                                  value={category.name}
                                  checked={selectedCategories.includes(category.name)}
                                  onChange={() => handleCategoryChange(category.name)}
                                  className="mr-3 accent-maybelline-pink transform scale-110"
                                />
                                <span className="text-gray-900 font-medium text-sm">{category.name}</span>
                              </label>
                              {category.children && category.children.length > 0 && (
                                <div className="ml-5 space-y-1">
                                  {category.children.map((sub) => (
                                    <label key={sub._id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors duration-200 group">
                                      <input
                                        type="checkbox"
                                        value={sub.name}
                                        checked={selectedCategories.includes(sub.name)}
                                        onChange={() => handleCategoryChange(sub.name)}
                                        className="mr-2 accent-maybelline-pink transform scale-110"
                                      />
                                      <span className="text-gray-600 text-xs group-hover:text-gray-900 transition-colors duration-200">{sub.name}</span>
                                    </label>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Loading categories...</p>
                        )}
                      </div>
                    </FilterSection>

                    <FilterSection {...sectionProps} title="Brand" section="brand" icon={<span className="text-maybelline-pink">🏷️</span>}>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {brands.length > 0 ? (
                          brands.map((brand) => (
                            <label key={brand} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 group">
                              <input
                                type="checkbox"
                                value={brand}
                                checked={selectedBrands.includes(brand)}
                                onChange={() => {
                                  setSelectedBrands(prev =>
                                    prev.includes(brand)
                                      ? prev.filter(b => b !== brand)
                                      : [...prev, brand]
                                  );
                                }}
                                className="mr-3 accent-maybelline-pink transform scale-110"
                              />
                              <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{brand}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">Select a subcategory to see brands</p>
                        )}
                      </div>
                    </FilterSection>

                    <FilterSection {...sectionProps} title="Gender" section="gender" icon={<span className="text-pink-500">👥</span>}>
                      <div className="space-y-2">
                        {genders.length > 0 ? (
                          genders.map((gender) => (
                            <label key={gender._id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 group">
                              <input
                                type="checkbox"
                                value={gender.type}
                                checked={selectedGenders.includes(gender.type)}
                                onChange={() => handleGenderChange(gender.type)}
                                className="mr-3 accent-maybelline-pink transform scale-110"
                              />
                              <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{gender.type}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">Loading genders...</p>
                        )}
                      </div>
                    </FilterSection>
                  </div>
                </div>
              </div>
            )}

            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
                  {activeFiltersCount > 0 && (
                    <button
                    onClick={clearAllFilters}
                    className="px-3 py-1 bg-gradient-to-r from-maybelline-pink to-maybelline-magenta text-pure-white rounded-full text-sm font-semibold hover:from-maybelline-magenta hover:to-maybelline-rose transition-all duration-200 transform hover:scale-105"
                    >
                      Clear ({activeFiltersCount})
                    </button>
                  )}
                </div>
                
                <FilterSection {...sectionProps} title="Price Range" section="price" icon={<span className="text-green-500">💰</span>}>
                  <PriceRangeFilter {...priceProps} idPrefix="pf-d" />
                </FilterSection>

                <FilterSection {...sectionProps} title="Sort By" section="sort" icon={<FaSort className="text-maybelline-pink" />}>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
                  >
                    <option value="name">Name A-Z</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="newest">Newest First</option>
                  </select>
                </FilterSection>

                <FilterSection {...sectionProps} title="Categories" section="category" icon={<span className="text-maybelline-pink">📂</span>}>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categories.length > 0 ? (
                      categories.map((category) => (
                        <div key={category._id}>
                          <label className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 group">
                            <input
                              type="checkbox"
                              value={category.name}
                              checked={selectedCategories.includes(category.name)}
                              onChange={() => handleCategoryChange(category.name)}
                              className="mr-3 accent-maybelline-pink transform scale-110"
                            />
                            <span className="text-gray-900 font-medium text-sm">{category.name}</span>
                          </label>
                          {category.children && category.children.length > 0 && (
                            <div className="ml-5 space-y-1">
                              {category.children.map((sub) => (
                                <label key={sub._id} className="flex items-center cursor-pointer hover:bg-gray-50 p-1.5 rounded transition-colors duration-200 group">
                                  <input
                                    type="checkbox"
                                    value={sub.name}
                                    checked={selectedCategories.includes(sub.name)}
                                    onChange={() => handleCategoryChange(sub.name)}
                                    className="mr-2 accent-maybelline-pink transform scale-110"
                                  />
                                  <span className="text-gray-600 text-xs group-hover:text-gray-900 transition-colors duration-200">{sub.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Loading categories...</p>
                    )}
                  </div>
                </FilterSection>

                    <FilterSection {...sectionProps} title="Brand" section="brand" icon={<span className="text-maybelline-pink">🏷️</span>}>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {brands.length > 0 ? (
                          brands.map((brand) => (
                            <label key={brand} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 group">
                              <input
                                type="checkbox"
                                value={brand}
                                checked={selectedBrands.includes(brand)}
                                onChange={() => {
                                  setSelectedBrands(prev =>
                                    prev.includes(brand)
                                      ? prev.filter(b => b !== brand)
                                      : [...prev, brand]
                                  );
                                }}
                                className="mr-3 accent-maybelline-pink transform scale-110"
                              />
                              <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{brand}</span>
                            </label>
                          ))
                        ) : (
                          <p className="text-sm text-gray-400 italic">Select a subcategory to see brands</p>
                        )}
                      </div>
                    </FilterSection>

                <FilterSection {...sectionProps} title="Gender" section="gender" icon={<span className="text-pink-500">👥</span>}>
                  <div className="space-y-2">
                    {genders.length > 0 ? (
                      genders.map((gender) => (
                        <label key={gender._id} className="flex items-center cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors duration-200 group">
                          <input
                            type="checkbox"
                            value={gender.type}
                            checked={selectedGenders.includes(gender.type)}
                            onChange={() => handleGenderChange(gender.type)}
                            className="mr-3 accent-maybelline-pink transform scale-110"
                          />
                          <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-200">{gender.type}</span>
                        </label>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">Loading genders...</p>
                    )}
                  </div>
                </FilterSection>
              </div>
            </div>
          </aside>

          {/* Products List */}
          <main className="w-full lg:w-3/4">
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200 bg-white"
                />
              </div>
            </div>

            {/* Desktop Header */}
            <div className="hidden lg:flex items-center justify-between mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Products ({filteredProducts.length})
                </h1>
                {activeFiltersCount > 0 && (
                  <p className="text-sm sm:text-base text-gray-600">
                    {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} applied
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-105 touch-target ${
                    viewMode === "grid" 
                    ? "bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white shadow-lg" 
                    : "bg-pure-white text-gray-600 hover:bg-gray-50 shadow-md"
                }`}
              >
                <FaTh size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-3 rounded-xl transition-all duration-300 transform hover:scale-105 touch-target ${
                  viewMode === "list" 
                    ? "bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white shadow-lg" 
                    : "bg-pure-white text-gray-600 hover:bg-gray-50 shadow-md"
                  }`}
                >
                  <FaListUl size={16} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-48 sm:h-64">
                <div className="animate-spin rounded-full h-10 sm:h-12 w-10 sm:w-12 border-b-2 border-maybelline-pink"></div>
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className={`grid gap-4 sm:gap-6 ${
                viewMode === "grid" 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" 
                  : "grid-cols-1"
              }`}>
                {filteredProducts.map((info) => (
                  <div key={info._id} className={viewMode === "list" ? "bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300" : ""}>
                    <ProductCard Data={info} viewMode={viewMode} onAddToCart={(id) => { setCartModalProductId(id); }} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16">
                <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No products found</h3>
                <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                  Try adjusting your filters or search terms
                </p>
                <button
                  onClick={clearAllFilters}
                   className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-maybelline-pink to-maybelline-rose text-pure-white rounded-full font-semibold hover:from-maybelline-magenta hover:to-maybelline-pink transition-all duration-200 transform hover:scale-105 shadow-lg touch-target text-sm sm:text-base"
                >
                  Clear All Filters
                </button>
              </div>
            )}
            <ProductCartModal productId={cartModalProductId} isOpen={!!cartModalProductId} onClose={() => setCartModalProductId(null)} />
          </main>
        </div>
      </div>
    </div>
  );
}

export default Products;
