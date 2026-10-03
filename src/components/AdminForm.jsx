'use client'
// src/components/AdminForm.jsx
import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaUserTag, FaLock, FaUserShield, FaImage, FaEye, FaEyeSlash } from 'react-icons/fa';

const AdminForm = ({ onSubmit, currentAdmin, onCancel }) => {
  const [admin, setAdmin] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userName: '',
    password: '',
    superAdmin: false,
    image: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (currentAdmin) {
      setAdmin({
        firstName: currentAdmin.firstName || '',
        lastName: currentAdmin.lastName || '',
        email: currentAdmin.email || '',
        userName: currentAdmin.userName || '',
        password: '', // Don't populate password for security
        superAdmin: currentAdmin.superAdmin || false,
        image: null
      });
      setImagePreview(currentAdmin.imageUrl);
    } else {
      setAdmin({
        firstName: '',
        lastName: '',
        email: '',
        userName: '',
        password: '',
        superAdmin: false,
        image: null
      });
      setImagePreview(null);
    }
    setErrors({});
  }, [currentAdmin]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file' && files[0]) {
      const file = files[0];
      setAdmin({ ...admin, image: file });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else if (type === 'checkbox') {
      setAdmin({ ...admin, [name]: checked });
    } else {
      setAdmin({ ...admin, [name]: value });
    }
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!admin.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!admin.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!admin.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(admin.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!admin.userName.trim()) newErrors.userName = 'Username is required';
    if (!currentAdmin && !admin.password) newErrors.password = 'Password is required';
    if (admin.password && admin.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({ ...admin, _id: currentAdmin?._id });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center space-x-2 mb-6">
        <FaUser className="text-maybelline-pink" />
        <h2 className="text-xl font-semibold text-gray-900">
          {currentAdmin ? 'Edit Admin' : 'Add New Admin'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaImage className="inline mr-2" />
            Profile Image
          </label>
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FaUser className="text-gray-400 text-2xl" />
                </div>
              )}
            </div>
            <input
              type="file"
              name="image"
              accept="image/*"
              onChange={handleChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-maybelline-light file:text-maybelline-magenta hover:file:bg-maybelline-light"
            />
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
              <FaUser className="inline mr-2" />
              First Name
            </label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={admin.firstName}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John"
              required
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={admin.lastName}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Doe"
              required
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            <FaEnvelope className="inline mr-2" />
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={admin.email}
            onChange={handleChange}
            className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john.doe@example.com"
            required
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Username Field */}
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
            <FaUserTag className="inline mr-2" />
            Username
          </label>
          <input
            type="text"
            id="userName"
            name="userName"
            value={admin.userName}
            onChange={handleChange}
            className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
              errors.userName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="johndoe"
            required
          />
          {errors.userName && (
            <p className="mt-1 text-sm text-red-600">{errors.userName}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            <FaLock className="inline mr-2" />
            Password {currentAdmin && <span className="text-gray-500">(leave blank to keep current)</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={admin.password}
              onChange={handleChange}
              className={`block w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={currentAdmin ? '••••••••' : 'Enter password'}
              required={!currentAdmin}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <FaEyeSlash className="text-gray-400" />
              ) : (
                <FaEye className="text-gray-400" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Super Admin Toggle */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="superAdmin"
            name="superAdmin"
            checked={admin.superAdmin}
            onChange={handleChange}
            className="w-4 h-4 text-maybelline-pink bg-gray-100 border-gray-300 rounded focus:ring-maybelline-pink focus:ring-2"
          />
          <label htmlFor="superAdmin" className="flex items-center text-sm font-medium text-gray-700">
            <FaUserShield className="mr-2 text-red-500" />
            Super Admin Access
          </label>
        </div>
        {admin.superAdmin && (
          <p className="text-sm text-maybelline-magenta bg-maybelline-light p-2 rounded">
            ⚠️ Super admins have full system access and can manage other admins.
          </p>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-4">
          <button
            type="submit"
            className="flex items-center space-x-2 px-4 py-2 bg-maybelline-pink text-white rounded-lg hover:bg-maybelline-magenta focus:ring-4 focus:ring-maybelline-light transition-colors"
          >
            <FaUser className="text-sm" />
            <span>{currentAdmin ? 'Update Admin' : 'Create Admin'}</span>
          </button>
          {currentAdmin && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminForm;
