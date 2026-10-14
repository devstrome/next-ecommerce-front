'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { UserContext } from "./UserContext";
import { io } from "socket.io-client";
import { notificationFeedStorage, showBrowserNotification as showNativeBrowserNotification } from '../lib/browserNotifications';

const API_URI = process.env.NEXT_PUBLIC_API_URI;
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
  const [imageToSend, setImageToSend] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messages, setMessages] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
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
  const [activityNotifications, setActivityNotifications] = useState([]);
  const activityNotificationsRef = useRef(activityNotifications);
  activityNotificationsRef.current = activityNotifications;
  const notificationFeedKeyRef = useRef(null);
  const notificationFeedKey = user?._id ? `belorella:notification-feed:user:${user._id}` : null;
  const [showNotification, setShowNotification] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [assignedAdmin, setAssignedAdmin] = useState(null);
  const [isTyping, setIsTyping] = useState(false);

  // Refs mirroring latest values for one-time socket listeners (avoids stale closures)
  const activeRoomRef = useRef(null);
  const isOpenRef = useRef(false);
  const fetchRoomRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;
  activeRoomRef.current = activeRoom;
  isOpenRef.current = isOpen;



  useEffect(() => {
    notificationFeedKeyRef.current = notificationFeedKey;
    const saved = notificationFeedStorage.read(notificationFeedKey);
    activityNotificationsRef.current = saved;
    setActivityNotifications(saved);
  }, [notificationFeedKey]);

  const addActivityNotification = (notification) => {
    const key = notificationFeedKeyRef.current;
    const current = activityNotificationsRef.current;
    if (current.some((item) => item.id === notification.id)) return;
    const next = [{ read: false, createdAt: new Date().toISOString(), ...notification }, ...current].slice(0, 50);
    activityNotificationsRef.current = next;
    setActivityNotifications(next);
    notificationFeedStorage.write(key, next);
  };

  const markActivityNotificationRead = (id) => {
    const next = activityNotificationsRef.current.map((item) => item.id === id ? { ...item, read: true } : item);
    activityNotificationsRef.current = next;
    setActivityNotifications(next);
    notificationFeedStorage.write(notificationFeedKeyRef.current, next);
  };

  const markAllActivityNotificationsRead = () => {
    const next = activityNotificationsRef.current.map((item) => ({ ...item, read: true }));
    activityNotificationsRef.current = next;
    setActivityNotifications(next);
    notificationFeedStorage.write(notificationFeedKeyRef.current, next);
  };

  const clearActivityNotifications = () => {
    activityNotificationsRef.current = [];
    setActivityNotifications([]);
    notificationFeedStorage.write(notificationFeedKeyRef.current, []);
  };

  const addActivityNotificationRef = useRef(addActivityNotification);
  addActivityNotificationRef.current = addActivityNotification;

  // --- Helper function to show notification ---
  const showMessageNotification = (message) => {
    const adminName = message.senderName || assignedAdmin?.fullName || [assignedAdmin?.firstName, assignedAdmin?.lastName].filter(Boolean).join(' ') || assignedAdmin?.name || 'BELORELLA Support';
    const notification = {
      id: Date.now(),
      message: message.text || (message.image ? 'Sent an image' : 'Sent a message'),
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
      const adminName = message.senderName || assignedAdmin?.fullName || [assignedAdmin?.firstName, assignedAdmin?.lastName].filter(Boolean).join(' ') || assignedAdmin?.name || 'BELORELLA Support';
      const messageText = typeof message.text === 'string' && message.text.trim()
        ? message.text.trim()
        : message.image ? 'Sent an image' : 'Sent a message';
      const title = `💬 New message from ${adminName}`;
      showNativeBrowserNotification({
        title,
        body: messageText,
        image: message.image || undefined,
        url: '/contactus',
        tag: `user-chat-${message._id || message.roomId || Date.now()}`,
        data: { roomId: message.roomId, messageId: message._id, senderName: adminName },
      });
    }
  };
  const showBrowserNotificationRef = useRef(showBrowserNotification);
  showBrowserNotificationRef.current = showBrowserNotification;
  const showMessageNotificationRef = useRef(showMessageNotification);
  showMessageNotificationRef.current = showMessageNotification;

  // --- Socket.IO connection ---
  useEffect(() => {
    const isGuest = !user?._id || !isLoggedIn;
    
    if (socketRef.current?.connected) {
      return;
    }

    if (!API_URI) return;

    const socketClient = io(API_URI, {
      auth: { token: isGuest ? '' : getStorage("accessToken") },
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      transports: ['websocket', 'polling']
    });
    socketRef.current = socketClient;

    socketClient.on("connect", () => {
      setIsConnected(true);
      if (!isGuest) socketClient.emit("joinUserRoom", user._id);
      setError(null);
      // Resync missed messages after a reconnect
      if (isOpenRef.current && activeRoomRef.current?._id && fetchRoomRef.current) {
        fetchRoomRef.current();
      }
    });

    socketClient.on("connect_error", () => {
      setIsConnected(false);
    });

    if (!isGuest && user?._id) {
      socketClient.on(`user:orderUpdate:${user._id}`, (payload = {}) => {
        const order = payload.order || payload.data?.order || payload.data || payload;
        if (!order?.orderId) return;
        const eventType = payload.eventType || payload.updateType || 'update';
        const title = eventType === 'create'
          ? `Order #${order.orderId} placed`
          : eventType === 'cancel'
            ? `Order #${order.orderId} cancelled`
            : `Order #${order.orderId} updated`;
        const firstItem = order.items?.[0] || {};
        const itemsText = (order.items || []).slice(0, 3).map((item) => {
          const options = [
            item.variantName,
            item.color || item.configuration?.color,
            item.size || item.configuration?.size,
            item.regionName || item.configuration?.regionName,
          ].filter(Boolean).join(' / ');
          return `${item.name || 'Product'} ×${Number(item.quantity) || 1}${options ? ` · ${options}` : ''}`;
        }).join(', ');
        const amount = Number(order.grandTotal ?? order.totalAmount);
        const amountText = Number.isFinite(amount) ? `BDT ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
        const paymentText = [order.paymentMethod, order.paymentStatus ? `Payment ${order.paymentStatus}` : ''].filter(Boolean).join(' · ');
        const body = [order.orderStatus ? `Status: ${order.orderStatus}` : '', itemsText, amountText, paymentText].filter(Boolean).join('\n') || 'Open your orders to view the latest details.';
        const id = `order:${order.orderId}:${eventType}:${order.updatedAt || order.createdAt || Date.now()}`;
        addActivityNotificationRef.current?.({
          id,
          kind: 'order',
          title,
          body,
          image: firstItem.mainImage || firstItem.variantImage || '',
          url: '/profile/orders',
          createdAt: order.updatedAt || order.createdAt || new Date().toISOString(),
          details: order,
        });
        showNativeBrowserNotification({
          title,
          body,
          image: firstItem.mainImage || firstItem.variantImage || undefined,
          url: '/profile/orders',
          tag: id,
          data: { orderId: order.orderId, eventType },
        });
      });
    }

    socketClient.on("messageReceived", (message) => {
      
      // Check if message already exists to prevent duplication
      setMessages((prev) => {
        const messageExists = prev.some(msg => 
          msg._id === message._id || 
          (message.clientMessageId && msg.clientMessageId === message.clientMessageId) ||
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
          clientMessageId: message.clientMessageId || '',
          senderType: message.senderType || 'customer',
          senderName: message.senderName || '',
          text: message.text,
          image: message.image || '',
          reaction: message.reaction || "",
          reactions: Array.isArray(message.reactions) ? message.reactions : [],
          readBy: Array.isArray(message.readBy) ? message.readBy : [],
          createdAt: message.createdAt || new Date()
        };
        
        return [...prev, cleanMessage];
      });
      
      // Show notification if chat is not open (use ref — listener is attached once)
      if (!isOpenRef.current) {
        showMessageNotificationRef.current?.(message);
        setUnreadCount(prev => prev + 1);
        
        // Show browser notification
        showBrowserNotificationRef.current?.(message);
        if (message.senderType === 'admin') {
          const senderName = message.senderName || assignedAdmin?.fullName || [assignedAdmin?.firstName, assignedAdmin?.lastName].filter(Boolean).join(' ') || assignedAdmin?.name || 'BELORELLA Support';
          const preview = typeof message.text === 'string' && message.text.trim()
            ? message.text.trim()
            : message.image ? 'Sent an image' : 'Sent a message';
          addActivityNotificationRef.current?.({
            id: `chat-message:${message._id || `${message.roomId}:${message.createdAt || Date.now()}`}`,
            kind: 'message',
            title: `Message from ${senderName}`,
            body: preview,
            image: message.image || '',
            url: '/contactus',
            createdAt: message.createdAt || new Date().toISOString(),
            details: { roomId: message.roomId, messageId: message._id, senderName },
          });
        }
      } else if (activeRoomRef.current?._id === message.roomId && socketClient.connected) {
        // Mark incoming messages read immediately for instant receipts on the other side
        const isGuestNow = !user?._id || !isLoggedIn;
        socketClient.emit("markMessagesAsRead", {
          roomId: message.roomId,
          readerType: isGuestNow ? 'guest' : 'customer',
          readerId: user?._id || guestId
        });
      }
    });

    // Handle read status updates via socket
    socketClient.on("readStatusUpdated", (data) => {
      
      // Update messages with read status - apply actual readBy from server
      if (data.roomId === activeRoomRef.current?._id && data.readerType === 'admin') {
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
      if (activeRoomRef.current?._id === data.roomId) {
        setActiveRoom(prev => prev ? ({
          ...prev,
          lastReadAt: data.readAt
        }) : prev);
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
      if (data.userId === activeRoomRef.current?.assignedAdmin?._id) {
        setIsOnline(data.isOnline);
      }
    });

    socketClient.on("roomAssigned", (data) => {
      if (data.roomId === activeRoomRef.current?._id) {
        setAssignedAdmin({
          _id: data.adminId,
          firstName: data.adminName
        });
      }
    });

    // Handle room updates silently via socket
    socketClient.on("roomUpdated", (data) => {
      if (data.roomId === activeRoomRef.current?._id) {
        setActiveRoom(prev => prev ? ({ ...prev, ...data.updates }) : prev);
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
      setMessages(prev => prev.map(msg => {
        if (msg._id !== messageId) return msg;
        if (updates) return { ...msg, ...updates };
        // Flat payload emitted by the chat server for reaction updates
        const patch = {};
        if (Array.isArray(data.reactions)) patch.reactions = data.reactions;
        if (data.reaction !== undefined) patch.reaction = data.reaction;
        if (data.image !== undefined) patch.image = data.image;
        if (data.text !== undefined) patch.text = data.text;
        return { ...msg, ...patch };
      }));
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
      socketClient.disconnect();
      if (socketRef.current === socketClient) socketRef.current = null;
    };
  }, [user?._id, isLoggedIn, guestId]);

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
        
        // Process messages (keep image-only messages too)
        const cleanMessages = (room.messages || [])
          .filter(msg => msg && (msg.text || msg.image))
          .map(msg => ({
            _id: msg._id || `msg_${Date.now()}_${Math.random()}`,
            senderId: msg.senderId,
            senderType: msg.senderType || 'customer',
            guestId: msg.guestId,
            senderName: msg.senderName,
            text: msg.text,
            image: msg.image || '',
            reaction: msg.reaction || "",
            reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
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
  }, [user?._id, authRequest, socket, isLoggedIn, guestInfo, guestId]);

  // Keep latest fetchRoom available to the one-time socket listeners (reconnect resync)
  fetchRoomRef.current = fetchRoom;

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
    if (!activeRoom && !isLoadingRef.current) {
      fetchRoomRef.current?.();
    }
  }, [isOpen, user?._id, isLoggedIn, activeRoom, guestInfo, guestId]);

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
  }, [socket, activeRoom?._id, isConnected, user?._id, isOpen, guestId]);

  // --- Scroll to bottom ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Send message ---
  const handleSend = React.useCallback(async () => {
    const trimmed = inputMessage.trim();
    const image = imageToSend;
    if ((!trimmed && !image) || !activeRoom?._id || !socket?.connected || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setIsSendingMessage(true);
    
    const isGuest = !user?._id || !isLoggedIn;
    
    try {
      setError(null);
      
      // Send message via socket first for immediate feedback
      if (socket.connected) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const tempMessage = {
          _id: tempId,
          senderType: isGuest ? "guest" : "customer",
          clientMessageId: tempId,
          text: trimmed,
          image,
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
          text: trimmed,
          image,
          tempId
        };
        if (isGuest) {
          socketData.guestId = guestId;
          socketData.senderName = guestInfo?.name || 'Guest';
        } else {
          socketData.senderId = user._id;
        }
        const acknowledgement = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve({
            success: false,
            error: 'No confirmation yet. Check the conversation before retrying.'
          }), 15000);
          socket.emit("sendMessage", socketData, (result) => {
            clearTimeout(timeout);
            resolve(result || { success: true });
          });
        });

        setInputMessage("");
        setImageToSend("");
        const result = await acknowledgement;
        if (!result.success) {
          setMessages((prev) => prev.filter((msg) => msg._id !== tempId));
          setInputMessage((current) => current || trimmed);
          setImageToSend((current) => current || image);
          setError(result.error || 'Failed to send message. Please try again.');
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      sendInFlightRef.current = false;
      setIsSendingMessage(false);
    }
  }, [inputMessage, imageToSend, activeRoom?._id, socket, user?._id, isLoggedIn, guestId, guestInfo]);

  // --- Mark messages as read (with debouncing) ---
  const markAsReadTimeoutRef = useRef(null);
  const markAsRead = React.useCallback(async () => {
    if (!activeRoom?._id) return;
    const isGuest = !user?._id || !isLoggedIn;
    const readerId = user?._id || guestId;
    
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
          readerType: isGuest ? "guest" : "customer",
          readerId
          });
        }
      } catch (err) {
        console.error("Error marking messages as read:", err);
      }
    }, 300); // 300ms delay
  }, [activeRoom?._id, socket, user?._id, isLoggedIn, guestId]);

  // --- Update online status ---
  const updateOnlineStatus = React.useCallback(async (status) => {
    if (!activeRoom?._id) return;
    const senderId = user?._id || guestId;
    
    try {
      // Update online status via socket
      if (socket) {
        socket.emit("updateOnlineStatus", {
          roomId: activeRoom._id,
          userId: senderId,
          isOnline: status
        });
      }
    } catch (err) {
      console.error("Error updating online status:", err);
    }
  }, [activeRoom?._id, socket, user?._id, guestId]);

  // --- Send typing indicator ---
  const sendTypingIndicator = React.useCallback((isTyping) => {
    if (!activeRoom?._id || !socket) return;
    
    try {
      if (isTyping) {
        socket.emit("typingStart", {
          roomId: activeRoom._id,
          senderId: user?._id || guestId,
          senderType: user?._id ? "customer" : "guest"
        });
      } else {
        socket.emit("typingStop", {
          roomId: activeRoom._id,
          senderId: user?._id || guestId,
          senderType: user?._id ? "customer" : "guest"
        });
      }
    } catch (err) {
      console.error("Error sending typing indicator:", err);
    }
  }, [activeRoom?._id, socket, user?._id, guestId]);

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
  }, [socket, activeRoom?._id, user?._id, isLoggedIn, guestId]);
  
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
  }, [socket, activeRoom?._id, user?._id, isLoggedIn, guestId]);

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
    const uid = String(senderId);

    // Optimistic: apply instantly, server broadcast will reconcile
    setMessages(prev => prev.map(m => {
      if (m._id !== messageId) return m;
      const current = Array.isArray(m.reactions) ? m.reactions : [];
      const idx = current.findIndex(r => String(r.userId) === uid);
      let next;
      if (idx >= 0) {
        next = current[idx].emoji === emoji
          ? current.filter((_, i) => i !== idx)
          : current.map((r, i) => i === idx ? { ...r, emoji } : r);
      } else {
        next = [...current, { emoji, userId: uid, senderType: 'customer', userName, createdAt: new Date().toISOString() }];
      }
      return { ...m, reactions: next, reaction: next.length ? next[0].emoji : '' };
    }));

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
    activityNotifications,
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
    imageToSend,
    setImageToSend,
    handleSend,
    isSendingMessage,
    clearError,
    clearNotifications,
    markActivityNotificationRead,
    markAllActivityNotificationsRead,
    clearActivityNotifications,
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
