'use client'
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from "next/navigation";
import axios from 'axios';
import { FaBoxOpen, FaCreditCard, FaTruck, FaUser, FaHome, FaPhone, FaMapMarkerAlt, FaCheck } from 'react-icons/fa';
import { FiClock } from 'react-icons/fi';

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await axios.get(`${API_URI}/api/orders/${orderId}`);
        setOrder(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load order. Please try again.');
        console.error('Order fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (orderId) fetchOrder();
  }, [orderId]);

  if (loading) return (
    <div className="min-h-screen bg-pure-white flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-maybelline-pink"></div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-pure-white flex items-center justify-center">
      <div className="max-w-md p-6 card rounded-xl text-center">
        <div className="text-maybelline-pink text-2xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold text-black mb-2 font-heading">Error Loading Order</h2>
        <p className="text-dark-gray mb-4 font-sans">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="btn-primary"
        >
          Back to Home
        </button>
      </div>
    </div>
  );

  if (!order) return null;

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 3);
  const formattedDeliveryDate = deliveryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-pure-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-maybelline-pink rounded-full mb-4">
            <FaCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-black mb-2 font-heading">Order Confirmed!</h1>
          <p className="text-lg text-dark-gray font-sans">
            Your order <span className="font-semibold text-black">#{order.orderId}</span> has been placed successfully.
          </p>
          <p className="text-dark-gray mt-2 font-sans">We've sent a confirmation to your email.</p>
        </div>

        <div className="card rounded-xl mb-8">
          <div className="px-6 py-4 border-b border-cool-gray">
            <h3 className="text-lg font-semibold text-black flex items-center font-heading">
              <FaBoxOpen className="mr-2 text-maybelline-pink" />
              Order Summary
            </h3>
          </div>
          <div className="px-6 py-4">
            <ul className="divide-y divide-cool-gray">
              {order.items.map((item, idx) => (
                <li key={idx} className="py-4">
                  <div className="flex items-center">
                    <img
                      src={item.mainImage}
                      alt={item.name}
                      className="flex-shrink-0 h-16 w-16 rounded-md object-cover border border-cool-gray"
                    />
                    <div className="ml-4 flex-1">
                      <div className="flex justify-between">
                        <h4 className="text-sm font-medium text-black">{item.name}</h4>
                        <p className="ml-4 text-sm font-semibold text-black">BDT{(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="mt-1 text-sm text-dark-gray font-sans">
                        {item.size && <span className="mr-3">Size: {item.size}</span>}
                        {item.color && <span>Color: {item.color}</span>}
                      </div>
                      <div className="mt-1 text-sm text-dark-gray font-sans">
                        Qty: {item.quantity} &times; BDT{item.price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="card rounded-xl">
            <div className="px-6 py-4 border-b border-cool-gray">
              <h3 className="text-lg font-semibold text-black flex items-center font-heading">
                <FaCreditCard className="mr-2 text-maybelline-pink" />
                Payment Information
              </h3>
            </div>
            <div className="px-6 py-5">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-4">
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-dark-gray font-sans">Payment Method</dt>
                  <dd className="mt-1 text-sm text-black capitalize font-sans">
                    {order.paymentMethod.toLowerCase()}
                    {order.paymentDetails?.trxId && (
                      <div className="mt-1 text-sm text-dark-gray font-sans">
                        Transaction ID: {order.paymentDetails.trxId}
                      </div>
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-dark-gray font-sans">Payment Status</dt>
                  <dd className="mt-1 text-sm text-black capitalize font-sans">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      order.paymentStatus === 'completed' ? 'bg-pure-white text-maybelline-pink border border-maybelline-pink' :
                      order.paymentStatus === 'pending' ? 'bg-pure-white text-dark-gray border border-cool-gray' :
                      'bg-pure-white text-maybelline-pink border border-maybelline-pink'
                    }`}>
                      {order.paymentStatus}
                    </span>
                  </dd>
                </div>
                {order.couponCode && (
                  <div className="sm:col-span-1">
                    <dt className="text-sm font-medium text-dark-gray font-sans">Coupon Applied</dt>
                    <dd className="mt-1 text-sm text-maybelline-pink font-medium font-sans">{order.couponCode}</dd>
                  </div>
                )}
                <div className="sm:col-span-1">
                  <dt className="text-sm font-medium text-dark-gray font-sans">Total Amount</dt>
                  <dd className="mt-1 text-lg font-semibold text-black">BDT{order.totalAmount.toFixed(2)}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="card rounded-xl">
            <div className="px-6 py-4 border-b border-cool-gray">
              <h3 className="text-lg font-semibold text-black flex items-center font-heading">
                <FaTruck className="mr-2 text-maybelline-pink" />
                Shipping Information
              </h3>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4">
                <h4 className="text-sm font-medium text-dark-gray flex items-center font-sans">
                  <FaUser className="mr-2" />
                  Recipient
                </h4>
                <p className="mt-1 text-sm text-black font-sans">{order.shippingAddress.fullName}</p>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-dark-gray flex items-center font-sans">
                  <FaHome className="mr-2" />
                  Address
                </h4>
                <p className="mt-1 text-sm text-black font-sans">
                  {order.shippingAddress.address}, {order.shippingAddress.city}<br />
                  {order.shippingAddress.state}, {order.shippingAddress.postalCode}<br />
                  {order.shippingAddress.country}
                </p>
              </div>
              <div className="mb-4">
                <h4 className="text-sm font-medium text-dark-gray flex items-center font-sans">
                  <FaPhone className="mr-2" />
                  Contact
                </h4>
                <p className="mt-1 text-sm text-black font-sans">{order.shippingAddress.phone}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-dark-gray flex items-center font-sans">
                  <FiClock className="mr-2" />
                  Estimated Delivery
                </h4>
                <p className="mt-1 text-sm text-black font-sans">{formattedDeliveryDate}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card rounded-xl mb-8">
          <div className="px-6 py-4 border-b border-cool-gray">
            <h3 className="text-lg font-semibold text-black flex items-center font-heading">
              <FaMapMarkerAlt className="mr-2 text-maybelline-pink" />
              Order Status
            </h3>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                order.orderStatus === 'pending' ? 'bg-pure-white text-maybelline-pink border border-maybelline-pink' :
                order.orderStatus === 'processing' ? 'bg-pure-white text-maybelline-pink border border-maybelline-pink' :
                order.orderStatus === 'shipped' ? 'bg-pure-white text-dark-gray border border-cool-gray' :
                order.orderStatus === 'delivered' ? 'bg-maybelline-pink text-white' :
                'bg-cool-gray text-dark-gray'
              }`}>
                {order.orderStatus === 'pending' && '1'}
                {order.orderStatus === 'processing' && '2'}
                {order.orderStatus === 'shipped' && '3'}
                {order.orderStatus === 'delivered' && '4'}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-black capitalize font-sans">
                  {order.orderStatus}
                  <span className="ml-2 text-xs text-dark-gray font-sans">
                    {order.orderStatus === 'pending' && 'Your order is being processed'}
                    {order.orderStatus === 'processing' && 'We are preparing your order'}
                    {order.orderStatus === 'shipped' && 'Your order is on the way'}
                    {order.orderStatus === 'delivered' && 'Your order has been delivered'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => router.push('/profile/orders')}
            className="btn-primary"
          >
            View All Orders
          </button>
          <button
            onClick={() => router.push('/')}
            className="btn-secondary"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
