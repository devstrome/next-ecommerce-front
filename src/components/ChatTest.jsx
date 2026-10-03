'use client'
import React from "react";
import { useUserChat } from "../context/UserChatContext";

const ChatTest = () => {
  const {
    isOpen,
    isConnected,
    isLoading,
    error,
    openChat,
    closeChat,
  } = useUserChat();

  return (
    <div className="p-4 bg-gray-100 rounded-lg">
      <h3 className="text-lg font-bold mb-2">Chat Status Test</h3>
      <div className="space-y-2 text-sm">
        <p>Chat Open: {isOpen ? "Yes" : "No"}</p>
        <p>Connected: {isConnected ? "Yes" : "No"}</p>
        <p>Loading: {isLoading ? "Yes" : "No"}</p>
        {error && <p className="text-red-500">Error: {error}</p>}
      </div>
      <div className="mt-4 space-x-2">
        <button
          onClick={openChat}
          className="px-3 py-1 bg-maybelline-pink text-white rounded hover:bg-maybelline-pink"
        >
          Open Chat
        </button>
        <button
          onClick={closeChat}
          className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Close Chat
        </button>
      </div>
    </div>
  );
};

export default ChatTest;
