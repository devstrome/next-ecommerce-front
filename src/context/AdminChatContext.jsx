'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { notificationFeedStorage, showBrowserNotification as showNativeBrowserNotification } from '../lib/browserNotifications';

const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";
const AdminChatContext = createContext();

export const useAdminChat = () => {
  const context = useContext(AdminChatContext);
  if (!context) {
    throw new Error("useAdminChat must be used within an AdminChatProvider");
  }
  return context;
};

export const AdminChatProvider = ({ children }) => {
  const [rooms, setRooms] = useState([]);
  const roomsRef = React.useRef(rooms);
  roomsRef.current = rooms;
  const [activeRoom, setActiveRoom] = useState(null);
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState("");
const [imageToSend, setImageToSend] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const socketRef = React.useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Admin state - get from localStorage or context
  const [admin, setAdmin] = useState(() => {
    const adminData = getStorage('adminData');
    return adminData ? JSON.parse(adminData) : null;
  });
  
  // Notification states
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessageNotifications, setNewMessageNotifications] = useState([]);
  const [activityNotifications, setActivityNotifications] = useState([]);
  const activityNotificationsRef = React.useRef(activityNotifications);
  activityNotificationsRef.current = activityNotifications;
  const notificationFeedKeyRef = React.useRef(null);
  const notificationFeedKey = admin?._id ? `belorella:notification-feed:admin:${admin._id}` : null;
  const [showNotification, setShowNotification] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  // Ref to avoid stale activeRoom in socket handlers
  const activeRoomIdRef = React.useRef(null);
  const sendInFlightRef = React.useRef(false);
  useEffect(() => {
    activeRoomIdRef.current = activeRoom?._id || activeRoomId || null;
  }, [activeRoom?._id, activeRoomId]);

  // Mirror latest admin id + fetchRoom for one-time socket listeners
  const adminIdRef = React.useRef(null);
  adminIdRef.current = admin?._id || null;
  const fetchRoomRef = React.useRef(null);

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

  const addActivityNotificationRef = React.useRef(addActivityNotification);
  addActivityNotificationRef.current = addActivityNotification;

  // Helper function to get admin token
  const getAdminToken = () => {
    // Try different possible token keys in order of preference
    const token = getStorage("adminAccessToken") || 
                  getStorage("adminToken");
    
    if (!token) {
      return null;
    }
    
    return token;
  };

  // Helper function to show notification
  const showMessageNotification = (message) => {
    const room = roomsRef.current.find((item) => String(item._id) === String(message.roomId));
    const customer = room?.customerId || {};
    const sender = message.senderName || customer.fullName || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Customer';
    const notification = {
      id: Date.now(),
      message: message.text || (message.image ? 'Sent an image' : 'Sent a message'),
      roomId: message.roomId,
      sender,
      timestamp: new Date().toLocaleTimeString()
    };
    
    setNewMessageNotifications(prev => [notification, ...prev.slice(0, 4)]); // Keep last 5 notifications
    setShowNotification(true);
    
    // Auto-hide notification after 5 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 5000);
  };

  // Helper function to show browser notification
  const showBrowserNotification = (message) => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      const room = roomsRef.current.find(r => String(r._id) === String(message.roomId));
      const customer = room?.customerId || {};
      const customerName = message.senderName || customer.fullName || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Customer';
      const title = `💬 New message from ${customerName}`;
      const messagePreview = typeof message.text === 'string' && message.text.trim()
        ? message.text.trim()
        : message.image ? 'Sent an image' : 'Sent a message';
      const senderDetails = [customer.email, customer.phone || customer.phoneNumber].filter(Boolean).join(' · ');
      showNativeBrowserNotification({
        title,
        body: message.notificationBody || [messagePreview, senderDetails].filter(Boolean).join('\n'),
        image: message.image || undefined,
        url: `/admin/dashboard/inbox/${message.roomId}`,
        tag: `admin-chat-${message._id || message.roomId}`,
        data: { roomId: message.roomId, messageId: message._id, senderName: customerName },
      });
    }
  };
  const showBrowserNotificationRef = React.useRef(showBrowserNotification);
  showBrowserNotificationRef.current = showBrowserNotification;

  // Helper function to calculate unread count
  const calculateUnreadCount = (roomsList) => {
    const count = roomsList.reduce((total, room) => {
      const unreadMessages = room.messages?.filter(msg => 
        (msg.senderType === 'customer' || msg.senderType === 'guest') && !msg.readBy?.some(read => read.readerType === 'admin')
      ) || [];
      return total + unreadMessages.length;
    }, 0);
    return count;
  };

  // --- Auto-assign admin to unassigned room ---
  const autoAssignAdmin = async () => {
    try {
      const token = getAdminToken();
      if (!token) {
        setError("No admin token found");
        return;
      }

      const response = await axios.post(
        `${API_URI}/api/rooms/auto-assign`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.room) {
        // Update rooms list with the newly assigned room
        setRooms(prevRooms => {
          const existingRoomIndex = prevRooms.findIndex(r => r._id === response.data.room._id);
          if (existingRoomIndex >= 0) {
            const updatedRooms = [...prevRooms];
            updatedRooms[existingRoomIndex] = response.data.room;
            return updatedRooms;
          } else {
            return [response.data.room, ...prevRooms];
          }
        });

        // If this is the active room, update it
        if (activeRoom?._id === response.data.room._id) {
          setActiveRoom(response.data.room);
          setMessages(response.data.room.messages || []);
        }

        return response.data.room;
      }
    } catch (err) {
      console.error("Error auto-assigning admin:", err);
      setError(err.response?.data?.message || "Failed to auto-assign admin");
    }
  };

  // --- Fetch all chat rooms ---
  const fetchRooms = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = getAdminToken();
      if (!token) {
        setError("No admin token found. Please login as admin.");
        return;
      }
      
      const response = await axios.get(`${API_URI}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Ensure rooms have proper message structure
      const cleanRooms = response.data.map(room => ({
        ...room,
        messages: (room.messages || []).map(msg => ({
          _id: msg._id || `msg_${Date.now()}_${Math.random()}`,
          senderId: msg.senderId,
          senderType: msg.senderType,
          text: msg.text,
          image: msg.image || '',
          reaction: msg.reaction || "",
          reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
          readBy: msg.readBy || [],
          createdAt: msg.createdAt || new Date()
        }))
      }));
      
      setRooms(cleanRooms);
      setUnreadCount(calculateUnreadCount(cleanRooms));
      setError(null);
    } catch (err) {
      console.error("Error fetching rooms:", err);
      if (err.response?.status === 401) {
        setError("Authentication failed. Please login as admin.");
        // Clear invalid tokens
        removeStorage("adminAccessToken");
        removeStorage("adminToken");
        removeStorage("adminRefreshToken");
        removeStorage("accessToken");
        // Redirect to admin login
        window.location.href = "/admin/login";
      } else {
        setError(err.response?.data?.message || "Failed to fetch chats");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Fetch specific room ---
  const fetchRoom = React.useCallback(async (roomId) => {
    try {
      setLoading(true);
      const token = getAdminToken();
      if (!token) {
        setError("No admin token found");
        return;
      }

      const response = await axios.get(`${API_URI}/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setActiveRoom(response.data);
      
      // Ensure messages have proper structure
      const cleanMessages = (response.data.messages || []).map(msg => ({
        _id: msg._id || `msg_${Date.now()}_${Math.random()}`,
        senderId: msg.senderId,
        senderType: msg.senderType,
        text: msg.text,
        image: msg.image || '',
        reaction: msg.reaction || "",
        reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
        readBy: msg.readBy || [],
        createdAt: msg.createdAt || new Date()
      }));
      
      setMessages(cleanMessages);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load chat room");
    } finally {
      setLoading(false);
    }
  }, []);

  // Keep latest fetchRoom available to one-time socket listeners (reconnect resync)
  fetchRoomRef.current = fetchRoom;

  // --- Send message ---
  const handleSend = React.useCallback(async () => {
    const trimmed = inputMessage.trim();
    const image = imageToSend;
    if ((!trimmed && !image) || !activeRoom?._id || !socket?.connected || !admin?._id || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    
    try {
      setError(null);
      
      // Send message via socket first for immediate feedback
      if (socket.connected) {
        const tempId = `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const tempMessage = {
          _id: tempId,
          senderId: admin._id,
          senderType: "admin",
          text: trimmed,
          image,
          reaction: "",
          readBy: [],
          reactions: [],
          createdAt: new Date()
        };
        
        // Add message to UI immediately for better UX
        setMessages(prev => [...prev, tempMessage]);
        
        // Emit via socket with tempId so backend can echo it back
        socket.emit("sendMessage", { 
          roomId: activeRoom._id, 
          senderId: admin._id, 
          senderType: "admin", 
          text: trimmed,
          image,
          tempId
        });
      }
      
      setInputMessage("");
      setImageToSend("");
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err.response?.data?.message || "Failed to send message");
    } finally {
      sendInFlightRef.current = false;
    }
  }, [inputMessage, imageToSend, activeRoom?._id, socket, admin?._id]);

  // --- Transfer room ---
  const transferRoom = async (roomId, newAdminId) => {
    try {
      const token = getAdminToken();
      if (!token) {
        setError("No admin token found");
        return;
      }

      const response = await axios.post(
        `${API_URI}/api/rooms/${roomId}/transfer`,
        { newAdminId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActiveRoom(response.data);
      
      // Emit via socket
      if (socket) {
        socket.emit("roomTransferred", response.data);
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || "Failed to transfer room");
      throw err;
    }
  };

  // --- Close room ---
  const closeRoom = async (roomId) => {
    try {
      const token = getAdminToken();
      if (!token) {
        setError("No admin token found");
        return;
      }

      await axios.post(
        `${API_URI}/api/rooms/${roomId}/close`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setActiveRoom((prev) => ({ ...prev, isClosed: true }));
      
      // Emit via socket
      if (socket) {
        socket.emit("roomClosed", { roomId });
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to close room");
      throw err;
    }
  };

  // --- Setup Socket.IO ---
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("No admin token found. Please login as admin.");
      return;
    }

    // Prevent duplicate socket connections without closing over React state.
    if (socketRef.current?.connected) {
      return;
    }

    const socketClient = io(API_URI, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000
    });

    socketClient.on("connect", () => {
      setIsConnected(true);
      socketClient.emit("joinAdminRoom");
      socketClient.emit("getOnlineUsers");
      setError(null);
      // Rejoin + resync the active chat room after a reconnect
      const rid = activeRoomIdRef.current;
      if (rid) {
        socketClient.emit("joinChatRoom", { roomId: rid, userType: "admin" });
        fetchRoomRef.current?.(rid);
      }
    });

    socketClient.on("connect_error", () => {
      setIsConnected(false);
    });

    socketClient.on("disconnect", () => {
      setIsConnected(false);
      setOnlineUsers([]);
    });
    socketRef.current = socketClient;

    // Listen for new chat rooms
    socketClient.on("newChatRoom", (room) => {
      setRooms((prevRooms) => {
        const updatedRooms = [room, ...prevRooms];
        setUnreadCount(calculateUnreadCount(updatedRooms));
        return updatedRooms;
      });
      
      const customer = room?.customerId || {};
      const customerName = customer.fullName || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || 'Customer';
      addActivityNotificationRef.current?.({
        id: `chat-room:${room._id}`,
        kind: 'message',
        title: `New chat from ${customerName}`,
        body: `${customer.email || 'Customer'} started a conversation. Open the inbox to reply.`,
        url: `/admin/dashboard/inbox/${room._id}`,
        createdAt: room.createdAt || new Date().toISOString(),
      });
      showNativeBrowserNotification({
        title: `New chat from ${customerName}`,
        body: `${customer.email || 'Customer'} started a conversation.`,
        url: `/admin/dashboard/inbox/${room._id}`,
        tag: `admin-chat-room-${room._id}`,
        data: { roomId: room._id, type: 'new-chat', senderName: customerName },
      });
    });

    socketClient.on('admin:orderNotification', (orderEvent) => {
      if (!orderEvent?.orderId) return;
      const eventType = orderEvent.eventType || 'update';
      const status = orderEvent.orderStatus ? ` · ${orderEvent.orderStatus}` : '';
      const title = eventType === 'create'
        ? `New order #${orderEvent.orderId}`
        : `Order #${orderEvent.orderId}${status}`;
      const itemLines = (orderEvent.items || []).slice(0, 3).map((item) =>
        `${item.name || 'Product'} ×${Number(item.quantity) || 1}${[item.variantName, item.color, item.size, item.regionName].filter(Boolean).length ? ` · ${[item.variantName, item.color, item.size, item.regionName].filter(Boolean).join(' / ')}` : ''}`
      );
      const customerDetails = [orderEvent.customerName, orderEvent.customerPhone, orderEvent.shippingAddress].filter(Boolean).join(' · ');
      const amount = Number(orderEvent.grandTotal ?? orderEvent.totalAmount);
      const money = Number.isFinite(amount) ? `BDT ${amount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
      const payment = [orderEvent.paymentMethod, orderEvent.paymentStatus].filter(Boolean).join(' · ');
      const summary = [customerDetails, itemLines.join(', '), (orderEvent.items?.length || 0) > 3 ? `+${orderEvent.items.length - 3} more item(s)` : '', money, payment].filter(Boolean).join('\n');
      const stableId = `order:${orderEvent.orderId}:${eventType}:${orderEvent.updatedAt || orderEvent.createdAt || Date.now()}`;
      addActivityNotificationRef.current?.({
        id: stableId,
        kind: 'order',
        title,
        body: summary || 'Open the order page to review the order details.',
        image: orderEvent.firstItemImage || orderEvent.items?.[0]?.image || '',
        url: `/admin/dashboard/orders?order=${encodeURIComponent(orderEvent.orderId)}`,
        createdAt: orderEvent.updatedAt || orderEvent.createdAt || new Date().toISOString(),
        details: orderEvent,
      });
      showNativeBrowserNotification({
        title,
        body: summary || 'Open the order page to review the order details.',
        image: orderEvent.firstItemImage || orderEvent.items?.[0]?.image || undefined,
        url: `/admin/dashboard/orders?order=${encodeURIComponent(orderEvent.orderId)}`,
        tag: stableId,
        data: { orderId: orderEvent.orderId, eventType, customerName: orderEvent.customerName },
      });
    });

    // Listen for updates to messages in rooms
    socketClient.on("messageReceived", (message) => {
      
      // Ensure message has proper structure with unique _id
      const cleanMessage = {
        _id: message._id || `temp_${Date.now()}_${Math.random()}`,
        senderId: message.senderId,
        senderType: message.senderType || 'customer',
        senderName: message.senderName || '',
        text: message.text,
        image: message.image || '',
        reaction: message.reaction || "",
        reactions: Array.isArray(message.reactions) ? message.reactions : [],
        readBy: Array.isArray(message.readBy) ? message.readBy : [],
        createdAt: message.createdAt || new Date()
      };
      
      // Update rooms list (for chat list)
      setRooms(prev => {
        const roomExists = prev.find(room => room._id === message.roomId);
        if (!roomExists) {
          return prev;
        }
        
        // Check if message already exists in this room
        const messageExists = roomExists.messages.some(msg => 
          msg._id === message._id || 
          (msg.senderId === message.senderId && 
           msg.text === message.text && 
           Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
        );
        
        if (messageExists) {
          return prev;
        }
        
        const updatedRooms = prev.map(room => 
          room._id === message.roomId 
            ? { ...room, messages: [...room.messages, cleanMessage] }
            : room
        );
        // Recalculate unread count after new message
        setUnreadCount(calculateUnreadCount(updatedRooms));
        return updatedRooms;
      });
      
      // Update active room messages (for message page) - PRIORITY
      if (activeRoomIdRef.current === message.roomId) {
        setMessages(prev => {
          // Check if message already exists in active room
          const messageExists = prev.some(msg => 
            msg._id === message._id || 
            (msg.senderId === message.senderId && 
             msg.text === message.text && 
             Math.abs(new Date(msg.createdAt) - new Date(message.createdAt)) < 1000)
          );
          
          if (messageExists) {
            return prev;
          }
          
          return [...prev, cleanMessage];
        });

        // Mark read instantly so the customer's read receipt updates immediately
        if (message.senderType !== 'admin' && adminIdRef.current) {
          socketClient.emit("markMessagesAsRead", {
            roomId: message.roomId,
            readerType: "admin",
            readerId: adminIdRef.current
          });
        }
      }
      
      // Show notification for customer messages, always
      if (message.senderType !== 'admin') {
        const room = roomsRef.current.find((item) => String(item._id) === String(message.roomId));
        const customer = room?.customerId || {};
        const senderName = message.senderName || customer.fullName || [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.email || (message.senderType === 'guest' ? 'Guest' : 'Customer');
        const preview = typeof message.text === 'string' && message.text.trim()
          ? message.text.trim()
          : message.image ? 'Sent an image' : 'Sent a message';
        const senderDetails = [customer.email, customer.phone || customer.phoneNumber].filter(Boolean).join(' · ');
        const notificationBody = [preview, senderDetails].filter(Boolean).join('\n');
        addActivityNotificationRef.current?.({
          id: `chat-message:${message._id || `${message.roomId}:${message.createdAt || Date.now()}`}`,
          kind: 'message',
          title: `Message from ${senderName}`,
          body: notificationBody,
          image: message.image || '',
          url: `/admin/dashboard/inbox/${message.roomId}`,
          createdAt: message.createdAt || new Date().toISOString(),
          details: { roomId: message.roomId, messageId: message._id, senderName },
        });
        showMessageNotification(message);
        showBrowserNotificationRef.current?.({ ...message, notificationBody });
      }
    });

    // Handle message confirmation (replace temp messages with real ones)
    socketClient.on("messageConfirmed", (data) => {
      
      // Update rooms list
      setRooms(prev => prev.map(room => ({
        ...room,
        messages: room.messages.map(msg => 
          msg._id === data.tempId 
            ? { ...msg, _id: data.realId, ...data.updates }
            : msg
        )
      })));
      
      // Update active room messages
      setMessages(prev => prev.map(msg => 
        msg._id === data.tempId 
          ? { ...msg, _id: data.realId, ...data.updates }
          : msg
      ));
    });

    // Handle room updates silently via socket
    socketClient.on("roomUpdated", (data) => {
      setRooms(prev => prev.map(room => 
        room._id === data.roomId 
          ? { ...room, ...data.updates }
          : room
      ));
      
      if (activeRoomIdRef.current === data.roomId) {
        setActiveRoom(prev => prev ? ({ ...prev, ...data.updates }) : prev);
      }
    });

    // Handle message status updates silently via socket
    socketClient.on("messageStatusUpdated", (data) => {
      
      // Update rooms list
      setRooms(prev => {
        const updated = prev.map(room => ({
          ...room,
          messages: room.messages.map(msg => 
            msg._id === data.messageId 
              ? { ...msg, ...data.updates }
              : msg
          )
        }));
        setUnreadCount(calculateUnreadCount(updated));
        return updated;
      });
      
      // Update active room messages
      setMessages(prev => prev.map(msg => 
        msg._id === data.messageId 
          ? { ...msg, ...data.updates }
          : msg
      ));
    });

    socketClient.on("roomTransferred", (room) => {
      setActiveRoom(room);
    });

    socketClient.on("roomClosed", (data) => {
      setActiveRoom((prev) => ({ ...prev, isClosed: true }));
    });

    socketClient.on("roomAssigned", (data) => {
      // Update the room in the rooms list
      setRooms(prevRooms => 
        prevRooms.map(room => 
          room._id === data.roomId 
            ? { ...room, assignedAdmin: { _id: data.adminId, firstName: data.adminName } }
            : room
        )
      );
      
      // If this is the active room, update it
      if (activeRoomIdRef.current === data.roomId) {
        setActiveRoom(prev => prev ? ({
          ...prev,
          assignedAdmin: { _id: data.adminId, firstName: data.adminName }
        }) : prev);
      }
    });

    // Handle read status updates via socket
    socketClient.on("readStatusUpdated", (data) => {
      
      // Update rooms list with read status
      setRooms(prev => {
        const updated = prev.map(room => {
          if (room._id !== data.roomId) return room;
          return {
            ...room,
            lastReadAt: data.readAt,
            messages: (room.messages || []).map(msg => {
              if (msg.senderType !== 'admin') return msg;
              const alreadyRead = (msg.readBy || []).some(r => r.readerType === data.readerType);
              if (alreadyRead) return msg;
              return {
                ...msg,
                readBy: [
                  ...(Array.isArray(msg.readBy) ? msg.readBy : []),
                  { readerType: data.readerType, readerId: data.readerId, readAt: data.readAt }
                ]
              };
            })
          };
        });
        setUnreadCount(calculateUnreadCount(updated));
        return updated;
      });
      
      // Update active room messages if it's the current room
      if (activeRoomIdRef.current === data.roomId) {
        setMessages(prev => prev.map(msg => {
          if (msg.senderType !== 'admin') return msg;
          const alreadyRead = (msg.readBy || []).some(r => r.readerType === data.readerType);
          if (alreadyRead) return msg;
          return {
            ...msg,
            readBy: [
              ...(Array.isArray(msg.readBy) ? msg.readBy : []),
              { readerType: data.readerType, readerId: data.readerId, readAt: data.readAt }
            ]
          };
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

    socketClient.on("messageUpdated", (data) => {
      const { messageId, updates } = data;
      const patch = {};
      if (updates) {
        Object.assign(patch, updates);
      } else {
        if (Array.isArray(data.reactions)) patch.reactions = data.reactions;
        if (data.reaction !== undefined) patch.reaction = data.reaction;
        if (data.image !== undefined) patch.image = data.image;
        if (data.text !== undefined) patch.text = data.text;
      }
      setRooms(prev => prev.map(room => ({
        ...room,
        messages: room.messages.map(msg =>
          msg._id === messageId ? { ...msg, ...patch } : msg
        )
      })));
      setMessages(prev => prev.map(msg =>
        msg._id === messageId ? { ...msg, ...patch } : msg
      ));
    });

    socketClient.on("onlineUsersList", (data) => {
      setOnlineUsers(Array.from(new Set((data?.onlineUsers || []).map(String))));
    });

    socketClient.on("userOnlineStatus", (data) => {
      if (!data?.userId) return;
      const userId = String(data.userId);
      setOnlineUsers(prev => {
        if (data.isOnline) return prev.includes(userId) ? prev : [...prev, userId];
        return prev.filter(id => id !== userId);
      });
    });

    socketClient.on("userTyping", (data) => {
      // Handle typing indicator from customer (or guest)
      if ((data.senderType === "customer" || data.senderType === "guest") && data.isTyping) {
        setIsTyping(true);
      } else if ((data.senderType === "customer" || data.senderType === "guest") && !data.isTyping) {
        setIsTyping(false);
      }
    });

    // Handle typing indicators
    socketClient.on("typingStart", (data) => {
      setIsTyping(true);
    });

    socketClient.on("typingStop", (data) => {
      setIsTyping(false);
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
      if (socketRef.current === socketClient) socketRef.current = null;
    };
  }, [admin?._id]);

  // --- Initial fetch rooms ---
  useEffect(() => {
    if (isConnected && rooms.length === 0) {
      fetchRooms();
    }
  }, [isConnected, rooms.length, fetchRooms]); // Only fetch if connected and no rooms loaded

  // --- Join room ---
  const joinRoom = React.useCallback(async (roomId) => {
    if (!roomId || !socket) return;
    
    try {
      setActiveRoomId(roomId);
      
      // Join chat room via socket
      socket.emit("joinChatRoom", { 
        roomId, 
        userType: "admin" 
      });
      
      // Mark messages as read via socket
      socket.emit("markMessagesAsRead", {
        roomId,
        readerType: "admin",
        readerId: admin._id
      });
      
      // Update online status via socket
      socket.emit("updateOnlineStatus", {
        roomId,
        userId: admin._id,
        isOnline: true
      });

      // Optimistic UI: mark all customer messages as read locally immediately
      setMessages(prev => prev.map(msg => {
        if (['customer', 'guest'].includes(msg.senderType) && !(msg.readBy || []).some(r => r.readerType === 'admin')) {
          return {
            ...msg,
            readBy: [
              ...(Array.isArray(msg.readBy) ? msg.readBy : []),
              { readerType: 'admin', readerId: admin._id, readAt: new Date().toISOString() }
            ]
          };
        }
        return msg;
      }));

      setRooms(prev => prev.map(r => {
        if (r._id !== roomId) return r;
        return {
          ...r,
          messages: (r.messages || []).map(msg => {
            if (['customer', 'guest'].includes(msg.senderType) && !(msg.readBy || []).some(r => r.readerType === 'admin')) {
              return {
                ...msg,
                readBy: [
                  ...(Array.isArray(msg.readBy) ? msg.readBy : []),
                  { readerType: 'admin', readerId: admin._id, readAt: new Date().toISOString() }
                ]
              };
            }
            return msg;
          })
        };
      }));

      // Recalculate unread count immediately
      setUnreadCount(prev => calculateUnreadCount(
        (Array.isArray(roomsRef.current) ? roomsRef.current : []).map(r => r._id === roomId ? {
          ...r,
          messages: (r.messages || []).map(msg => (
            ['customer', 'guest'].includes(msg.senderType) && !(msg.readBy || []).some(rd => rd.readerType === 'admin')
              ? { ...msg, readBy: [...(msg.readBy || []), { readerType: 'admin', readerId: admin._id, readAt: new Date().toISOString() }] }
              : msg
          ))
        } : r)
      ));
      
    } catch (err) {
      console.error("Error joining room:", err);
      setError("Failed to join room");
    }
  }, [socket, admin?._id]);

  // --- Clear error ---
  const clearError = () => setError(null);

  // --- Clear notifications ---
  const clearNotifications = () => {
    setNewMessageNotifications([]);
    setShowNotification(false);
  };

  // --- Mark room as read ---
  const markRoomAsRead = async (roomId) => {
    try {
      const token = getAdminToken();
      if (!token) return;

      await axios.post(`${API_URI}/api/rooms/${roomId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setRooms(prevRooms => {
        const updatedRooms = prevRooms.map(room =>
          room._id === roomId
            ? {
                ...room,
                messages: (room.messages || []).map(msg => {
                  if (!['customer', 'guest'].includes(msg.senderType) || msg.readBy?.some(read => read.readerType === 'admin')) return msg;
                  return {
                    ...msg,
                    readBy: [...(Array.isArray(msg.readBy) ? msg.readBy : []), {
                      readerType: 'admin', readerId: admin?._id, readAt: new Date().toISOString()
                    }]
                  };
                })
              }
            : room
        );
        const newCount = calculateUnreadCount(updatedRooms);
        setUnreadCount(newCount);
        return updatedRooms;
      });
    } catch (err) {
      console.error("Error marking room as read:", err);
    }
  };

  // --- Mark messages as read ---
  const markAsRead = React.useCallback(async () => {
    if (!activeRoom?._id) return;
    
    try {
      // Mark messages as read via socket instead of API
      if (socket) {
        socket.emit("markMessagesAsRead", {
          roomId: activeRoom._id,
          readerType: "admin",
          readerId: admin._id
        });
      }
    } catch (err) {
      console.error("Error marking messages as read:", err);
    }
  }, [activeRoom?._id, socket, admin?._id]);

  // --- Update online status ---
  const updateOnlineStatus = React.useCallback(async (status) => {
    if (!activeRoom?._id) return;
    
    try {
      // Update online status via socket
      if (socket) {
        socket.emit("updateOnlineStatus", {
          roomId: activeRoom._id,
          userId: admin._id,
          isOnline: status
        });
      }
    } catch (err) {
      console.error("Error updating online status:", err);
    }
  }, [activeRoom?._id, socket, admin?._id]);

  // --- Send typing indicator ---
  const sendTypingIndicator = React.useCallback((isTyping) => {
    if (!activeRoom?._id || !socket) return;
    
    try {
      if (isTyping) {
        socket.emit("typingStart", {
          roomId: activeRoom._id,
          senderId: admin._id,
          senderType: "admin"
        });
      } else {
        socket.emit("typingStop", {
          roomId: activeRoom._id,
          senderId: admin._id,
          senderType: "admin"
        });
      }
    } catch (err) {
      console.error("Error sending typing indicator:", err);
    }
  }, [activeRoom?._id, socket, admin?._id]);

  // --- Set active room ---
  const setActiveRoomAndJoin = React.useCallback((room) => {
    // Prevent setting the same room multiple times
    if (activeRoom?._id === room._id) {
      return;
    }
    setActiveRoom(room);
    setMessages(room.messages || []);
    
    // Join the room via socket only
    if (socket && socket.connected) {
      joinRoom(room._id);
    }
  }, [joinRoom, activeRoom?._id, socket]);

  // --- Add reaction to message ---
  const addReaction = React.useCallback((messageId, emoji) => {
    if (!activeRoom?._id || !socket || !admin?._id) return;
    const uid = String(admin._id);
    const userName = `${admin.firstName || ''} ${admin.lastName || ''}`.trim() || 'Admin';

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
        next = [...current, { emoji, userId: uid, senderType: 'admin', userName, createdAt: new Date().toISOString() }];
      }
      return { ...m, reactions: next, reaction: next.length ? next[0].emoji : '' };
    }));

    socket.emit("addReaction", {
      roomId: activeRoom._id,
      messageId,
      emoji,
      userId: admin._id,
      senderType: 'admin',
      userName
    });
  }, [activeRoom?._id, socket, admin]);

  // --- Edit message ---
  const editMessage = React.useCallback((messageId, newText) => {
    if (!activeRoom?._id || !socket || !admin?._id) return;
    socket.emit("editMessage", {
      roomId: activeRoom._id,
      messageId,
      text: newText,
      senderId: admin._id
    });
  }, [activeRoom?._id, socket, admin]);

  // --- Delete message ---
  const deleteMessage = React.useCallback((messageId) => {
    if (!activeRoom?._id || !socket || !admin?._id) return;
    socket.emit("deleteMessage", {
      roomId: activeRoom._id,
      messageId,
      senderId: admin._id
    });
  }, [activeRoom?._id, socket, admin]);

  // --- Continuous mark-as-read when viewing a room ---
  useEffect(() => {
    if (!activeRoom?._id || !socket || !isConnected || !admin?._id) return;
    const markRead = () => {
      socket.emit("markMessagesAsRead", {
        roomId: activeRoom._id,
        readerType: "admin",
        readerId: admin._id
      });
    };
    markRead();
    const interval = setInterval(markRead, 5000);
    return () => clearInterval(interval);
  }, [activeRoom?._id, socket, isConnected, admin?._id]);

  const value = {
    // State
    rooms,
    activeRoom,
    activeRoomId,
    messages,
    inputMessage,
    isConnected,
    loading,
    error,
    unreadCount,
    newMessageNotifications,
    activityNotifications,
    showNotification,
    onlineUsers,
    isTyping,
    
    // Actions
    fetchRooms,
    fetchRoom,
    handleSend, // Use the new socket-based handleSend
    imageToSend,
    setImageToSend,
    transferRoom,
    closeRoom,
    joinRoom,
    setActiveRoomId,
    setInputMessage,
    setActiveRoomAndJoin, // Add the missing function
    clearError,
    clearNotifications,
    markActivityNotificationRead,
    markAllActivityNotificationsRead,
    clearActivityNotifications,
    autoAssignAdmin,
    markAsRead, // Add the new socket-based markAsRead
    updateOnlineStatus, // Add the new socket-based updateOnlineStatus
    sendTypingIndicator, // Add the new socket-based sendTypingIndicator
    addReaction,
    editMessage,
    deleteMessage,
    
    // Additional data
    socket,
    admin,
  };

  return (
    <AdminChatContext.Provider value={value}>
      {children}
    </AdminChatContext.Provider>
  );
};
