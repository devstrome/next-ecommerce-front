'use client'
import React, { useState, useEffect } from 'react';
import { FaUser, FaEnvelope, FaUserTag, FaLock, FaPhone, FaImage, FaEye, FaEyeSlash, FaTimes } from 'react-icons/fa';

const UserForm = ({ onSubmit, currentUser, onCancel }) => {
  const [user, setUser] = useState({
    firstName: '',
    lastName: '',
    email: '',
    userName: '',
    password: '',
    phoneNumber: '',
    image: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (currentUser) {
      setUser({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        userName: currentUser.userName || '',
        password: '',
        phoneNumber: currentUser.phoneNumber || '',
        image: null
      });
      setImagePreview(currentUser.imageUrl || null);
    }
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setErrors(prev => ({
          ...prev,
          image: 'Image size should be less than 5MB'
        }));
        return;
      }

      setUser(prev => ({
        ...prev,
        image: file
      }));

      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      setErrors(prev => ({
        ...prev,
        image: ''
      }));
    }
  };

  const removeImage = () => {
    setUser(prev => ({
      ...prev,
      image: null
    }));
    setImagePreview(null);
    setErrors(prev => ({
      ...prev,
      image: ''
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!user.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!user.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!user.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(user.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!user.userName.trim()) {
      newErrors.userName = 'Username is required';
    }

    if (!currentUser && !user.password) {
      newErrors.password = 'Password is required';
    } else if (user.password && user.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!user.phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else {
      const phoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
      if (!phoneRegex.test(user.phoneNumber.trim())) {
        newErrors.phoneNumber = 'Please enter a valid Bangladeshi phone number';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit({ ...user, _id: currentUser?._id });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {currentUser ? 'Edit User' : 'Add New User'}
        </h2>
        <button
          onClick={onCancel}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes className="text-xl" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <FaImage className="inline mr-2" />
            Profile Image
          </label>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={imagePreview || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.firstName + ' ' + user.lastName)}`}
                alt="Profile preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
              />
              {imagePreview && (
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  <FaTimes className="text-xs" />
                </button>
              )}
            </div>
            <div className="flex-1">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-maybelline-light file:text-maybelline-magenta hover:file:bg-maybelline-light"
              />
              {errors.image && (
                <p className="text-red-500 text-sm mt-1">{errors.image}</p>
              )}
            </div>
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
              value={user.firstName}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
                errors.firstName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>
            )}
          </div>

          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
              <FaUser className="inline mr-2" />
              Last Name
            </label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={user.lastName}
              onChange={handleChange}
              className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
                errors.lastName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            <FaEnvelope className="inline mr-2" />
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={user.email}
            onChange={handleChange}
            className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="john.doe@example.com"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        {/* Username */}
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-1">
            <FaUserTag className="inline mr-2" />
            Username
          </label>
          <input
            type="text"
            id="userName"
            name="userName"
            value={user.userName}
            onChange={handleChange}
            className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
              errors.userName ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="johndoe"
          />
          {errors.userName && (
            <p className="text-red-500 text-sm mt-1">{errors.userName}</p>
          )}
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
            <FaPhone className="inline mr-2" />
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={user.phoneNumber}
            onChange={handleChange}
            className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
              errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="+8801XXXXXXXXX"
          />
          {errors.phoneNumber && (
            <p className="text-red-500 text-sm mt-1">{errors.phoneNumber}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            <FaLock className="inline mr-2" />
            {currentUser ? 'New Password (leave blank to keep current)' : 'Password'}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              value={user.password}
              onChange={handleChange}
              className={`block w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent bg-white ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={currentUser ? 'Enter new password' : 'Enter password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-maybelline-pink rounded-lg hover:bg-maybelline-magenta transition-colors"
          >
            {currentUser ? 'Update User' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserForm;
