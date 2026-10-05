'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaEnvelope, 
  FaSearch, 
  FaFilter, 
  FaEye, 
  FaTrash, 
  FaEdit,
  FaCheck,
  FaTimes,
  FaDownload,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaBan,
  FaUser,
  FaCalendarAlt,
  FaPhone,
  FaMapMarkerAlt,
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
  FaArrowLeft
} from 'react-icons/fa';
import { useRouter } from "next/navigation";

const AdminContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [selectedContact, setSelectedContact] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [replySubject, setReplySubject] = useState('');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const router = useRouter();

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });

      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/contact/admin/contacts?${params}`, {
        headers: {
          Authorization: `Bearer ${getStorage('adminToken')}`
        }
      });

      setContacts(response.data.contacts);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error('Failed to fetch contacts');
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/contact/admin/stats`, {
        headers: {
          Authorization: `Bearer ${getStorage('adminToken')}`
        }
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchContacts();
    fetchStats();
  }, [pagination.page, filters]);

  const handleStatusUpdate = async (contactId, status, priority, adminNotes) => {
    try {
      const response = await axios.put(
        `${process.env.NEXT_PUBLIC_API_URI}/api/contact/admin/contacts/${contactId}`,
        { status, priority, adminNotes },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminToken')}`
          }
        }
      );

      toast.success('Contact updated successfully');
      fetchContacts();
      fetchStats();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to update contact');
      console.error('Error updating contact:', error);
    }
  };

  const openReplyModal = () => {
    if (!selectedContact) return;
    setReplySubject(`Re: ${selectedContact.subject || 'Your Message'}`);
    setReplyMessage(
      `Hi ${selectedContact.name},\n\n` +
      `Thank you for reaching out. We received your message:\n\n` +
      `"${selectedContact.message}"\n\n` +
      `We will get back to you shortly.\n\n` +
      `Best regards,\n` +
      `BELORELLA Support`
    );
    setShowReplyModal(true);
  };

  const handleSendReply = async () => {
    if (!selectedContact) return;
    if (!replySubject.trim() || !replyMessage.trim()) {
      toast.error('Subject and message are required');
      return;
    }
    setSendingReply(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/api/contact/admin/contacts/${selectedContact._id}/reply`,
        { subject: replySubject.trim(), message: replyMessage.trim() },
        {
          headers: {
            Authorization: `Bearer ${getStorage('adminToken') || getStorage('adminAccessToken')}`
          }
        }
      );
      toast.success(`Reply sent to ${selectedContact.email}`);
      setShowReplyModal(false);
      fetchContacts();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send reply');
      console.error('Error sending reply:', error);
    } finally {
      setSendingReply(false);
    }
  };

  const handleDelete = async (contactId) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return;
    }

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/api/contact/admin/contacts/${contactId}`, {
        headers: {
          Authorization: `Bearer ${getStorage('adminToken')}`
        }
      });

      toast.success('Contact deleted successfully');
      fetchContacts();
      fetchStats();
    } catch (error) {
      toast.error('Failed to delete contact');
      console.error('Error deleting contact:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'text-[#B1123B] bg-[#F7D5DF] border-[#F7D5DF]';
      case 'in-progress':
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
      case 'resolved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'closed':
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
      default:
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'high':
        return 'text-[#B1123B] bg-[#F7D5DF] border-[#F7D5DF]';
      case 'medium':
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-[#4A4A4A] bg-[#F4F4F4] border-[#BDBDBD]';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="text-[#B1123B]" />;
      case 'in-progress':
        return <FaExclamationTriangle className="text-[#4A4A4A]" />;
      case 'resolved':
        return <FaCheckCircle className="text-green-600" />;
      case 'closed':
        return <FaBan className="text-[#4A4A4A]" />;
      default:
        return <FaClock className="text-[#4A4A4A]" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-[#FAF8F6] p-4 sm:p-6">
      <div className="w-full max-w-5xl mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-[#4A4A4A] hover:text-[#1B1B1B] transition min-h-[44px]"
            aria-label="Go Back"
          >
            <FaArrowLeft className="text-2xl" />
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>Contact Messages</h1>
        </div>
        <div className="flex items-center bg-white rounded-md shadow-sm border border-[#F4F4F4] w-full sm:w-auto">
          <FaSearch className="text-[#BDBDBD] ml-2" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="px-4 py-2 w-full sm:w-64 rounded-r-md focus:outline-none bg-white focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
          />
        </div>
      </div>

      <div className="w-full max-w-5xl mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Total Messages</p>
                <p className="text-2xl font-bold text-[#1B1B1B]">{stats.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F4F4F4] rounded-full flex items-center justify-center">
                <FaEnvelope className="text-[#B1123B] text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Today's Messages</p>
                <p className="text-2xl font-bold text-[#1B1B1B]">{stats.today || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F4F4F4] rounded-full flex items-center justify-center">
                <FaCalendarAlt className="text-[#B1123B] text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Pending</p>
                <p className="text-2xl font-bold text-[#B1123B]">{stats.byStatus?.pending || 0}</p>
              </div>
              <div className="w-12 h-12 bg-[#F7D5DF] rounded-full flex items-center justify-center">
                <FaClock className="text-[#B1123B] text-xl" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#4A4A4A]">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.byStatus?.resolved || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                <FaCheckCircle className="text-green-600 text-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl mb-8">
        <div className="bg-white border border-[#F4F4F4] rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-[#1B1B1B]">
            <FaFilter className="mr-2 text-[#B1123B]" />
            Filter Contacts
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-4 py-2 border border-[#BDBDBD] bg-white rounded focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B]"
              >
                <option value="">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({ status: '', priority: '', search: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="w-full px-4 py-2 bg-[#F4F4F4] text-[#4A4A4A] rounded hover:bg-[#BDBDBD] transition-colors duration-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-5xl">
        <div className="bg-white border border-[#F4F4F4] rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#B1123B] mx-auto mb-4"></div>
              <p className="text-[#4A4A4A]">Loading contacts...</p>
            </div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center">
              <FaEnvelope className="text-[#BDBDBD] text-4xl mx-auto mb-4" />
              <p className="text-[#4A4A4A]">No contacts found</p>
            </div>
          ) : (
            <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr className="bg-[#F4F4F4]">
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Contact</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Subject</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Status</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Priority</th>
                    <th className="py-3 px-4 border-b text-left font-semibold text-[#1B1B1B]">Date</th>
                    <th className="py-3 px-4 border-b text-center font-semibold text-[#1B1B1B]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr key={contact._id} className="hover:bg-[#FAF8F6] border-b border-[#F4F4F4]">
                      <td className="py-3 px-4 font-medium text-[#1B1B1B]">
                        <div>
                          <div className="font-semibold">{contact.name}</div>
                          <div className="text-sm text-[#4A4A4A]">{contact.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#4A4A4A] max-w-xs truncate">{contact.subject}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
                          {getStatusIcon(contact.status)}
                          <span className="ml-1">{contact.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(contact.priority)}`}>
                          {contact.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#4A4A4A]">{new Date(contact.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedContact(contact);
                              setShowModal(true);
                            }}
                            className="flex items-center bg-[#1B1B1B] text-white px-3 py-1 rounded text-sm hover:bg-[#4A4A4A] transition min-h-[44px]"
                          >
                            <FaEye className="mr-1" /> View
                          </button>
                          <button
                            onClick={() => handleDelete(contact._id)}
                            className="flex items-center bg-[#B1123B] text-white px-3 py-1 rounded text-sm hover:bg-[#1B1B1B] transition min-h-[44px]"
                          >
                            <FaTrash className="mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-4">
              {contacts.map((contact) => (
                <div key={contact._id} className="bg-white border border-[#F4F4F4] p-4">
                  <div className="mb-2">
                    <div className="font-semibold text-[#1B1B1B]">{contact.name}</div>
                    <div className="text-sm text-[#4A4A4A]">{contact.email}</div>
                  </div>
                  <div className="text-sm text-[#4A4A4A] mb-3 truncate">{contact.subject}</div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(contact.status)}`}>
                      {getStatusIcon(contact.status)}
                      <span className="ml-1">{contact.status}</span>
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(contact.priority)}`}>
                      {contact.priority}
                    </span>
                    <span className="text-xs text-[#4A4A4A]">{new Date(contact.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedContact(contact);
                        setShowModal(true);
                      }}
                      className="flex items-center bg-[#1B1B1B] text-white px-3 py-2 rounded text-sm hover:bg-[#4A4A4A] transition min-h-[44px] min-w-[44px]"
                    >
                      <FaEye className="mr-1" /> View
                    </button>
                    <button
                      onClick={() => handleDelete(contact._id)}
                      className="flex items-center bg-[#B1123B] text-white px-3 py-2 rounded text-sm hover:bg-[#1B1B1B] transition min-h-[44px] min-w-[44px]"
                    >
                      <FaTrash className="mr-1" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}

          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-[#F4F4F4]">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[#4A4A4A]">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border border-[#BDBDBD] rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] text-[#1B1B1B]"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border border-[#BDBDBD] rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#F4F4F4] text-[#1B1B1B]"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F4F4F4]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1B1B1B]">Contact Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[#BDBDBD] hover:text-[#4A4A4A]"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Name</label>
                  <p className="text-[#1B1B1B]">{selectedContact.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Email</label>
                  <p className="text-[#1B1B1B]">{selectedContact.email}</p>
                  <button
                    type="button"
                    onClick={openReplyModal}
                    className="mt-2 inline-flex items-center gap-1.5 text-sm text-[#B1123B] hover:text-[#1B1B1B] font-medium transition-colors"
                  >
                    <FaEnvelope className="text-sm" /> Send Email
                  </button>
                  {Array.isArray(selectedContact.replies) && selectedContact.replies.length > 0 && (
                    <p className="mt-1 text-xs text-[#4A4A4A]">{selectedContact.replies.length} repl{selectedContact.replies.length === 1 ? 'y' : 'ies'} sent</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Subject</label>
                  <p className="text-[#1B1B1B]">{selectedContact.subject}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Date</label>
                  <p className="text-[#1B1B1B]">{new Date(selectedContact.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Message</label>
                <div className="bg-[#F4F4F4] rounded-lg p-4">
                  <p className="text-[#1B1B1B] whitespace-pre-wrap">{selectedContact.message}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Status</label>
                  <select
                    id="status"
                    className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B] bg-white"
                    defaultValue={selectedContact.status}
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Priority</label>
                  <select
                    id="priority"
                    className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B] bg-white"
                    defaultValue={selectedContact.priority}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-2">Admin Notes</label>
                <textarea
                  id="adminNotes"
                  rows={3}
                  className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B] bg-white"
                  placeholder="Add notes about this contact..."
                  defaultValue={selectedContact.adminNotes || ''}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-[#F4F4F4]">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] rounded-lg hover:bg-[#BDBDBD] transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const status = document.getElementById('status').value;
                    const priority = document.getElementById('priority').value;
                    const adminNotes = document.getElementById('adminNotes').value;
                    handleStatusUpdate(selectedContact._id, status, priority, adminNotes);
                  }}
                  className="px-4 py-2 bg-[#B1123B] text-white rounded-lg hover:bg-[#1B1B1B] transition-colors duration-200"
                >
                  Update Contact
                </button>
              </div>
            </div>
          </div>
            </div>
          )}

      {showReplyModal && selectedContact && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#F4F4F4]">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[#1B1B1B]">Send Email</h2>
                <button
                  onClick={() => setShowReplyModal(false)}
                  disabled={sendingReply}
                  className="text-[#BDBDBD] hover:text-[#4A4A4A]"
                >
                  <FaTimes />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">To</label>
                <input
                  type="email"
                  readOnly
                  value={selectedContact.email}
                  className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg bg-[#F4F4F4] text-[#1B1B1B] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Subject</label>
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  maxLength={200}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B] bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Message</label>
                <textarea
                  rows={10}
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Write your reply..."
                  className="w-full px-3 py-2 border border-[#BDBDBD] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#B1123B] text-[#1B1B1B] bg-white"
                />
              </div>
              <p className="text-xs text-[#888888]">
                This email is sent through BELORELLA's server email account and recorded on the contact.
              </p>
            </div>

            <div className="p-6 pt-0 flex justify-end space-x-3">
              <button
                onClick={() => setShowReplyModal(false)}
                disabled={sendingReply}
                className="px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] rounded-lg hover:bg-[#BDBDBD] transition-colors duration-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReply}
                disabled={sendingReply}
                className="px-4 py-2 bg-[#B1123B] text-white rounded-lg hover:bg-[#1B1B1B] transition-colors duration-200 disabled:opacity-50"
              >
                {sendingReply ? 'Sending...' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminContacts;
