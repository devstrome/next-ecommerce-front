'use client'
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaArrowLeft, FaSearch } from "react-icons/fa";
import { useRouter } from "next/navigation";

const CouponShow = () => {
  const [coupons, setCoupons] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchCoupons();
    fetchProducts();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/coupons`);
      setCoupons(response.data);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/products`);
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const getProductById = (productId) => {
    return products.find((product) => product._id === productId);
  };

  const renderCouponDetails = (coupon) => {
    return (
      <div key={coupon._id} className="mb-4 border p-4 rounded-lg">
        <h3 className="font-bold">{coupon.code} - {coupon.discount}% off</h3>
        <p>Expires on: {new Date(coupon.expirationDate).toLocaleDateString()}</p>
        <div>
          <h4 className="text-lg font-semibold">Applicable Products:</h4>
          {coupon.applicableProducts.map((productId) => {
            const product = getProductById(productId);
            return (
              <div key={productId} className="mb-2">
                <h5 className="text-md font-medium">{product?.name}</h5>

                {/* Display Colors */}
                <div>
                  <strong>Colors:</strong>
                  {coupon.color.map((color, index) => (
                    <span key={index} className="bg-gray-200 px-2 py-1 rounded-full mr-2">{color}</span>
                  ))}
                </div>

                {/* Display Sizes */}
                <div>
                  <strong>Sizes:</strong>
                  {coupon.size.map((size, index) => (
                    <span key={index} className="bg-gray-200 px-2 py-1 rounded-full mr-2">{size}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-100 p-20">
      <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
        <button onClick={() => router.back()} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition">
          <FaArrowLeft /> Back
        </button>
        <h1 className="text-2xl font-bold">Coupon Management</h1>
        <input
          type="text"
          placeholder="Search coupons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 bg-white rounded px-4 py-2"
        />
        <FaSearch />
      </div>

      <div className="w-full max-w-5xl bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Coupons List</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="space-y-4">
            {coupons.filter(coupon => coupon.code.toLowerCase().includes(searchQuery.toLowerCase())).map(renderCouponDetails)}
          </div>
        )}
      </div>
    </div>
  );
};

export default CouponShow;
