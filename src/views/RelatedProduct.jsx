'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaLink } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const RelatedProductsManagement = () => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [relatedName, setRelatedName] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchRelatedProducts();
    fetchProducts();
  }, []);

  const fetchRelatedProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/relatedproduct`);
      setRelatedProducts(response.data);
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddRelatedProduct = async () => {
    const selectedProductData = selectedProductIds.map(id => products.find(product => product._id === id));
    if (!selectedProductData.length || !relatedName) return;

    const relatedProductData = {
      name: relatedName,
      relatedProducts: selectedProductData.map(product => ({
        productId: product._id,
        name: product.name,
        mainPrice: product.mainPrice,
        discountPrice: product.discountPrice,
        mainBadgeName: product.mainBadgeName,
        mainBadgeColor: product.mainBadgeColor,
        mainImage: product.mainImage,
      })),
    };

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/createrelatedproduct`, relatedProductData);
      setRelatedProducts([...relatedProducts, response.data]);
      setRelatedName('');
      setSelectedProductIds([]);
    } catch (error) {
      console.error('Error adding related product:', error);
    }
  };

  const handleUpdateRelatedProduct = async () => {
    const selectedProductData = selectedProductIds.map(id => products.find(product => product._id === id));
    if (!selectedProductData.length || !relatedName) return;

    const updatedRelatedProductData = {
      name: relatedName,
      relatedProducts: selectedProductData.map(product => ({
        productId: product._id,
        name: product.name,
        mainPrice: product.mainPrice,
        discountPrice: product.discountPrice,
        mainBadgeName: product.mainBadgeName,
        mainBadgeColor: product.mainBadgeColor,
        mainImage: product.mainImage,
      })),
    };

    try {
      const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/updaterelatedproduct/${editingProduct._id}`, updatedRelatedProductData);
      setRelatedProducts(relatedProducts.map(item => (item._id === editingProduct._id ? response.data : item)));
      setRelatedName('');
      setSelectedProductIds([]);
      setEditingProduct(null);
    } catch (error) {
      console.error('Error updating related product:', error);
    }
  };

  const handleDeleteRelatedProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this related product group?')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/deleterelatedproduct/${id}`);
        setRelatedProducts(relatedProducts.filter(item => item._id !== id));
      } catch (error) {
        console.error('Error deleting related product:', error);
      }
    }
  };

  const startEditing = (relatedProduct) => {
    setRelatedName(relatedProduct.name);
    setSelectedProductIds(relatedProduct.relatedProducts.map(product => product.productId));
    setEditingProduct(relatedProduct);
  };

  const filteredRelatedProducts = relatedProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const handleProductSelect = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedProductIds(selectedOptions);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="w-full max-w-5xl mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-[#4A4A4A] hover:text-[#1B1B1B] transition min-h-[44px]"
            aria-label="Go Back"
          >
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Related Products Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-[#BDBDBD]">
            <FaSearch className="text-[#4A4A4A] ml-2" />
            <input
              type="text"
              placeholder="Search related products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 w-full sm:w-64 focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B]"
            />
          </div>
          <button
            onClick={() => (editingProduct ? handleUpdateRelatedProduct() : handleAddRelatedProduct())}
            className="flex items-center justify-center bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition min-h-[44px]"
          >
            <FaPlus className="mr-2" /> {editingProduct ? 'Update Related Product' : 'Add Related Product'}
          </button>
        </div>
      </div>

      <div className="p-4 border border-[#BDBDBD] w-full max-w-5xl bg-white">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaLink className="mr-2 text-[#B1123B]" />
            {editingProduct ? 'Edit Related Product Group' : 'Add New Related Product Group'}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Group Name</label>
              <input
                type="text"
                placeholder="Enter related product group name..."
                value={relatedName}
                onChange={(e) => setRelatedName(e.target.value)}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Search Products</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A]" />
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Select Products</label>
              <select
                multiple
                value={selectedProductIds}
                onChange={handleProductSelect}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] h-auto min-h-[120px]"
                size="6"
              >
                {filteredProducts.length === 0 ? (
                  <option disabled>No products found matching your search</option>
                ) : (
                  filteredProducts.map(product => (
                    <option key={product._id} value={product._id}>
                      {product.name} - BDT{product.mainPrice}
                    </option>
                  ))
                )}
              </select>
              <div className="flex justify-between items-center mt-1">
                <p className="text-xs text-[#4A4A4A]">Hold Ctrl/Cmd to select multiple products</p>
                <p className="text-xs text-[#4A4A4A]">
                  {filteredProducts.length} of {products.length} products
                </p>
              </div>
            </div>
            {selectedProductIds.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Selected Products ({selectedProductIds.length})</label>
                <div className="bg-[#FAF8F6] p-3 border border-[#BDBDBD]">
                  {selectedProductIds.map(productId => {
                    const product = products.find(p => p._id === productId);
                    return product ? (
                      <div key={productId} className="flex justify-between items-center py-1">
                        <span className="text-sm text-[#1B1B1B]">{product.name}</span>
                        <span className="text-sm text-[#4A4A4A]">BDT{product.mainPrice}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border border-[#BDBDBD]">
            <thead>
              <tr className="bg-[#F4F4F4]">
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Group Name</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Products Count</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-center font-semibold text-[#1B1B1B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B]"></div>
                      <span className="ml-2 text-[#4A4A4A]">Loading related products...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRelatedProducts.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-8 text-[#4A4A4A]">
                    {searchQuery ? 'No related product groups found matching your search.' : 'No related product groups found.'}
                  </td>
                </tr>
              ) : (
                filteredRelatedProducts.map(product => (
                  <tr key={product._id} className="hover:bg-[#F4F4F4] border-b border-[#BDBDBD]">
                    <td className="py-3 px-4 font-medium text-[#1B1B1B]">{product.name}</td>
                    <td className="py-3 px-4 text-[#4A4A4A]">{product.relatedProducts?.length || 0} products</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center space-x-2">
                        <button
                          className="flex items-center bg-[#1B1B1B] text-white px-3 py-1 text-sm hover:bg-[#4A4A4A] transition min-h-[44px]"
                          onClick={() => startEditing(product)}
                        >
                          <FaEdit className="mr-1" /> Edit
                        </button>
                        <button
                          className="flex items-center bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600 transition min-h-[44px]"
                          onClick={() => handleDeleteRelatedProduct(product._id)}
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

        <div className="md:hidden space-y-3 p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B] mx-auto"></div>
              <span className="ml-2 text-[#4A4A4A]">Loading related products...</span>
            </div>
          ) : filteredRelatedProducts.length === 0 ? (
            <div className="text-center py-8 text-[#4A4A4A]">
              {searchQuery ? 'No related product groups found matching your search.' : 'No related product groups found.'}
            </div>
          ) : (
            filteredRelatedProducts.map(product => (
              <div key={product._id} className="bg-white border border-[#BDBDBD] p-4">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-medium text-[#1B1B1B]">{product.name}</span>
                  <span className="text-sm text-[#4A4A4A]">{product.relatedProducts?.length || 0} products</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 text-sm hover:bg-[#4A4A4A] transition min-h-[44px] min-w-[44px]"
                    onClick={() => startEditing(product)}
                  >
                    <FaEdit className="mr-1" /> Edit
                  </button>
                  <button
                    className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                    onClick={() => handleDeleteRelatedProduct(product._id)}
                  >
                    <FaTrash className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatedProductsManagement;
