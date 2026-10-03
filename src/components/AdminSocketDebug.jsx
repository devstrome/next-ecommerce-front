'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React from 'react';
import { useAdminChat } from '../context/AdminChatContext';

const AdminSocketDebug = () => {
  const { 
    isConnected, 
    error, 
    rooms, 
    activeRoom, 
    onlineUsers,
    socket,
    clearError 
  } = useAdminChat();

  const getAdminToken = () => {
    const token = getStorage("adminAccessToken") || 
                  getStorage("adminToken") || 
                  getStorage("adminRefreshToken") || 
                  getStorage("accessToken");
    return token;
  };

  const token = getAdminToken();

  const testSocketConnection = () => {
    if (socket) {
      console.log("Testing socket connection...");
      socket.emit("joinAdminRoom");
      console.log("Emitted joinAdminRoom");
    } else {
      console.log("No socket available");
    }
  };

  const testJoinRoom = () => {
    if (socket && activeRoom?._id) {
      console.log("Testing join room...");
      socket.emit("joinChatRoom", { 
        roomId: activeRoom._id, 
        userType: "admin" 
      });
      console.log("Emitted joinChatRoom for:", activeRoom._id);
    } else {
      console.log("No socket or active room available");
    }
  };

  return (
    <div className="fixed bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 max-w-sm z-50">
      <h3 className="font-semibold text-gray-900 mb-2">Admin Socket Debug</h3>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>Socket: {isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        <div>
          <span className="font-medium">Token:</span> {token ? `${token.substring(0, 20)}...` : 'None'}
        </div>
        
        <div>
          <span className="font-medium">Rooms:</span> {rooms.length}
        </div>
        
        <div>
          <span className="font-medium">Active Room:</span> {activeRoom?._id ? 'Yes' : 'No'}
        </div>
        
        <div>
          <span className="font-medium">Online Users:</span> {onlineUsers.length}
        </div>
        
        {error && (
          <div className="text-red-600">
            <span className="font-medium">Error:</span> {error}
            <button 
              onClick={clearError}
              className="ml-2 text-maybelline-pink hover:underline"
            >
              Clear
            </button>
          </div>
        )}
        
        <div className="pt-2 border-t space-y-1">
          <button 
            onClick={testSocketConnection}
            className="w-full text-maybelline-pink hover:underline text-xs bg-maybelline-light p-1 rounded"
          >
            Test Admin Room Join
          </button>
          
          <button 
            onClick={testJoinRoom}
            className="w-full text-green-600 hover:underline text-xs bg-green-50 p-1 rounded"
          >
            Test Chat Room Join
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="w-full text-red-600 hover:underline text-xs bg-red-50 p-1 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminSocketDebug;
