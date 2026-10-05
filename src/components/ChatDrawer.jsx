'use client'
import React, { useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import { useUserChat } from "../context/UserChatContext";
import { UserContext } from "../context/UserContext";
import EmojiPicker from "./EmojiPicker";
import { getStorage } from "../lib/storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URI;

const ChatDrawer = () => {
  const { user } = useContext(UserContext);
  const {
    isOpen,
    inputMessage,
    messages,
    isConnected,
    isLoading,
    error,
    messagesEndRef,
    unreadCount,
    newMessageNotifications,
    showNotification,
    isOnline,
    assignedAdmin,
    isTyping,
    openChat,
    closeChat,
    setInputMessage,
    imageToSend,
    setImageToSend,
    handleSend,
    clearError,
    clearNotifications,
    retryLoadChat,
    sendTypingIndicator,
    addReaction,
    editMessage,
    deleteMessage,
    socket,
    activeRoom,
    guestInfo,
    setGuestInfo,
    showGuestForm,
    setShowGuestForm,
  } = useUserChat();

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [typingTimeout, setTypingTimeout] = useState(null);
  const [activeMsgMenu, setActiveMsgMenu] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [showEmojiForMsg, setShowEmojiForMsg] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  // Check if device is mobile
  const isMobile = () => window.innerWidth <= 768;

  const canSend = (Boolean(inputMessage.trim()) || Boolean(imageToSend)) && isConnected;
  const activePlaceholder = "Type your message...";

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    if (!file.type.startsWith("image/")) {
      setUploadError("Please select an image file");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be under 5 MB");
      e.target.value = "";
      return;
    }
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post(`${API_BASE}/api/user/upload/chat-image`, formData, {
        headers: { Authorization: `Bearer ${getStorage("accessToken")}` },
      });
      setImageToSend(res.data.url);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  // No draggable logic — fixed bottom-right permanently

  // Helper function to format read time
  const formatReadTime = (message) => {
    const readEntry = message.readBy?.find(read => read.readerType === "admin");
    if (!readEntry) return null;
    return new Date(readEntry.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Handle typing indicator
  const handleTyping = () => {
    if (!isTyping) {
      sendTypingIndicator(true);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing indicator
    const timeout = setTimeout(() => {
      sendTypingIndicator(false);
    }, 1000);
    
    setTypingTimeout(timeout);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  const isGuest = !user?._id;

  // Helper to check if a message is read by admin
  const isMessageReadByAdmin = (message) => {
    if (message.senderType !== "customer" && message.senderType !== "guest") return false;
    return message.readBy?.some(read => read.readerType === "admin");
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && isMobile() && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fade-in"
          onClick={closeChat}
        />
      )}
      
      <div className={`${isOpen && isMobile() ? 'fixed inset-0 z-[60]' : 'fixed top-1/2 -translate-y-1/2 right-4 z-50'}`}>
        {!isOpen ? (
          <div className="relative">
            <button
              onClick={openChat}
              className="bg-maybelline-pink text-pure-white rounded-full p-4 shadow-lg hover:bg-maybelline-magenta transition relative"
              aria-label="Open chat"
            >
              {/* Chat Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>

              {/* Unread count badge */}
              {unreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notification popup */}
            {showNotification && newMessageNotifications.length > 0 && (
              <div className="absolute bottom-full right-0 mb-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-3 animate-slide-in">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-semibold text-gray-900">New Message</h4>
                  <button onClick={clearNotifications} className="text-gray-400 hover:text-gray-600">✕</button>
                </div>
                <div className="space-y-2">
                  {newMessageNotifications.slice(0, 3).map((notification) => (
                    <div key={notification.id} className="text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">{notification.sender}</span>
                        <span className="text-gray-500">{notification.timestamp}</span>
                      </div>
                      <p className="text-gray-600 truncate">{notification.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`bg-white shadow-xl flex flex-col ${
              isMobile() 
                ? 'w-full h-full animate-slide-up' 
                : 'w-80 rounded-lg border border-gray-200 min-h-[520px] max-h-[85vh]'
            }`}
          >
          <div
            className={`p-3 rounded-t-lg ${isConnected ? "bg-maybelline-pink" : "bg-gray-500"} text-white`}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm">
                {assignedAdmin ? `${assignedAdmin.firstName || 'Admin'} ${assignedAdmin.lastName || ''}`.trim() : "Customer Support"}
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={closeChat} className="text-white hover:text-gray-200">✕</button>
              </div>
            </div>
            <div className="flex items-center text-xs opacity-90">
              {activeRoom?.isClosed ? (
                <span className="text-red-200">Chat closed</span>
              ) : (
                <>
                  <span className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></span>
                  <span>{isConnected ? "Connected" : "Disconnected"}</span>
                </>
              )}
            </div>
          </div>

          {/* Guest form */}
          {isGuest && showGuestForm && (
            <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-center">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-maybelline-light rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-maybelline-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <h4 className="text-sm font-semibold text-gray-900">Start a Conversation</h4>
                <p className="text-xs text-gray-500 mt-1">Leave your details and we'll get back to you.</p>
              </div>
              <input
                type="text"
                value={guestName}
                onChange={e => setGuestName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
              />
              <input
                type="email"
                value={guestEmail}
                onChange={e => setGuestEmail(e.target.value)}
                placeholder="Your email"
                className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
              />
              <input
                type="tel"
                value={guestPhone}
                onChange={e => setGuestPhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full px-3 py-2 mb-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
              />
              <button
                onClick={() => {
                  if (!guestName.trim() && !guestEmail.trim() && !guestPhone.trim()) return;
                  setGuestInfo({ name: guestName.trim(), email: guestEmail.trim(), phone: guestPhone.trim() });
                  setShowGuestForm(false);
                }}
                disabled={!guestName.trim() && !guestEmail.trim()}
                className="w-full py-2 bg-maybelline-pink text-white text-sm font-medium rounded-lg hover:bg-maybelline-magenta transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Chat
              </button>
              <p className="text-xs text-gray-400 text-center mt-3">Your info is only used to respond to your inquiry.</p>
            </div>
          )}

          <div className="flex-1 p-3 overflow-y-auto">
            {activeRoom?.isClosed && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-center rounded">
                <p className="text-xs text-red-600 font-medium">This chat has been closed</p>
              </div>
            )}
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-full space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maybelline-pink"></div>
                <p className="text-sm text-gray-500">Loading chat...</p>
                <button onClick={retryLoadChat} className="mt-2 px-3 py-1 bg-maybelline-pink text-white rounded text-xs hover:bg-maybelline-pink">Refresh</button>
              </div>
            ) : error ? (
              <div className="text-center text-red-500 mt-10 p-4">
                <p className="mb-2">{error}</p>
                <button onClick={retryLoadChat} className="px-3 py-1 bg-maybelline-pink text-white rounded hover:bg-maybelline-pink text-sm">Retry</button>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-10">
                <p>Start a conversation with our support team</p>
                <p className="text-sm mt-1">We're here to help!</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.senderType === "customer" || msg.senderType === "guest" || msg.role === "user";
                const bubbleClass = isUser
                  ? (msg.isDeleted ? "bg-gray-400 text-gray-200 italic" : "bg-maybelline-pink text-white rounded-tr-xl rounded-tl-xl rounded-bl-xl")
                  : (msg.isDeleted ? "bg-gray-200 text-gray-500 italic" : "bg-gray-200 text-gray-800 rounded-tr-xl rounded-tl-xl rounded-br-xl");
                const groupedReactions = {};
                (msg.reactions || []).forEach(r => {
                  if (!groupedReactions[r.emoji]) groupedReactions[r.emoji] = [];
                  groupedReactions[r.emoji].push(r.userName || 'User');
                });
                const hasReactions = Object.keys(groupedReactions).length > 0;

                return (
                  <div key={msg._id || idx} className={`mb-2 group ${isUser ? "text-right" : "text-left"}`}>
                    <div className={`flex items-end gap-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      {/* Action buttons — only on OTHER person's messages (always visible on touch) */}
                      {!isUser && !msg.isDeleted && (
                        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 pb-1">
                          <button
                            onClick={() => setShowEmojiForMsg(showEmojiForMsg === msg._id ? null : msg._id)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-xs"
                            title="React"
                          >😊</button>
                        </div>
                      )}
                      {isUser && !msg.isDeleted && (
                        <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0 pb-1">
                          <button
                            onClick={() => setActiveMsgMenu(activeMsgMenu === msg._id ? null : msg._id)}
                            className="w-6 h-6 flex items-center justify-center hover:bg-gray-100"
                            title="More"
                          >···</button>
                        </div>
                      )}
                      {/* Emoji picker — only on admin messages */}
                      {showEmojiForMsg === msg._id && !isUser && (
                        <div className="shrink-0 z-30 pb-1">
                          <EmojiPicker
                            onSelect={(emoji) => { addReaction(msg._id, emoji); setShowEmojiForMsg(null); }}
                            onClose={() => setShowEmojiForMsg(null)}
                          />
                        </div>
                      )}
                      {/* Bubble — relative wrapper for reaction badge */}
                      <div className={`max-w-[220px] relative ${hasReactions ? 'mb-3.5' : ''}`}>
                        <div className={`px-3 py-1.5 break-words whitespace-pre-wrap ${bubbleClass}`} style={{ wordBreak: 'break-word' }}>
                          {msg.isDeleted ? (
                            <span className="italic opacity-80">This message has been deleted</span>
                          ) : (
                            <>
                              {msg.image && (
                                <img
                                  src={msg.image}
                                  alt="Attachment"
                                  className="rounded-lg max-w-[200px] max-h-48 mb-1 cursor-pointer hover:opacity-90 block"
                                  onClick={() => window.open(msg.image, "_blank")}
                                />
                              )}
                              {msg.content || msg.text}
                              {msg.edited && <span className="text-[10px] opacity-50 ml-1">(edited)</span>}
                            </>
                          )}
                        </div>
                        {/* Messenger-style reaction badge — overlaps bottom-end */}
                        {hasReactions && (
                          <div className={`absolute -bottom-3 ${isUser ? '-right-1' : '-left-1'} flex items-center gap-0.5 px-1 py-0.5 bg-white border border-gray-200 shadow-sm rounded-full z-10`}>
                            {Object.entries(groupedReactions).map(([emoji, users]) => (
                              <button
                                key={emoji}
                                onClick={() => addReaction(msg._id, emoji)}
                                className="inline-flex items-center gap-0.5 hover:scale-110 transition-transform"
                                title={users.join(', ')}
                              >
                                <span className="text-sm leading-none">{emoji}</span>
                                {users.length > 1 && <span className="text-gray-500 text-[10px] font-medium">{users.length}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* No action buttons on own messages — only on other's */}
                    </div>
                    {/* Context menu — only on user's own non-deleted messages */}
                    {activeMsgMenu === msg._id && isUser && !msg.isDeleted && (
                      <div className={`mt-1 bg-white border border-gray-200 shadow-lg z-20 py-1 min-w-[110px] self-end inline-flex flex-col`}>
                        <button
                          onClick={() => { setInputMessage(msg.text || msg.content); setEditingMsgId(msg._id); setActiveMsgMenu(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100"
                        >✏️ Edit</button>
                        <button
                          onClick={() => { deleteMessage(msg._id); setActiveMsgMenu(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-gray-100"
                        >🗑️ Delete</button>
                      </div>
                    )}
                    {/* Timestamp + read status */}
                    <div className={`flex items-center gap-1 mt-0.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[10px] text-gray-400">
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) : ''}
                      </span>
                      {isUser && !msg.isDeleted && (
                        isMessageReadByAdmin(msg) ? (
                          <svg className="w-3.5 h-3.5 text-maybelline-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 13l4 4L23 7" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Admin typing indicator */}
            {isTyping && (
              <div className="text-left mb-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-gray-200 text-gray-800">
                  <span className="text-xs">{assignedAdmin ? `${assignedAdmin.firstName || 'Support'}` : 'Support'} is typing</span>
                  <div className="flex space-x-0.5">
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:"0.15s"}} />
                    <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:"0.3s"}} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t">
            {uploadError && (
              <p className="text-xs text-red-500 mb-1.5">{uploadError}</p>
            )}
            {imageToSend && (
              <div className="flex items-center gap-2 mb-2 p-1.5 bg-gray-50 border border-gray-200 rounded-lg w-fit">
                <img src={imageToSend} alt="Preview" className="h-12 w-12 object-cover rounded" />
                <button
                  onClick={() => setImageToSend("")}
                  className="w-6 h-6 flex items-center justify-center text-gray-500 hover:text-red-500"
                  title="Remove image"
                >
                  ✕
                </button>
              </div>
            )}
            <div className="flex gap-2">
              {!editingMsgId && !isGuest && (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isConnected || uploadingImage}
                    className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-300 text-gray-500 hover:text-maybelline-pink hover:border-maybelline-pink transition shrink-0 disabled:opacity-50"
                    title={uploadingImage ? "Uploading..." : "Attach image"}
                  >
                    {uploadingImage ? "⏳" : "📎"}
                  </button>
                </>
              )}
              {editingMsgId && (
                <button
                  onClick={() => { setEditingMsgId(null); setInputMessage(''); }}
                  className="px-2 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  title="Cancel edit"
                >
                  ✕
                </button>
              )}
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  handleTyping();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (editingMsgId && inputMessage.trim()) {
                      editMessage(editingMsgId, inputMessage.trim());
                      setEditingMsgId(null);
                      setInputMessage('');
                    } else if (!editingMsgId) {
                      handleSend();
                    }
                  }
                }}
                placeholder={editingMsgId ? "Editing message..." : activePlaceholder}
                disabled={!isConnected}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-maybelline-pink disabled:opacity-50"
              />
              {editingMsgId ? (
                <button
                  onClick={() => {
                    if (inputMessage.trim()) {
                      editMessage(editingMsgId, inputMessage.trim());
                      setEditingMsgId(null);
                      setInputMessage('');
                    }
                  }}
                  disabled={!inputMessage.trim()}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    inputMessage.trim()
                      ? "bg-maybelline-pink text-white hover:bg-maybelline-magenta"
                      : "bg-gray-300 text-gray-500"
                  }`}
                >
                  Update
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!canSend}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    canSend
                      ? "bg-maybelline-pink text-white hover:bg-maybelline-magenta"
                      : "bg-gray-300 text-gray-500"
                  }`}
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
};

export default ChatDrawer;
