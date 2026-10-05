'use client'
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaRedo, FaBarcode } from 'react-icons/fa';
import { getStorage } from "../lib/storage";
import { useRouter } from "next/navigation";

const ProductCRUDPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [stockFilter, setStockFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const router = useRouter();

  const authHeaders = () => ({ headers: { Authorization: `Bearer ${getStorage('adminAccessToken')}` } });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleRefresh = () => {
    fetchProducts();
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} product(s)?`)) return;

    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${id}`, authHeaders())
        )
      );
      setProducts(prev => prev.filter(p => !selectedIds.has(p._id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error deleting products:', error);
      alert(error.response?.data?.message || 'Failed to delete some products. Please try again.');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredProducts.map(p => p._id)));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const missingSkuCount = products.filter(p => !p.sku).length;

  const handleGenerateSKUs = async () => {
    if (!window.confirm(`Generate SKUs for ${missingSkuCount} product(s) without one?`)) return;
    try {
      const token = getStorage('adminAccessToken');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/api/products/generate-skus`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { count } = response.data;
      alert(`Generated ${count} SKU(s)!`);
      fetchProducts();
    } catch (error) {
      console.error('Error generating SKUs:', error);
      alert(error.response?.data?.message || 'Failed to generate SKUs');
    }
  };

  const handleBack = () => router.back();

  const handleCreate = () => router.push("./createproducts");

  const handleDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/products/${productId}`, authHeaders());
      setProducts((prev) => prev.filter((product) => product._id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
      alert(error.response?.data?.message || 'Failed to delete product. Please try again.');
    }
  };

  const toggleExpanded = (productId) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const normalizedProducts = products.map((p) => {
    const flatCats = [];
    const pushCat = (v, depth = 0) => {
      if (Array.isArray(v)) { v.forEach((x) => pushCat(x, depth + 1)); return; }
      if (typeof v === 'string') {
        const t = v.trim();
        if (!t) return;
        if (depth < 10) {
          try { pushCat(JSON.parse(t), depth + 1); return; } catch {}
        }
        flatCats.push(t);
        return;
      }
      if (v !== null && v !== undefined) flatCats.push(String(v));
    };
    (Array.isArray(p.categories) ? p.categories : []).forEach((item) => pushCat(item));
    const categoriesStr = flatCats.join(", ");
    const variantCount = Array.isArray(p.variants) ? p.variants.length : 0;
    const shippingNames = Array.isArray(p.variants)
      ? Array.from(new Set(
          p.variants
            .map(v => v.shippingName)
            .filter(Boolean)
        ))
      : [];
    const shippingLabel = shippingNames.length === 0
      ? "-"
      : shippingNames.length === 1
        ? shippingNames[0]
        : `${shippingNames[0]} +${shippingNames.length - 1}`;
    
    const totalStock = Array.isArray(p.variants) 
      ? p.variants.reduce((total, variant) => {
          if (variant.stockBySize && Array.isArray(variant.stockBySize)) {
            return total + variant.stockBySize.reduce((sum, stock) => sum + (stock || 0), 0);
          }
          return total + (variant.stock || 0);
        }, 0)
      : 0;
    
    const variantStockBreakdown = Array.isArray(p.variants) 
      ? p.variants.map(variant => {
          const variantTotalStock = variant.stockBySize && Array.isArray(variant.stockBySize)
            ? variant.stockBySize.reduce((sum, stock) => sum + (stock || 0), 0)
            : (variant.stock || 0);
          
          return {
            color: variant.colorName || 'Unknown',
            stock: variantTotalStock,
            sizes: variant.sizes || [],
            stockBySize: variant.stockBySize || []
          };
        })
      : [];
    
    const stockStatus = totalStock === 0 
      ? { text: 'Out of Stock', color: 'text-red-500' }
      : totalStock < 10 
        ? { text: `Low Stock (${totalStock})`, color: 'text-maybelline-pink' }
        : { text: `In Stock (${totalStock})`, color: 'text-dark-gray' };
    
    return { 
      ...p, 
      _brand: p.brand || '',
      _categoriesStr: categoriesStr, 
      _variantCount: variantCount, 
      _shippingLabel: shippingLabel, 
      _shippingNames: shippingNames,
      _totalStock: totalStock,
      _stockStatus: stockStatus,
      _variantStockBreakdown: variantStockBreakdown
    };
  });

  const filteredProducts = normalizedProducts.filter((product) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      product.name?.toLowerCase().includes(query) ||
      (product.sku && product.sku.toLowerCase().includes(query)) ||
      (product._brand && product._brand.toLowerCase().includes(query)) ||
      (product._categoriesStr && product._categoriesStr.toLowerCase().includes(query)) ||
      (product._shippingNames && product._shippingNames.join(", ").toLowerCase().includes(query))
    );

    let matchesStockFilter = true;
    switch (stockFilter) {
      case 'low':
        matchesStockFilter = product._totalStock > 0 && product._totalStock <= 10;
        break;
      case 'out':
        matchesStockFilter = product._totalStock === 0;
        break;
      case 'in':
        matchesStockFilter = product._totalStock > 10;
        break;
      default:
        matchesStockFilter = true;
    }

    return matchesSearch && matchesStockFilter;
  });

  return (
    <div className="bg-pure-white min-h-screen p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <button onClick={handleBack} className="flex items-center text-dark-gray hover:text-black transition" aria-label="Go Back">
              <FaArrowLeft className="text-2xl" />
            </button>
            <h1 className="font-heading text-3xl sm:text-4xl text-black" style={{ fontFamily: "'Inter', serif" }}>Product Management</h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <div className="flex items-center bg-white border border-cool-gray flex-1 sm:flex-initial">
              <FaSearch className="text-mid-gray ml-3" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 w-full sm:w-64 bg-transparent focus:outline-none focus:ring-2 focus:ring-charcoal text-black"
              />
            </div>
            
            <div className="flex space-x-3">
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
                className="flex-1 sm:flex-initial px-3 py-2 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-charcoal"
              >
                <option value="all">All Stock</option>
                <option value="in">In Stock</option>
                <option value="low">Low Stock</option>
                <option value="out">Out of Stock</option>
              </select>

              <button 
                onClick={handleRefresh} 
                className="flex items-center bg-dark-gray text-white px-3 py-2 hover:bg-black transition disabled:opacity-50 min-h-[44px]"
                disabled={loading}
              >
                <FaRedo className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> 
                Refresh
              </button>
              {missingSkuCount > 0 && (
                <button
                  onClick={handleGenerateSKUs}
                  className="flex items-center bg-maybelline-pink text-white px-3 py-2 hover:bg-maybelline-magenta transition min-h-[44px]"
                >
                  <FaBarcode className="mr-2" /> Gen SKUs ({missingSkuCount})
                </button>
              )}
              <button onClick={handleCreate} className="flex items-center bg-black text-white px-4 py-2 hover:bg-maybelline-pink transition min-h-[44px]">
                <FaPlus className="mr-2" /> Create
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center bg-red-500 text-white px-4 py-2 hover:bg-red-600 transition min-h-[44px]"
                >
                  <FaTrash className="mr-2" /> Delete ({selectedIds.size})
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-cool-gray">
          <div className="p-4 border-b border-cool-gray bg-pure-white">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <div className="text-sm font-medium text-dark-gray">
                Total Products: {filteredProducts.length}
              </div>
              <div className="flex flex-wrap space-x-4 text-sm">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-dark-gray mr-2"></span>
                  <span className="text-dark-gray">In Stock: {filteredProducts.filter(p => p._totalStock > 10).length}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-maybelline-pink mr-2"></span>
                  <span className="text-dark-gray">Low Stock: {filteredProducts.filter(p => p._totalStock > 0 && p._totalStock <= 10).length}</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 mr-2"></span>
                  <span className="text-dark-gray">Out of Stock: {filteredProducts.filter(p => p._totalStock === 0).length}</span>
                </div>
                <div className="flex items-center border-l border-mid-gray pl-4">
                  <span className="font-medium text-black">Total Stock: {filteredProducts.reduce((sum, p) => sum + p._totalStock, 0)}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="border-b border-cool-gray bg-pure-white">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0}
                      onChange={toggleSelectAll}
                      className="accent-crimson"
                    />
                  </th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Image</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Brand</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Price (BDT)</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">SKU</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Variants</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Stock</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Shipping</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-dark-gray uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="text-center py-8 text-dark-gray">
                        Loading products...
                      </td>
                  </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="11" className="text-center py-8 text-dark-gray">
                        No products found.
                      </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product._id} className="border-b border-cool-gray hover:bg-pure-white transition">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(product._id)}
                          onChange={() => toggleSelectOne(product._id)}
                          className="accent-crimson"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <img
                          src={product.mainImage || 'https://via.placeholder.com/50'}
                          alt={product.name}
                          className="w-12 h-12 object-contain"
                        />
                      </td>
                      <td className="py-3 px-4 text-black">{product.name}</td>
                      <td className="py-3 px-4 text-dark-gray">{product._brand || '-'}</td>
                      <td className="py-3 px-4 text-black">{parseFloat(product.mainPrice).toFixed(2)}</td>
                      <td className="py-3 px-4 text-dark-gray">{product.sku || "N/A"}</td>
                      <td className="py-3 px-4 text-dark-gray">{product._categoriesStr || "N/A"}</td>
                      <td className="py-3 px-4 text-dark-gray">{product._variantCount}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${product._stockStatus.color}`}>
                              {product._stockStatus.text}
                            </span>
                            <button
                              onClick={() => toggleExpanded(product._id)}
                              className="text-xs text-maybelline-pink hover:text-rose ml-2"
                            >
                              {expandedProducts.has(product._id) ? 'Hide' : 'Details'}
                            </button>
                          </div>
                          
                          {product._variantStockBreakdown.length > 0 && (
                            <div className="text-xs text-dark-gray mt-1">
                              {product._variantStockBreakdown.map((variant, idx) => (
                                <div key={idx} className="flex justify-between">
                                  <span>{variant.color}:</span>
                                  <span className={variant.stock === 0 ? 'text-red-500' : variant.stock < 5 ? 'text-maybelline-pink' : 'text-dark-gray'}>
                                    {variant.stock}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {expandedProducts.has(product._id) && (
                            <div className="mt-2 p-2 bg-cool-gray text-xs">
                              <div className="font-medium mb-1 text-black">Size Details:</div>
                              {product._variantStockBreakdown.map((variant, idx) => (
                                <div key={idx} className="mb-2">
                                  <div className="font-medium text-dark-gray">{variant.color}:</div>
                                  <div className="ml-2">
                                    {variant.sizes.map((size, sizeIdx) => {
                                      const stock = variant.stockBySize[sizeIdx] || 0;
                                      return (
                                        <div key={sizeIdx} className="flex justify-between">
                                          <span className="text-dark-gray">{size}:</span>
                                          <span className={stock === 0 ? 'text-red-500' : stock < 3 ? 'text-maybelline-pink' : 'text-dark-gray'}>
                                            {stock}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-dark-gray">{product._shippingLabel}</td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <button
                            className="flex items-center bg-black text-white px-3 py-2 text-sm hover:bg-maybelline-pink transition min-h-[44px] min-w-[44px] justify-center"
                            onClick={() => router.push(`./${product._id}`)}
                          >
                            View
                          </button>
                          <button
                            className="flex items-center bg-maybelline-pink text-white px-3 py-2 text-sm hover:bg-rose transition min-h-[44px] min-w-[44px] justify-center"
                            onClick={() => router.push(`./edit/${product._id}`)}
                          >
                            <FaEdit className="mr-1" /> Edit
                          </button>
                          <button
                            className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px] justify-center"
                            onClick={() => handleDelete(product._id)}
                          >
                            <FaTrash className="mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {loading ? (
              <div className="text-center py-8 text-dark-gray">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-dark-gray">No products found.</div>
            ) : (
              <div className="divide-y divide-cool-gray">
                {filteredProducts.map((product) => (
                  <div key={product._id} className="p-4 hover:bg-pure-white transition">
                    <div className="flex gap-4">
                      <img
                        src={product.mainImage || 'https://via.placeholder.com/50'}
                        alt={product.name}
                        className="w-16 h-16 object-contain flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-black font-medium truncate">{product.name}</h3>
                        <p className="text-sm text-dark-gray">{product._brand || '-'}</p>
                        <p className="text-sm text-maybelline-pink font-semibold">BDT{parseFloat(product.mainPrice).toFixed(2)}</p>
                        <p className="text-xs text-dark-gray mt-1">SKU: {product.sku || 'N/A'} | Category: {product._categoriesStr || 'N/A'}</p>
                        <p className="text-xs text-dark-gray">Shipping: {product._shippingLabel}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className={`text-sm font-medium ${product._stockStatus.color}`}>
                            {product._stockStatus.text}
                          </span>
                          <button
                            onClick={() => toggleExpanded(product._id)}
                            className="text-xs text-maybelline-pink hover:text-rose"
                          >
                            {expandedProducts.has(product._id) ? 'Hide' : 'Details'}
                          </button>
                        </div>
                        {expandedProducts.has(product._id) && product._variantStockBreakdown.length > 0 && (
                          <div className="mt-2 p-2 bg-cool-gray text-xs">
                            {product._variantStockBreakdown.map((variant, idx) => (
                              <div key={idx} className="mb-1">
                                <span className="font-medium text-dark-gray">{variant.color}: </span>
                                <span className={variant.stock === 0 ? 'text-red-500' : variant.stock < 5 ? 'text-maybelline-pink' : 'text-dark-gray'}>
                                  {variant.stock}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-3 mt-3">
                      <button
                        className="flex-1 flex items-center justify-center bg-black text-white px-4 py-3 text-sm font-medium hover:bg-maybelline-pink transition min-h-[44px]"
                        onClick={() => router.push(`./${product._id}`)}
                      >
                        View
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center bg-maybelline-pink text-white px-4 py-3 text-sm font-medium hover:bg-rose transition min-h-[44px]"
                        onClick={() => router.push(`./edit/${product._id}`)}
                      >
                        <FaEdit className="mr-2" /> Edit
                      </button>
                      <button
                        className="flex-1 flex items-center justify-center bg-red-500 text-white px-4 py-3 text-sm font-medium hover:bg-red-600 transition min-h-[44px]"
                        onClick={() => handleDelete(product._id)}
                      >
                        <FaTrash className="mr-2" /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCRUDPage;
