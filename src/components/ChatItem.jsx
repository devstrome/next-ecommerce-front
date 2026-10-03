'use client'
import React from "react";
import { BiCheck, BiCheckDouble, BiX } from "react-icons/bi";

const ChatItem = ({ customer, lastMessage, isActive, onClick, unreadCount = 0, isGuest = false, isClosed = false, assignedAdmin = null }) => {
  const formatTime = (date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 48) {
      return "Yesterday";
    } else {
      return messageDate.toLocaleDateString();
    }
  };



  return (
    <div onClick={onClick} className="cursor-pointer group">
      <div className="flex items-center p-4 hover:bg-gray-50 transition duration-200 border-b border-gray-100 last:border-b-0">
        <div className="relative flex-shrink-0">
          <img
            src={customer.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTI0IDI0QzI4LjQxODMgMjQgMzIgMjAuNDE4MyAzMiAxNkMzMiAxMS41ODE3IDI4LjQxODMgOCAyNCA4QzE5LjU4MTcgOCAxNiAxMS41ODE3IDE2IDE2QzE2IDIwLjQxODMgMTkuNTgxNyAyNCAyNCAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQwIDQwQzQwIDMyLjI2ODkgMzIuODM3IDI2IDI0IDI2QzE1LjE2MyAyNiA4IDMyLjI2ODkgOCA0MEg0MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg=='}
            alt={customer.firstName && customer.lastName 
              ? `${customer.firstName} ${customer.lastName}` 
              : customer.email || 'Customer'}
            className="w-12 h-12 rounded-full object-cover"
          />
          {isActive && !isClosed && (
            <span className="absolute bottom-0 right-0 block h-3 w-3 bg-green-400 rounded-full ring-2 ring-white"></span>
          )}
          {isClosed && (
            <span className="absolute bottom-0 right-0 block h-3 w-3 bg-red-400 rounded-full ring-2 ring-white"></span>
          )}
        </div>
        
        <div className="ml-4 flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-gray-900 truncate">
                {customer.firstName 
                  ? `${customer.firstName} ${customer.lastName || ''}`
                  : customer.email || 'Unknown Customer'}
              </h3>
              {isGuest && (
                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded">
                  G
                </span>
              )}
              {isClosed && (
                <span className="inline-block ml-1 mt-0.5 px-1.5 py-0.5 text-[10px] font-medium text-red-500 bg-red-50 rounded">
                  Closed
                </span>
              )}
              {assignedAdmin && (
                <p className="text-[11px] text-gray-400 truncate mt-0.5">
                  {assignedAdmin.firstName} {assignedAdmin.lastName || ''}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-1 ml-2">
              <span className="text-xs text-gray-500">
                {lastMessage?.createdAt ? formatTime(lastMessage.createdAt) : ""}
              </span>
              {lastMessage?.senderType === "admin" && (
                <div className="flex items-center">
                  {(lastMessage?.readBy || []).some(r => r.readerType === 'customer') ? (
                    <BiCheckDouble className="w-4 h-4 text-maybelline-pink" />
                  ) : (
                    <BiCheck className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-between items-center mt-1">
            <p className="text-sm text-gray-600 truncate flex-1">
              {lastMessage?.text || "No messages yet"}
            </p>
                         {unreadCount > 0 && (
               <div className="ml-2 flex-shrink-0">
                 <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-maybelline-pink rounded-full">
                   {unreadCount > 9 ? '9+' : unreadCount}
                 </span>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatItem;
