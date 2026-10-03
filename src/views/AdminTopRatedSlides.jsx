'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaArrowLeft, FaSearch, FaStar } from 'react-icons/fa';
import { useRouter } from "next/navigation";

const TopRatedSlidesManagement = () => {
  const [slides, setSlides] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [editingSlide, setEditingSlide] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchSlides();
    fetchProducts();
  }, []);

  const fetchSlides = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/topratedslides`);
      setSlides(response.data);
    } catch (error) {
      console.error('Error fetching top rated slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleAddOrUpdateSlide = async () => {
    const selectedProduct = products.find(product => product._id === selectedProductId);
    if (!selectedProduct) return;

    const slideData = {
      productId: selectedProduct._id,
      name: selectedProduct.name,
      price: selectedProduct.mainPrice,
      discountPrice: selectedProduct.discountPrice,
      imageUrl: selectedProduct.mainImage,
      mainBadgeName: selectedProduct.mainBadgeName,
      mainBadgeColor: selectedProduct.mainBadgeColor,
      rating: selectedProduct.averageRating || 0,
      totalReviews: selectedProduct.totalReviews || 0
    };

    try {
      if (editingSlide) {
        const response = await axios.put(`${process.env.NEXT_PUBLIC_API_URI}/api/updatetopratedslides/${editingSlide._id}`, slideData);
        setSlides(slides.map(slide => (slide._id === editingSlide._id ? response.data : slide)));
      } else {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/createtopratedslides`, slideData);
        setSlides([...slides, response.data]);
      }
      setSelectedProductId('');
      setEditingSlide(null);
    } catch (error) {
      console.error(editingSlide ? 'Error updating top rated slide:' : 'Error adding top rated slide:', error);
    }
  };

  const handleDeleteSlide = async (id) => {
    if (window.confirm('Are you sure you want to delete this top rated slide?')) {
      try {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/deletetopratedslides/${id}`);
        setSlides(slides.filter(slide => slide._id !== id));
      } catch (error) {
        console.error('Error deleting top rated slide:', error);
      }
    }
  };

  const startEditing = (slide) => {
    setSelectedProductId(slide.productId);
    setEditingSlide(slide);
  };

  const filteredSlides = slides.filter(slide =>
    slide.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Top Rated Slides Management</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-white border border-[#BDBDBD]">
            <FaSearch className="text-[#4A4A4A] ml-2" />
            <input
              type="text"
              placeholder="Search top rated slides..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 w-full sm:w-64 focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B]"
            />
          </div>
          <button
            onClick={handleAddOrUpdateSlide}
            className="flex items-center justify-center bg-[#1B1B1B] text-white px-4 py-2 hover:bg-[#4A4A4A] transition min-h-[44px]"
            disabled={!selectedProductId}
          >
            <FaPlus className="mr-2" /> {editingSlide ? 'Update Slide' : 'Add Slide'}
          </button>
        </div>
      </div>

      <div className="p-4 border border-[#BDBDBD] w-full max-w-5xl bg-white">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaStar className="mr-2 text-[#B1123B]" />
            {editingSlide ? 'Edit Top Rated Slide' : 'Add New Top Rated Slide'}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Select Product</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
              >
                <option value="">Choose a product for the top rated slide</option>
                {products.map((product) => (
                  <option key={product._id} value={product._id}>
                    {product.name} - Rating: {product.averageRating || 0}⭐ ({product.totalReviews || 0} reviews)
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full bg-white border border-[#BDBDBD]">
            <thead>
              <tr className="bg-[#F4F4F4]">
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Product Name</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Price</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Discount Price</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Rating</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-left font-semibold text-[#1B1B1B]">Reviews</th>
                <th className="py-3 px-4 border-b border-[#BDBDBD] text-center font-semibold text-[#1B1B1B]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B]"></div>
                      <span className="ml-2 text-[#4A4A4A]">Loading top rated slides...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSlides.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-[#4A4A4A]">
                    {searchQuery ? 'No top rated slides found matching your search.' : 'No top rated slides found.'}
                  </td>
                </tr>
              ) : (
                filteredSlides.map((slide) => (
                  <tr key={slide._id} className="hover:bg-[#F4F4F4] border-b border-[#BDBDBD]">
                    <td className="py-3 px-4 font-medium text-[#1B1B1B]">{slide.name}</td>
                    <td className="py-3 px-4 text-[#4A4A4A]">BDT{slide.price}</td>
                    <td className="py-3 px-4 text-[#4A4A4A]">
                      {slide.discountPrice ? `BDT${slide.discountPrice}` : 'N/A'}
                    </td>
                    <td className="py-3 px-4 text-[#4A4A4A]">
                      <div className="flex items-center">
                        <FaStar className="text-[#B1123B] mr-1" />
                        {slide.rating || 0}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#4A4A4A]">{slide.totalReviews || 0}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center space-x-2">
                        <button
                          className="flex items-center bg-[#1B1B1B] text-white px-3 py-1 text-sm hover:bg-[#4A4A4A] transition min-h-[44px]"
                          onClick={() => startEditing(slide)}
                        >
                          <FaEdit className="mr-1" /> Edit
                        </button>
                        <button
                          className="flex items-center bg-red-500 text-white px-3 py-1 text-sm hover:bg-red-600 transition min-h-[44px]"
                          onClick={() => handleDeleteSlide(slide._id)}
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
              <span className="ml-2 text-[#4A4A4A]">Loading top rated slides...</span>
            </div>
          ) : filteredSlides.length === 0 ? (
            <div className="text-center py-8 text-[#4A4A4A]">
              {searchQuery ? 'No top rated slides found matching your search.' : 'No top rated slides found.'}
            </div>
          ) : (
            filteredSlides.map((slide) => (
              <div key={slide._id} className="bg-white border border-[#BDBDBD] p-4">
                <div className="mb-3">
                  <div className="font-medium text-[#1B1B1B]">{slide.name}</div>
                  <div className="text-sm text-[#4A4A4A]">
                    BDT{slide.price}
                    {slide.discountPrice && <span className="ml-2">→ BDT{slide.discountPrice}</span>}
                  </div>
                  <div className="flex items-center text-sm text-[#4A4A4A] mt-1">
                    <FaStar className="text-[#B1123B] mr-1" />
                    {slide.rating || 0}
                    <span className="ml-2">({slide.totalReviews || 0} reviews)</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 text-sm hover:bg-[#4A4A4A] transition min-h-[44px] min-w-[44px]"
                    onClick={() => startEditing(slide)}
                  >
                    <FaEdit className="mr-1" /> Edit
                  </button>
                  <button
                    className="flex items-center bg-red-500 text-white px-3 py-2 text-sm hover:bg-red-600 transition min-h-[44px] min-w-[44px]"
                    onClick={() => handleDeleteSlide(slide._id)}
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

export default TopRatedSlidesManagement;
