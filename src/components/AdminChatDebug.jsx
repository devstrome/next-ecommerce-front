'use client'
import React from 'react';
import { useAdminChat } from '../context/AdminChatContext';

const AdminChatDebug = () => {
  const { 
    rooms, 
    activeRoom, 
    messages, 
    loading, 
    error, 
    isConnected, 
    unreadCount, 
    newMessageNotifications, 
    showNotification 
  } = useAdminChat();

  return (
    <div className="p-4 bg-maybelline-light rounded-lg border-2 border-maybelline-pink">
      <h3 className="text-lg font-bold mb-2">Admin Chat Debug Panel</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>Socket Connected:</strong> {isConnected ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Loading:</strong> {loading ? "🔄 Yes" : "✅ No"}
        </div>
        <div>
          <strong>Error:</strong> {error || "None"}
        </div>
        <div>
          <strong>Rooms Count:</strong> {rooms.length}
        </div>
        <div>
          <strong>Active Room:</strong> {activeRoom?._id || "None"}
        </div>
        <div>
          <strong>Messages in Active Room:</strong> {messages.length}
        </div>
        <div>
          <strong>Unread Count:</strong> {unreadCount}
        </div>
        <div>
          <strong>Show Notification:</strong> {showNotification ? "✅ Yes" : "❌ No"}
        </div>
        <div>
          <strong>Notification Count:</strong> {newMessageNotifications.length}
        </div>
      </div>

      {rooms.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Rooms:</h4>
          <div className="space-y-1 text-xs">
                         {rooms.slice(0, 3).map((room) => (
               <div key={room._id}>
                 <strong>
                   {room.customerId?.firstName && room.customerId?.lastName
                     ? `${room.customerId.firstName} ${room.customerId.lastName}`
                     : room.customerId?.email || 'Unknown'}
                 </strong> - 
                 Messages: {room.messages?.length || 0} - 
                 Unread: {room.messages?.filter(msg => 
                   msg.senderType === 'customer' && !msg.readBy?.includes('admin')
                 ).length || 0}
               </div>
             ))}
            {rooms.length > 3 && <div>... and {rooms.length - 3} more</div>}
          </div>
        </div>
      )}

      {newMessageNotifications.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Recent Notifications:</h4>
          <div className="space-y-1 text-xs">
            {newMessageNotifications.slice(0, 3).map((notification) => (
              <div key={notification.id}>
                <strong>{notification.sender}</strong>: {notification.message.substring(0, 30)}...
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChatDebug;
