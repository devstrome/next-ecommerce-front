'use client'
// src/components/ProfileForm.jsx
import React, { useState } from 'react';

const ProfileForm = ({ adminData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    username: adminData.username,
    password: adminData.password,
    firstName: adminData.firstName,
    lastName: adminData.lastName,
    email: adminData.email,
    phone: adminData.phone,
    role: adminData.role,
    avatar: adminData.avatar,
  });

  const [avatarPreview, setAvatarPreview] = useState(adminData.avatar);
  const [showPassword, setShowPassword] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle image upload and preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // For demonstration, we'll use a local URL. In production, upload to a server or cloud storage.
      const imageUrl = URL.createObjectURL(file);
      setFormData({ ...formData, avatar: imageUrl });
      setAvatarPreview(imageUrl);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-lg rounded-xl p-8 max-w-2xl mx-auto"
    >
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Edit Profile</h2>

      {/* Username */}
      <div className="mb-5">
        <label className="block text-gray-700 mb-2" htmlFor="username">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
          value={formData.username}
          onChange={handleChange}
          required
        />
      </div>

      {/* Password */}
      <div className="mb-5">
        <label className="block text-gray-700 mb-2" htmlFor="password">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            name="password"
            className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
            value={formData.password}
            onChange={handleChange}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-600 focus:outline-none"
          >
            {showPassword ? (
              // Eye-off Icon
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10 0-1.728.408-3.357 1.125-4.825M6.375 6.375L17.625 17.625"
                />
              </svg>
            ) : (
              // Eye Icon
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* First Name */}
      <div className="mb-5">
        <label className="block text-gray-700 mb-2" htmlFor="firstName">
          First Name
        </label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
          value={formData.firstName}
          onChange={handleChange}
          required
        />
      </div>

      {/* Last Name */}
      <div className="mb-5">
        <label className="block text-gray-700 mb-2" htmlFor="lastName">
          Last Name
        </label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
          value={formData.lastName}
          onChange={handleChange}
          required
        />
      </div>

      {/* Email */}
      <div className="mb-5">
        <label className="block text-gray-700 mb-2" htmlFor="email">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          className="w-full bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
          value={formData.email}
          onChange={handleChange}
          required
        />
      </div>

      

      {/* Profile Image */}
      <div className="mb-6">
        <label className="block text-gray-700 mb-2" htmlFor="avatar">
          Profile Image
        </label>
        <div className="flex items-center">
          <img
            src={avatarPreview}
            alt="Avatar Preview"
            className="w-20 h-20 rounded-full object-cover mr-6"
          />
          <label className="flex items-center px-4 py-2 bg-maybelline-pink text-white rounded-lg shadow-md hover:bg-maybelline-pink cursor-pointer">
            <span className="mr-2">Choose File</span>
            <input
              type="file"
              id="avatar"
              name="avatar"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Form Buttons */}
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-400 transition duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-maybelline-pink text-white px-5 py-2 rounded-lg hover:bg-maybelline-pink transition duration-200"
        >
          Save Changes
        </button>
      </div>
    </form>
  );
};

export default ProfileForm;
