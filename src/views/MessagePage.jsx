'use client'
import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAdminChat } from "../context/AdminChatContext";
import { BiArrowBack, BiTransfer, BiX, BiSend, BiUserCheck, BiCheck, BiCheckDouble, BiDotsHorizontalRounded, BiPencil, BiTrash } from "react-icons/bi";
import TransferModal from "../components/TransferModal";
import EmojiPicker from "../components/EmojiPicker";
import axios from "axios";
import { getStorage } from "../lib/storage";

const API_BASE = process.env.NEXT_PUBLIC_API_URI;

const AdminMessagePage = () => {
  const { id: roomId } = useParams();
  const router = useRouter();
  const messagesEndRef = useRef(null);
  
  const {
    activeRoom,
    messages,
    inputMessage,
    loading,
    error,
    onlineUsers,
    isTyping,
    fetchRoom,
    handleSend,
    transferRoom,
    closeRoom,
    joinRoom,
    setInputMessage,
    imageToSend,
    setImageToSend,
    autoAssignAdmin,
    isConnected,
    markAsRead,
    updateOnlineStatus,
    sendTypingIndicator,
    addReaction,
    editMessage,
    deleteMessage,
  } = useAdminChat();

  useEffect(() => {
    if (!roomId) {
      router.push("/admin/login");
      return;
    }
    if (!activeRoom || activeRoom._id !== roomId) {
      console.log("Fetching room data for:", roomId);
      fetchRoom(roomId);
    } else {
      console.log("Room already loaded:", activeRoom._id);
      if (isConnected) {
        joinRoom(roomId);
      }
    }
  }, [roomId, router]);

  useEffect(() => {
    if (isConnected && activeRoom?._id === roomId) {
      console.log("Joining room via socket:", roomId);
      joinRoom(roomId);
    }
  }, [isConnected, activeRoom?._id, roomId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeRoom?._id === roomId && messages.length > 0 && isConnected) {
      console.log("Marking messages as read for room:", roomId);
      markAsRead();
    }
  }, [activeRoom?._id, roomId, isConnected, messages.length]);

  useEffect(() => {
    if (activeRoom?._id === roomId && isConnected) {
      console.log("Setting online status for room:", roomId);
      updateOnlineStatus(true);
    }
    return () => {
      if (activeRoom?._id === roomId && isConnected) {
        console.log("Setting offline status for room:", roomId);
        updateOnlineStatus(false);
      }
    };
  }, [activeRoom?._id, roomId, isConnected]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const handleSendMessage = async () => {
    const hasImage = Boolean(imageToSend);
    if ((!inputMessage.trim() && !hasImage) || activeRoom?.isClosed || !isConnected) return;
    if (editingMsgId) {
      editMessage(editingMsgId, inputMessage.trim());
      setEditingMsgId(null);
      setInputMessage('');
      return;
    }
    try {
      sendTypingIndicator(false);
      await handleSend();
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const typingTimeoutRef = useRef(null);
  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputMessage(value);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (value.trim() && isConnected) {
      sendTypingIndicator(true);
      typingTimeoutRef.current = setTimeout(() => {
        sendTypingIndicator(false);
      }, 2000);
    } else if (!value.trim() && isConnected) {
      sendTypingIndicator(false);
    }
  };

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [activeMsgMenu, setActiveMsgMenu] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [showEmojiForMsg, setShowEmojiForMsg] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

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
      const res = await axios.post(`${API_BASE}/api/upload/image`, formData, {
        headers: { Authorization: `Bearer ${getStorage("adminAccessToken")}` },
      });
      setImageToSend(res.data.url);
    } catch (err) {
      setUploadError(err.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const handleTransfer = async (newAdminId) => {
    if (!isConnected) {
      alert("Socket not connected. Please wait for connection.");
      return;
    }
    try {
      await transferRoom(roomId, newAdminId);
    } catch (err) {
      console.error("Failed to transfer room:", err);
    }
  };

  const handleClose = async () => {
    if (!isConnected) {
      alert("Socket not connected. Please wait for connection.");
      return;
    }
    if (!confirm("Are you sure you want to close this chat?")) return;
    try {
      await closeRoom(roomId);
    } catch (err) {
      console.error("Failed to close room:", err);
    }
  };

  const handleAutoAssign = async () => {
    if (!isConnected) {
      alert("Socket not connected. Please wait for connection.");
      return;
    }
    try {
      await autoAssignAdmin();
    } catch (err) {
      console.error("Failed to auto-assign admin:", err);
    }
  };

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

  const isMessageReadByCustomer = (message) => {
    if (message.senderType !== "admin") return false;
    return message.readBy?.some(read => read.readerType === "customer" || read.readerType === "guest");
  };

  const formatReadTime = (message) => {
    const readEntry = message.readBy?.find(read => read.readerType === "customer");
    if (!readEntry) return null;
    return new Date(readEntry.readAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  if (error) return (
    <div className="flex flex-col p-4 min-h-screen bg-[#FAF8F6]">
      <div className="flex-1 p-4 border border-[#BDBDBD] mt-14 flex items-center justify-center bg-white">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    </div>
  );
  
  if (loading || !isConnected) return (
    <div className="flex flex-col p-4 min-h-screen bg-[#FAF8F6]">
      <div className="flex-1 p-4 border border-[#BDBDBD] mt-14 flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B] mx-auto mb-4"></div>
          <p className="text-[#4A4A4A]">
            {loading ? "Loading chat..." : "Connecting to server..."}
          </p>
          {!isConnected && (
            <p className="text-sm text-[#4A4A4A] mt-2">
              Please wait while we establish a secure connection
            </p>
          )}
        </div>
      </div>
    </div>
  );
  
  if (!activeRoom) return (
    <div className="flex flex-col p-4 min-h-screen bg-[#FAF8F6]">
      <div className="flex-1 p-4 border border-[#BDBDBD] mt-14 flex items-center justify-center bg-white">
        <p className="text-[#4A4A4A] text-lg">Chat room not found</p>
      </div>
    </div>
  );

  return (
    <>
    <div className="flex flex-col p-4 min-h-screen bg-[#FAF8F6]">
      
      <div className="flex-1 border border-[#BDBDBD] mt-14 flex flex-col bg-white">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#BDBDBD] bg-[#F4F4F4]">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => router.push("/admin/dashboard/inbox")}
              className="p-2 hover:bg-[#F4F4F4] transition-colors"
            >
              <BiArrowBack className="w-5 h-5 text-[#4A4A4A]" />
            </button>
            <div className="flex items-center space-x-3">
              <img
                src={activeRoom.customerId?.imageUrl || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiByeD0iMjQiIGZpbGw9IiNFNUU3RUIiLz4KPHBhdGggZD0iTTI0IDI0QzI4LjQxODMgMjQgMzIgMjAuNDE4MyAzMiAxNkMzMiAxMS41ODE3IDI4LjQxODMgOCAyNCA4QzE5LjU4MTcgOCAxNiAxMS41ODE3IDE2IDE2QzE2IDIwLjQxODMgMTkuNTgxNyAyNCAyNCAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTQwIDQwQzQwIDMyLjI2ODkgMzIuODM3IDI2IDI0IDI2QzE1LjE2MyAyNiA4IDMyLjI2ODkgOCA0MEg0MFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+Cg=='}
                alt="Customer"
                className="w-10 h-10 object-cover"
              />
              <div>
                <h2 className="font-semibold text-[#1B1B1B]">
                  {activeRoom.guestName || 
                    (activeRoom.customerId?.firstName
                      ? `${activeRoom.customerId.firstName} ${activeRoom.customerId?.lastName || ''}`
                      : activeRoom.customerId?.email || "Customer")}
                </h2>
                {activeRoom.guestName && (
                  <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 bg-gray-100 rounded">
                    G
                  </span>
                )}
                {activeRoom.guestEmail && (
                  <p className="text-xs text-[#4A4A4A]">{activeRoom.guestEmail}{activeRoom.guestPhone ? ` · ${activeRoom.guestPhone}` : ''}</p>
                )}
                <div className="flex items-center space-x-2">
                   <p className="text-sm text-[#4A4A4A]">
                     {activeRoom.isClosed ? (
                       <span className="text-red-500 font-medium">Chat closed</span>
                     ) : activeRoom.assignedAdmin ? (
                       <span>Assigned to <span className="font-medium text-[#1B1B1B]">{activeRoom.assignedAdmin.firstName} {activeRoom.assignedAdmin.lastName || ''}</span></span>
                     ) : (
                       <span>Unassigned</span>
                     )}
                     {!activeRoom.guestId && !activeRoom.isClosed && onlineUsers.includes(activeRoom.customerId?._id) && (
                       <span className="ml-2 inline-flex items-center">
                         <span className="w-2 h-2 bg-green-400 mr-1"></span>
                         Online
                       </span>
                     )}
                   </p>
                   {messages.some(msg => msg.senderType === "admin" && isMessageReadByCustomer(msg)) && (
                     <div className="flex items-center space-x-1 text-xs text-[#B1123B]">
                       <span><BiCheckDouble className="w-3 h-3" /></span>
                       <span>Seen</span>
                     </div>
                   )}
                  <div className={`flex items-center space-x-1 text-xs ${
                    isConnected ? 'text-green-600' : 'text-red-600'
                  }`}>
                    <span className={`w-2 h-2 ${
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!activeRoom.assignedAdmin && (
              <button
                onClick={handleAutoAssign}
                disabled={activeRoom.isClosed}
                className="p-2 hover:bg-green-100 transition-colors disabled:opacity-50"
                title="Auto-assign to me"
              >
                <BiUserCheck className="w-5 h-5 text-green-600" />
              </button>
            )}
            <button
              onClick={() => setShowTransferModal(true)}
              disabled={activeRoom.isClosed}
              className="p-2 hover:bg-[#F4F4F4] transition-colors disabled:opacity-50"
              title="Transfer chat"
            >
              <BiTransfer className="w-5 h-5 text-[#4A4A4A]" />
            </button>
            <button
              onClick={handleClose}
              disabled={activeRoom.isClosed}
              className="p-2 hover:bg-red-100 transition-colors disabled:opacity-50"
              title="Close chat"
            >
              <BiX className="w-5 h-5 text-red-600" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FAF8F6] max-h-[calc(100vh-260px)] min-h-[calc(100vh-260px)]">
          {activeRoom.isClosed && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-center">
              <p className="text-sm text-red-600 font-medium">This chat has been closed</p>
              {activeRoom.closedAt && (
                <p className="text-xs text-red-400 mt-1">Closed on {new Date(activeRoom.closedAt).toLocaleDateString()}</p>
              )}
            </div>
          )}
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-[#F4F4F4] flex items-center justify-center">
                  <BiSend className="w-8 h-8 text-[#4A4A4A]" />
                </div>
                <p className="text-[#4A4A4A]">No messages yet</p>
                <p className="text-sm text-[#4A4A4A]">Start the conversation</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, idx) => {
                const isAdmin = msg.senderType === "admin";
                const groupedReactions = {};
                (msg.reactions || []).forEach(r => {
                  if (!groupedReactions[r.emoji]) groupedReactions[r.emoji] = [];
                  groupedReactions[r.emoji].push(r.userName || 'User');
                });
                const hasReactions = Object.keys(groupedReactions).length > 0;

                return (
                  <div
                    key={msg._id || idx}
                    className={`flex group items-end ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] ${isAdmin ? "items-end" : "items-start"} flex flex-col`}>
                      {/* Bubble + action row */}
                      <div className="flex items-center gap-1">
                        {/* Action buttons — only on OTHER person's messages (always visible on touch) */}
                        {!isAdmin && !msg.isDeleted && (
                          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => setShowEmojiForMsg(showEmojiForMsg === msg._id ? null : msg._id)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 text-xs"
                              title="React"
                            >😊</button>
                          </div>
                        )}
                        {isAdmin && !msg.isDeleted && (
                          <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => setActiveMsgMenu(activeMsgMenu === msg._id ? null : msg._id)}
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100"
                              title="More"
                            ><BiDotsHorizontalRounded className="w-4 h-4 text-gray-400" /></button>
                          </div>
                        )}
                        {/* Emoji picker — only on OTHER person's messages */}
                        {showEmojiForMsg === msg._id && !isAdmin && (
                          <div className="shrink-0 z-30">
                            <EmojiPicker
                              onSelect={(emoji) => { addReaction(msg._id, emoji); setShowEmojiForMsg(null); }}
                              onClose={() => setShowEmojiForMsg(null)}
                            />
                          </div>
                        )}
                        {/* Message bubble — relative wrapper for reaction badge */}
                        <div className={`relative ${isAdmin ? 'self-end' : 'self-start'} ${hasReactions ? 'mb-3.5' : ''}`}>
                          <div
                            className={`px-3 py-1.5 ${
                              isAdmin
                                ? `${msg.isDeleted ? 'bg-gray-300 text-gray-500 italic' : 'bg-[#1B1B1B] text-white'} rounded-tl-xl rounded-tr-xl rounded-bl-xl`
                                : `${msg.isDeleted ? 'bg-gray-200 text-gray-500 italic' : 'bg-[#F4F4F4] text-[#1B1B1B]'} rounded-tl-xl rounded-tr-xl rounded-br-xl`
                            }`}
                          >
                            {msg.isDeleted ? (
                              <p className="text-sm leading-relaxed italic">This message has been deleted</p>
                            ) : (
                              <>
                                {msg.image && (
                                  <img
                                    src={msg.image}
                                    alt="Attachment"
                                    className="rounded-lg max-w-[220px] max-h-48 mb-1 cursor-pointer hover:opacity-90 block"
                                    onClick={() => window.open(msg.image, "_blank")}
                                  />
                                )}
                                {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                {msg.edited && <span className="text-[10px] opacity-50 ml-1">(edited)</span>}
                              </>
                            )}
                          </div>
                          {/* Messenger-style reaction badge — overlaps bottom-end */}
                          {hasReactions && (
                            <div className={`absolute -bottom-3 ${isAdmin ? '-right-1' : '-left-1'} flex items-center gap-0.5 px-1 py-0.5 bg-white border border-gray-200 shadow-sm rounded-full z-10`}>
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
                      </div>
                      {/* Context menu — only on admin's own non-deleted messages */}
                      {activeMsgMenu === msg._id && isAdmin && !msg.isDeleted && (
                        <div className={`mt-1 bg-white border border-gray-200 shadow-lg z-20 py-1 min-w-[130px] ${isAdmin ? 'self-end' : 'self-start'}`}>
                          <button
                            onClick={() => { setInputMessage(msg.text); setEditingMsgId(msg._id); setActiveMsgMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                          ><BiPencil className="w-3 h-3" /> Edit</button>
                          <button
                            onClick={() => { deleteMessage(msg._id); setActiveMsgMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-gray-100 flex items-center gap-2"
                          ><BiTrash className="w-3 h-3" /> Delete</button>
                        </div>
                      )}
                      {/* Timestamp + read status */}
                      <div className={`flex items-center gap-1 mt-0.5 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-gray-400">{formatTime(msg.createdAt)}</span>
                        {isAdmin && (
                          <span className={isMessageReadByCustomer(msg) ? "text-[#B1123B]" : "text-gray-400"}>
                            {isMessageReadByCustomer(msg) ? <BiCheckDouble className="w-3 h-3" /> : <BiCheck className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
              
              {/* Typing indicator */}
              {isTyping && (
                <div className="flex justify-start mb-4">
                  <div className="max-w-xs lg:max-w-md order-1">
                    <div className="px-4 py-2 bg-[#F4F4F4] text-[#1B1B1B] rounded-tl rounded-tr rounded-br">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm">
                          {activeRoom.guestName || (activeRoom.customerId?.firstName
                            ? `${activeRoom.customerId.firstName}`
                            : 'Customer')} is typing
                        </span>
                        <div className="flex space-x-0.5">
                          <div className="w-1.5 h-1.5 bg-[#4A4A4A] rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-[#4A4A4A] rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></div>
                          <div className="w-1.5 h-1.5 bg-[#4A4A4A] rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#BDBDBD] bg-white">
          {uploadError && (
            <p className="text-xs text-red-500 mb-1.5">{uploadError}</p>
          )}
          {imageToSend && (
            <div className="flex items-center gap-2 mb-2 p-1.5 bg-[#F4F4F4] border border-[#BDBDBD] w-fit">
              <img src={imageToSend} alt="Preview" className="h-12 w-12 object-cover" />
              <button
                onClick={() => setImageToSend("")}
                className="w-6 h-6 flex items-center justify-center text-[#4A4A4A] hover:text-red-500"
                title="Remove image"
              >
                <BiX className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center space-x-3">
            {editingMsgId && (
              <button
                onClick={() => { setEditingMsgId(null); setInputMessage(''); }}
                className="p-3 text-[#4A4A4A] hover:text-[#1B1B1B] transition-colors shrink-0"
                title="Cancel edit"
              >
                <BiX className="w-5 h-5" />
              </button>
            )}
            {!editingMsgId && (
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
                  disabled={activeRoom.isClosed || uploadingImage}
                  className="p-3 border border-[#BDBDBD] text-[#4A4A4A] hover:text-[#B1123B] hover:border-[#B1123B] transition-colors shrink-0 disabled:opacity-50"
                  title={uploadingImage ? "Uploading..." : "Attach image"}
                >
                  {uploadingImage ? "⏳" : "📎"}
                </button>
              </>
            )}
            <input
              type="text"
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              disabled={activeRoom.isClosed}
              placeholder={activeRoom.isClosed ? "Chat is closed" : editingMsgId ? "Editing message..." : "Type a message..."}
              className={`flex-1 px-4 py-3 border border-[#BDBDBD] focus:outline-none focus:ring-2 focus:ring-[#B1123B] focus:border-transparent ${
                activeRoom.isClosed ? "bg-[#F4F4F4] cursor-not-allowed" : "bg-white"
              }`}
              autoFocus={!!editingMsgId}
            />
            {editingMsgId ? (
              <button
                onClick={() => {
                  if (inputMessage.trim()) { editMessage(editingMsgId, inputMessage.trim()); setEditingMsgId(null); setInputMessage(''); }
                }}
                disabled={!inputMessage.trim()}
                className={`px-4 py-3 font-medium text-sm transition-colors ${
                  inputMessage.trim()
                    ? "bg-[#B1123B] text-white hover:bg-[#8E0E2F]"
                    : "bg-[#F4F4F4] text-[#4A4A4A] cursor-not-allowed"
                }`}
              >
                Update
              </button>
            ) : (
              <button
                onClick={handleSendMessage}
                disabled={(!inputMessage.trim() && !imageToSend) || activeRoom.isClosed}
                className={`p-3 transition-colors ${
                  !activeRoom.isClosed && (inputMessage.trim() || imageToSend)
                    ? "bg-[#1B1B1B] text-white hover:bg-[#4A4A4A]"
                    : "bg-[#F4F4F4] text-[#4A4A4A] cursor-not-allowed"
                }`}
              >
                <BiSend className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
    <TransferModal 
      isOpen={showTransferModal} 
      onClose={() => setShowTransferModal(false)} 
      onTransfer={handleTransfer} 
    />
    </>
  );
};

export default AdminMessagePage;
