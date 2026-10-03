'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";
import { io } from "socket.io-client";

const UserChatContext = createContext();

export const useUserChat = () => {
  const context = useContext(UserChatContext);
  if (!context) {
    throw new Error("useUserChat must be used within a UserChatProvider");
  }
  return context;
};

export const UserChatProvider = ({ children }) => {
  const { user, authRequest, isLoggedIn, getAuthHeader } = useContext(UserContext);
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  // Guest chat state
  const [guestInfo, setGuestInfoState] = useState(() => {
    try {
      const saved = getStorage('guestChatInfo');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showGuestForm, setShowGuestForm] = useState(false);
  const guestId = useMemo(() => {
    try {
      let id = getStorage('guestChatId');
      if (!id) {
        id = 'guest_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        setStorage('guestChatId', id);
      }
      return id;
    } catch { return 'guest_' + Date.now(); }
  }, []);

  const setGuestInfo = (info) => {
    setGuestInfoState(info);
    try { setStorage('guestChatInfo', JSON.stringify(info)); } catch {}
  };
  
  // Notification states
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessageNotifications, setNewMessageNotifications] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [isTyping, setIsTyping] = useState(false);



  const API_URI = process.env.NEXT_PUBLIC_API_URI ;

  // Request browser notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // --- Helper function to show notification ---
  const showMessageNotification = (message) => {
    const adminName = assignedAdmin?.firstName || assignedAdmin?.lastName || 'Admin';
    const notification = {
      id: Date.now(),
      message: message.text,
      sender: message.senderType === 'admin' ? adminName : 'You',
      timestamp: new Date().toLocaleTimeString()
    };
    
    setNewMessageNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications
    setShowNotification(true);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  // --- Show browser notification ---
  const showBrowserNotification = (message) => {
    if ("Notification" in window && Notification.permission === "granted") {
      const adminName = assignedAdmin?.firstName || assignedAdmin?.name || 'Admin';
      const title = `💬 New message from ${adminName}`;
      const options = {
        body: message.text.length > 100 ? message.text.substring(0, 100) + '...' : message.text,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `user-chat-${activeRoom?._id}`,
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        data: {
          roomId: activeRoom?._id,
          messageId: message._id,
          senderType: message.senderType,
          timestamp: new Date().toISOString()
        },
        actions: [
          {
            action: 'open',
            title: '📱 Open Chat',
            icon: '/favicon.ico'
          },
          {
            action: 'mark_read',
            title: '✅ Mark Read',
            icon: '/favicon.ico'
          },
          {
            action: 'dismiss',
            title: '❌ Dismiss',
            icon: '/favicon.ico'
          }
        ]
      };
      
      const notification = new Notification(title, options);
      
      // Handle notification clicks
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        setIsOpen(true);
        notification.close();
      };
      
      // Handle notification actions
      notification.onactionclick = (event) => {
        event.preventDefault();
        if (event.action === 'open') {
          window.focus();
          setIsOpen(true);
        } else if (event.action === 'mark_read') {
          // Mark messages as read via socket
          if (socket && socket.connected && activeRoom?._id) {
            socket.emit("markMessagesAsRead", {
              roomId: activeRoom._id,
              readerType: "customer",
              readerId: user._id
            });
          }
        }
        notification.close();
      };
      
      // Auto-close notification after 15 seconds
      setTimeout(() => {
        notification.close();
      }, 15000);
    }
  };

  // --- Socket.IO connection ---
  useEffect(() => {
    const isGuest = !user?._id || !isLoggedIn;
    
    if (socket && socket.connected) {
      return;
    }

    if (!API_URI) return;

    const socketClient = io(API_URI, {
      auth: { token: isGuest ? '' : getStorage("accessToken") },
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 5000,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });

    socketClient.on("connect", () => {
      setIsConnected(true);
      if (!isGuest) socketClient.emit("joinUserRoom", user._id);
      setError(null);
    });

    socketClient.on("connect_error", () => {
      setIsConnected(false);
      socketClient.disconnect();
    });

    socketClient.on("messageReceived", (message) => {
      
      // Check if message already exists to prevent duplication
      setMessages((prev) => {
        const messageExists = prev.some(msg => 
          msg._id === message._id || 
          (msg.senderId === message.senderId && 
           msg.text === message.text && 
           Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
        );
        
        if (messageExists) {
          return prev;
        }
        
        // Ensure message has proper structure with unique _id
        const cleanMessage = {
          _id: message._id || `temp_${Date.now()}_${Math.random()}`,
          senderId: message.senderId,
          senderType: message.senderType || 'customer',
          senderName: message.senderName || '',
          text: message.text,
          reaction: message.reaction || "",
          readBy: Array.isArray(message.readBy) ? message.readBy : [],
          createdAt: message.createdAt || new Date()
        };
        
        return [...prev, cleanMessage];
      });
      
      // Show notification if chat is not open
      if (!isOpen) {
        showMessageNotification(message);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification
        showBrowserNotification(message);
      }
    });

    // Handle read status updates via socket
    socketClient.on("readStatusUpdated", (data) => {
      
      // Update messages with read status - apply actual readBy from server
      if (data.roomId === activeRoom?._id && data.readerType === 'admin') {
        setMessages(prev => prev.map(msg => {
          if (msg.senderType !== 'customer' && msg.senderType !== 'guest') return msg;
          const alreadyRead = (msg.readBy || []).some(r => r.readerType === 'admin');
          if (alreadyRead) return msg;
          return {
            ...msg,
            readBy: [
              ...(Array.isArray(msg.readBy) ? msg.readBy : []),
              { readerType: 'admin', readerId: data.readerId, readAt: data.readAt }
            ]
          };
        }));
      }
      
      // Update active room with last read time
      if (activeRoom?._id === data.roomId) {
        setActiveRoom(prev => ({
          ...prev,
          lastReadAt: data.readAt
        }));
      }
    });

    socketClient.on("messagesRead", (data) => {
      if (data.readBy) {
        setMessages(prev => prev.map(msg => ({
          ...msg,
          readBy: data.readBy
        })));
      }
    });

    socketClient.on("onlineStatusChanged", (data) => {
      if (data.userId === activeRoom?.assignedAdmin?._id) {
        setIsOnline(data.isOnline);
      }
    });

    socketClient.on("roomAssigned", (data) => {
      if (data.roomId === activeRoom?._id) {
        setAssignedAdmin({
          _id: data.adminId,
          firstName: data.adminName
        });
      }
    });

    // Handle room updates silently via socket
    socketClient.on("roomUpdated", (data) => {
      if (data.roomId === activeRoom?._id) {
        setActiveRoom(prev => ({ ...prev, ...data.updates }));
        if (data.updates.assignedAdmin) {
          setAssignedAdmin(data.updates.assignedAdmin);
        }
      }
    });

    // Handle message status updates silently via socket
    socketClient.on("messageStatusUpdated", (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, readBy: data.updates?.readBy || msg.readBy, ...data.updates }
          : msg
      ));
    });

    // Handle message confirmation (replace temp messages with real ones)
    socketClient.on("messageConfirmed", (data) => {
      setMessages(prev => prev.map(msg => 
        msg._id === data.tempId 
          ? { ...msg, _id: data.realId, ...data.updates }
          : msg
      ));
    });

    socketClient.on("messageUpdated", (data) => {
      const { messageId, updates } = data;
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, ...updates } : msg
      ));
    });

    socketClient.on("userTyping", (data) => {
      // Handle typing indicator from admin
      if (data.senderType === "admin" && data.isTyping) {
        setIsTyping(true);
      } else if (data.senderType === "admin" && !data.isTyping) {
        setIsTyping(false);
      }
    });

    socketClient.on("roomClosed", (data) => {
      setActiveRoom(prev => prev ? { ...prev, isClosed: true } : prev);
      setError("Chat has been closed by support");
    });

    socketClient.on("disconnect", () => {
      setIsConnected(false);
      setError("Connection lost");
    });

    socketClient.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setIsConnected(false);
      setError("Connection error");
    });

    setSocket(socketClient);

    return () => {
      if (socketClient) {
        socketClient.disconnect();
      }
    };
  }, [user?._id, isLoggedIn]);

  // --- Fetch or create chat room (socket-first approach) ---
  const fetchRoom = React.useCallback(async (guestData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const isGuest = !user?._id || !isLoggedIn;
      const roomData = isGuest
        ? { guestId: guestId, guestName: guestData?.name || guestInfo?.name || '', guestEmail: guestData?.email || guestInfo?.email || '', guestPhone: guestData?.phone || guestInfo?.phone || '' }
        : { userId: user._id };

      // First try to get room via socket if connected
      if (socket && socket.connected) {
        socket.emit("getRoomData", roomData);
        
        // Set a timeout for socket response
        const socketTimeout = setTimeout(() => {
          fallbackToAPI();
        }, 3000);

        // Listen for socket response
        const handleRoomData = (roomData) => {
          clearTimeout(socketTimeout);
          socket.off("roomDataReceived", handleRoomData);
          
          if (roomData && roomData._id) {
            processRoomData(roomData);
          } else {
            fallbackToAPI();
          }
        };

        socket.on("roomDataReceived", handleRoomData);
        return;
      }

      // Fallback to API if socket not available
      fallbackToAPI();

      async function fallbackToAPI() {
        try {
          if (isGuest) {
            setError("Connecting via socket...");
            setIsLoading(false);
            return;
          }

          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Request timeout')), 8000)
          );
          
          const fetchPromise = authRequest(`${API_URI}/api/user/rooms/${user._id}`);
          const room = await Promise.race([fetchPromise, timeoutPromise]);
          
          if (room && room._id) {
            processRoomData(room);
          } else {
            setError("No room data received from server");
            setIsLoading(false);
          }
        } catch (err) {
          console.error("Error fetching room via API:", err);
          setError(err.message === 'Request timeout' ? "Request timed out. Please try again." : err.response?.data?.message || "Failed to load chat");
          setIsLoading(false);
        }
      }

      function processRoomData(room) {
        setActiveRoom(room);
        
        // Process messages
        const cleanMessages = (room.messages || [])
          .filter(msg => msg && msg.text)
          .map(msg => ({
            _id: msg._id || `msg_${Date.now()}_${Math.random()}`,
            senderId: msg.senderId,
            senderType: msg.senderType || 'customer',
            guestId: msg.guestId,
            senderName: msg.senderName,
            text: msg.text,
            reaction: msg.reaction || "",
            readBy: Array.isArray(msg.readBy) ? msg.readBy : [],
            createdAt: msg.createdAt || new Date()
          }));
        
        setMessages(cleanMessages);
        setAssignedAdmin(room.assignedAdmin);
        setIsLoading(false);
        
        // Join chat room via socket
        if (socket && room._id) {
          socket.emit("joinChatRoom", { 
            roomId: room._id, 
            userId: user?._id || guestId,
            userType: "customer" 
          });
        }
      }

    } catch (err) {
      console.error("Error in fetchRoom:", err);
      setError("Failed to load chat");
      setIsLoading(false);
    }
  }, [user?._id, authRequest, API_URI, socket, isLoggedIn, guestInfo]);

  // --- Single effect to handle room fetching and loading state ---
  useEffect(() => {
    if (!isOpen) return;

    const isGuest = !user?._id || !isLoggedIn;

    if (isGuest && !guestInfo) {
      setShowGuestForm(true);
      setIsLoading(false);
      return;
    }

    // Check if we already have a valid room for this user/guest
    if (activeRoom && activeRoom._id) {
      if (!isGuest) {
        const roomCustomerId = typeof activeRoom?.customerId === 'object' ? activeRoom.customerId._id : activeRoom?.customerId;
        if (roomCustomerId === user._id) {
          setIsLoading(false);
          return;
        }
      } else {
        if (activeRoom.guestId === guestId) {
          setIsLoading(false);
          return;
        }
      }
    }

    // Only fetch if we don't have a room and we're not already loading
    if (!activeRoom && !isLoading) {
      fetchRoom();
    }
  }, [isOpen, user?._id, isLoggedIn, activeRoom, guestInfo]);

  // --- Clear loading state when we have valid room data ---
  useEffect(() => {
    if (activeRoom && activeRoom._id && isLoading) {
      setIsLoading(false);
    }
  }, [activeRoom, isLoading]);

  // --- Join room when socket is ready ---
  useEffect(() => {
    if (socket && activeRoom?._id && isConnected && isOpen) {
      const senderId = user?._id || guestId;
      socket.emit("joinChatRoom", { 
        roomId: activeRoom._id, 
        userId: senderId, 
        userType: "customer" 
      });

      // Immediately mark messages as read (optimistic) when opening
      socket.emit("markMessagesAsRead", {
        roomId: activeRoom._id,
        readerType: "customer",
        readerId: senderId
      });

      // Optimistic UI: mark all admin messages as read locally immediately
      setMessages(prev => prev.map(msg => {
        if (msg.senderType === 'admin' && !(msg.readBy || []).some(r => r.readerType === 'customer')) {
          return {
            ...msg,
            readBy: [
              ...(Array.isArray(msg.readBy) ? msg.readBy : []),
              { readerType: 'customer', readerId: senderId, readAt: new Date().toISOString() }
            ]
          };
        }
        return msg;
      }));
    }
  }, [socket, activeRoom?._id, isConnected, user?._id, isOpen]);

  // --- Scroll to bottom ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Send message ---
  const handleSend = React.useCallback(async () => {
    const trimmed = inputMessage.trim();
    if (!trimmed) return;
    if (!activeRoom?._id) {
      return;
    }
    
    const isGuest = !user?._id || !isLoggedIn;
    
    try {
      setError(null);
      
      // Send message via socket first for immediate feedback
      if (socket) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const tempMessage = {
          _id: tempId,
          senderType: isGuest ? "guest" : "customer",
          text: inputMessage,
          reaction: "",
          readBy: [],
          reactions: [],
          createdAt: new Date()
        };
        if (isGuest) {
          tempMessage.guestId = guestId;
          tempMessage.senderName = guestInfo?.name || 'Guest';
        } else {
          tempMessage.senderId = user._id;
        }
        
        // Add message to UI immediately for better UX
        setMessages(prev => [...prev, tempMessage]);
        
        // Emit via socket with tempId so backend can echo it back
        const socketData = { 
          roomId: activeRoom._id, 
          senderType: isGuest ? "guest" : "customer", 
          text: inputMessage,
          tempId
        };
        if (isGuest) {
          socketData.guestId = guestId;
          socketData.senderName = guestInfo?.name || 'Guest';
        } else {
          socketData.senderId = user._id;
        }
        socket.emit("sendMessage", socketData);
      }
      
      setInputMessage("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.response?.data?.message || "Failed to send message");
    }
  }, [inputMessage, activeRoom?._id, socket, user?._id, isLoggedIn, guestInfo]);

  // --- Mark messages as read (with debouncing) ---
  const markAsReadTimeoutRef = useRef(null);
  const markAsRead = React.useCallback(async () => {
    if (!activeRoom?._id) return;
    
    // Clear existing timeout
    if (markAsReadTimeoutRef.current) {
      clearTimeout(markAsReadTimeoutRef.current);
    }
    
    // Debounce mark as read to prevent excessive socket emissions
    markAsReadTimeoutRef.current = setTimeout(() => {
      try {
        // Mark messages as read via socket instead of API
        if (socket && socket.connected) {
          socket.emit("markMessagesAsRead", {
            roomId: activeRoom._id,
            readerType: "customer",
            readerId: user._id
          });
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }, 300); // 300ms delay
  }, [activeRoom?._id, socket, user?._id]);

  // --- Update online status ---
  const updateOnlineStatus = React.useCallback(async (status) => {
    if (!activeRoom?._id) return;
    
    try {
      // Update online status via socket
      if (socket) {
        socket.emit("updateOnlineStatus", {
          roomId: activeRoom._id,
          userId: user._id,
          isOnline: status
        });
      }
    } catch (err) {
      console.error("Error updating online status:", err);
    }
  }, [activeRoom?._id, socket, user?._id]);

  // --- Send typing indicator ---
  const sendTypingIndicator = React.useCallback((isTyping) => {
    if (!activeRoom?._id || !socket) return;
    
    try {
      if (isTyping) {
        socket.emit("typingStart", {
          roomId: activeRoom._id,
          senderId: user._id,
          senderType: "customer"
        });
      } else {
        socket.emit("typingStop", {
          roomId: activeRoom._id,
          senderId: user._id,
          senderType: "customer"
        });
      }
    } catch (err) {
      console.error("Error sending typing indicator:", err);
    }
  }, [activeRoom?._id, socket, user?._id]);

  // --- Open/Close chat ---
  const openChat = React.useCallback(() => {
    setIsOpen(true);
    setUnreadCount(0);
    
    const isGuest = !user?._id || !isLoggedIn;
    const senderId = user?._id || guestId;
    const readerType = isGuest ? "guest" : "customer";
    
    if (socket && socket.connected && activeRoom?._id) {
      socket.emit("joinChatRoom", { 
        roomId: activeRoom._id, 
        userId: senderId, 
        userType: "customer" 
      });
      
      socket.emit("markMessagesAsRead", {
        roomId: activeRoom._id,
        readerType,
        readerId: senderId
      });
      
      socket.emit("updateOnlineStatus", {
        roomId: activeRoom._id,
        userId: senderId,
        isOnline: true
      });
    }
  }, [socket, activeRoom?._id, user?._id, isLoggedIn]);
  
  const closeChat = React.useCallback(() => {
    setIsOpen(false);
    
    const isGuest = !user?._id || !isLoggedIn;
    const senderId = user?._id || guestId;
    
    if (socket && socket.connected && activeRoom?._id) {
      socket.emit("updateOnlineStatus", {
        roomId: activeRoom._id,
        userId: senderId,
        isOnline: false
      });
    }
  }, [socket, activeRoom?._id, user?._id]);

  // --- Clear error ---
  const clearError = React.useCallback(() => setError(null), []);

  // --- Retry loading chat (with throttling) ---
  const [lastRetryTime, setLastRetryTime] = useState(0);
  const retryLoadChat = React.useCallback(() => {
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime;
    
    // Throttle retries to prevent spam (minimum 3 seconds between retries)
    if (timeSinceLastRetry < 3000) {
      setError("Please wait before retrying");
      return;
    }
    
    setLastRetryTime(now);
    setError(null);
    setIsLoading(false); // Reset loading state
    
    // Only clear room data if we don't have a valid room
    if (!activeRoom || !activeRoom._id) {
      setActiveRoom(null);
      setMessages([]);
      fetchRoom();
    } else {
      // If we have room data, just clear loading state
      setIsLoading(false);
    }
  }, [fetchRoom, lastRetryTime, activeRoom]);

  // --- Clear notifications ---
  const clearNotifications = React.useCallback(() => {
    setNewMessageNotifications([]);
    setShowNotification(false);
  }, []);

  // --- Cleanup timeouts on unmount ---
  useEffect(() => {
    return () => {
      if (markAsReadTimeoutRef.current) {
        clearTimeout(markAsReadTimeoutRef.current);
      }
    };
  }, []);

  // --- Add reaction to message ---
  const addReaction = React.useCallback((messageId, emoji) => {
    if (!activeRoom?._id || !socket || !socket.connected) return;
    const isGuest = !user?._id || !isLoggedIn;
    const senderId = user?._id || guestId;
    const userName = isGuest ? (guestInfo?.name || 'Guest') : `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
    socket.emit("addReaction", {
      roomId: activeRoom._id,
      messageId,
      emoji,
      userId: senderId,
      userName
    });
  }, [activeRoom?._id, socket, user, isLoggedIn, guestId, guestInfo]);

  // --- Edit message ---
  const editMessage = React.useCallback((messageId, newText) => {
    if (!activeRoom?._id || !socket || !socket.connected) return;
    const isGuest = !user?._id || !isLoggedIn;
    if (isGuest) return;
    socket.emit("editMessage", {
      roomId: activeRoom._id,
      messageId,
      text: newText,
      senderId: user._id
    });
  }, [activeRoom?._id, socket, user, isLoggedIn]);

  // --- Delete message ---
  const deleteMessage = React.useCallback((messageId) => {
    if (!activeRoom?._id || !socket || !socket.connected) return;
    const isGuest = !user?._id || !isLoggedIn;
    if (isGuest) return;
    socket.emit("deleteMessage", {
      roomId: activeRoom._id,
      messageId,
      senderId: user._id
    });
  }, [activeRoom?._id, socket, user, isLoggedIn]);

  // --- Continuous mark-as-read when chat is open ---
  useEffect(() => {
    if (!isOpen || !activeRoom?._id || !socket || !socket.connected) return;
    const isGuest = !user?._id || !isLoggedIn;
    const senderId = user?._id || guestId;
    const readerType = isGuest ? 'guest' : 'customer';
    const markRead = () => {
      socket.emit("markMessagesAsRead", {
        roomId: activeRoom._id,
        readerType,
        readerId: senderId
      });
    };
    markRead();
    const interval = setInterval(markRead, 5000);
    return () => clearInterval(interval);
  }, [isOpen, activeRoom?._id, socket, user?._id, isLoggedIn, guestId]);

  const value = {
    // State
    isOpen,
    inputMessage,
    messages,
    activeRoom,
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
    
    // Guest state
    guestInfo,
    setGuestInfo,
    showGuestForm,
    setShowGuestForm,
    
    // Actions
    openChat,
    closeChat,
    setInputMessage,
    handleSend,
    clearError,
    clearNotifications,
    markAsRead,
    retryLoadChat,
    sendTypingIndicator,
    addReaction,
    editMessage,
    deleteMessage,
    
    // Additional data for components
    socket,
    user,
  };

  return (
    <UserChatContext.Provider value={value}>
      {children}
    </UserChatContext.Provider>
  );
};
