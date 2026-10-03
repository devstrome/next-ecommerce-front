'use client'
import React, { useState, useEffect } from "react";
import ChatItem from "../components/ChatItem";
import { BiSearch, BiMessageRoundedDots } from "react-icons/bi";
import { useRouter } from "next/navigation";
import { useAdminChat } from "../context/AdminChatContext";

const ChatList = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();
  const { 
    rooms, 
    loading, 
    error, 
    fetchRooms,
    unreadCount 
  } = useAdminChat();

  useEffect(() => {
    if (rooms.length === 0 && !loading) {
      fetchRooms();
    }
  }, [rooms.length, loading]);

  const filteredRooms = rooms.filter((room) => {
    const customerName = room.guestName || (room.customerId?.firstName
      ? `${room.customerId.firstName} ${room.customerId?.lastName || ''}`
      : room.customerId?.email || '');
    const guestEmail = room.guestEmail || '';
    return customerName.toLowerCase().includes(searchTerm.toLowerCase()) || guestEmail.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const sortedRooms = [...filteredRooms].sort((a, b) => {
    const aTime = new Date(a.messages?.[a.messages.length - 1]?.createdAt || 0).getTime();
    const bTime = new Date(b.messages?.[b.messages.length - 1]?.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const handleRoomClick = (roomId) => router.push(`/admin/dashboard/inbox/${roomId}`);

  return (
    <div className="flex flex-col p-4 min-h-screen bg-[#FAF8F6]">
      <div className="flex-1 border border-[#BDBDBD] flex flex-col bg-white">
        {/* Header */}
        <div className="p-4 border-b border-[#BDBDBD] bg-[#F4F4F4]">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-2 sm:mb-0">
              <div className="w-10 h-10 bg-[#1B1B1B] flex items-center justify-center">
                <BiMessageRoundedDots className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Customer Chats</h2>
                <p className="text-sm text-[#4A4A4A]">
                  {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full px-4 py-2 pl-10 border border-[#BDBDBD] bg-white focus:outline-none focus:ring-2 focus:ring-[#B1123B] focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <BiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A]" />
            </div>
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin h-8 w-8 border-b-2 border-[#B1123B] mx-auto mb-2"></div>
                <p className="text-[#4A4A4A]">Loading chats...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 flex items-center justify-center mx-auto mb-2">
                  <span className="text-red-500 text-xl">!</span>
                </div>
                <p className="text-red-500">{error}</p>
              </div>
            </div>
          )}
          
          {!loading && !error && filteredRooms.length === 0 && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-[#F4F4F4] flex items-center justify-center mx-auto mb-4">
                  <BiMessageRoundedDots className="w-8 h-8 text-[#4A4A4A]" />
                </div>
                <p className="text-[#4A4A4A] text-lg">No chats found</p>
                <p className="text-sm text-[#4A4A4A]">
                  {searchTerm ? 'Try adjusting your search' : 'Start a conversation with customers'}
                </p>
              </div>
            </div>
          )}
          
          {!loading && !error && sortedRooms.length > 0 && (
            <div className="divide-y divide-[#F4F4F4]">
                              {sortedRooms.map((room) => {
                  const unreadCount = (room.messages || []).filter(msg => (
                    (msg.senderType === 'customer' || msg.senderType === 'guest') && !((msg.readBy || []).some(read => read.readerType === 'admin'))
                  )).length;
                  
                  const displayCustomer = room.customerId || {
                    _id: room.guestId,
                    firstName: room.guestName || '',
                    lastName: '',
                    email: room.guestEmail || '',
                    imageUrl: ''
                  };
                  return (
                    <ChatItem
                      key={room._id}
                      customer={displayCustomer}
                      lastMessage={room.messages?.[room.messages.length - 1]}
                      isActive={!!room.assignedAdmin?._id}
                      unreadCount={unreadCount}
                      isGuest={!room.customerId}
                      isClosed={room.isClosed}
                      assignedAdmin={room.assignedAdmin}
                      onClick={() => handleRoomClick(room._id)}
                    />
                  );
               })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatList;
