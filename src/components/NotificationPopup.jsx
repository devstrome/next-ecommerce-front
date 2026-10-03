'use client'
import React from 'react';

const NotificationPopup = ({ notifications, showNotification, onClear, onNotificationClick }) => {
  if (!showNotification || !notifications.length) return null;

  return (
    <div className="fixed top-20 right-4 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm animate-slide-in">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900 flex items-center">
          <svg className="w-4 h-4 mr-2 text-maybelline-pink" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
          </svg>
          New Messages
        </h4>
        <button
          onClick={onClear}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {notifications.slice(0, 5).map((notification) => (
          <div 
            key={notification.id} 
            className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => onNotificationClick(notification)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {notification.sender}
                </p>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {notification.timestamp}
                </p>
              </div>
              <div className="ml-2 flex-shrink-0">
                <div className="w-2 h-2 bg-maybelline-pink rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {notifications.length > 5 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            +{notifications.length - 5} more notifications
          </p>
        </div>
      )}
    </div>
  );
};

export default NotificationPopup;
