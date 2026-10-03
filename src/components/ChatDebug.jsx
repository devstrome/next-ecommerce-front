'use client'
import React from "react";
import { useUserChat } from "../context/UserChatContext";

const ChatDebug = () => {
  const {
    isOpen,
    inputMessage,
    messages,
    activeRoom,
    isConnected,
    isLoading,
    error,
    handleSend,
    openChat,
    closeChat,
  } = useUserChat();

  const testSend = () => {
    console.log("Test send clicked");
    handleSend();
  };

  return (
    <div className="p-4 bg-maybelline-light rounded-lg border-2 border-maybelline-pink">
      <h3 className="text-lg font-bold mb-2">Chat Debug Panel</h3>
      <div className="space-y-2 text-sm">
        <p>Chat Open: {isOpen ? "Yes" : "No"}</p>
        <p>Connected: {isConnected ? "Yes" : "No"}</p>
        <p>Loading: {isLoading ? "Yes" : "No"}</p>
        <p>Input Message: "{inputMessage}"</p>
        <p>Active Room: {activeRoom?._id || "None"}</p>
        <p>Messages Count: {messages.length}</p>
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
        <button
          onClick={testSend}
          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Test Send
        </button>
      </div>
      <div className="mt-4">
        <h4 className="font-semibold">Recent Messages:</h4>
        <div className="max-h-32 overflow-y-auto bg-white p-2 rounded">
          {messages.slice(-3).map((msg, idx) => (
            <div key={idx} className="text-xs">
              {msg.senderType}: {msg.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatDebug;
