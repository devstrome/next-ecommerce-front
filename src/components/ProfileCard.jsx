'use client'
// src/components/ProfileCard.jsx
import React from 'react';

const ProfileCard = ({ adminData, onEdit }) => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex flex-col items-center">
        <img
          className="w-24 h-24 rounded-full object-cover mb-4"
          src={adminData.Url}
          alt={`${adminData.firstName} ${adminData.lastName}'s avatar`}
        />
        <h2 className="text-2xl font-semibold text-gray-800">
          {adminData.firstName} {adminData.lastName}
        </h2>
        <p className="text-gray-600 mb-2">{adminData.role}</p>
        <button
          onClick={onEdit}
          className="mt-4 bg-maybelline-pink text-white px-4 py-2 rounded hover:bg-maybelline-pink transition duration-200"
        >
          Edit Profile
        </button>
      </div>
      <div className="mt-6">
        <div className="flex items-center mb-4">
          <svg
            className="w-5 h-5 text-gray-500 mr-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
            <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
          </svg>
          <span className="text-gray-700">{adminData.email}</span>
        </div>
        <div className="flex items-center">
          <svg
            className="w-5 h-5 text-gray-500 mr-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
            <path d="M8 2a2 2 0 00-2 2v1h4V4a2 2 0 00-2-2zm0 14v-3H6v-2h2v-3l2 3h2v2h-2v3H8z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;
