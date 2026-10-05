'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FaHeart, FaTrash, FaStar, FaSearch, FaEnvelope, FaPaperPlane } from "react-icons/fa";
import Link from "next/link";
import { toast } from "react-toastify";
import { formatBDT } from '../config/brand';

const API = process.env.NEXT_PUBLIC_API_URI;

const AdminWishlists = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [emailUser, setEmailUser] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState("stock");
  const [comingDate, setComingDate] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetchWishlists = async () => {
      try {
        const token = getStorage("adminAccessToken");
        const res = await axios.get(`${API}/api/admin/wishlists`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data || []);
      } catch (err) {
        console.error("Failed to load wishlists:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchWishlists();
  }, []);

  const filtered = data.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const buildPrefill = (template, date, user) => {
    const items = (user?.wishlist || []).map((p) => p.name).filter(Boolean);
    const itemsText =
      items.length === 0
        ? "the items you saved"
        : items.length <= 3
        ? items.join(", ")
        : `${items.slice(0, 3).join(", ")} and ${items.length - 3} more item(s)`;
    const name = user?.firstName || "there";
    const formattedDate = date
      ? new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "";

    if (template === "stock") {
      return {
        subject: "In stock now — items from your wishlist",
        message:
          `Hi ${name},\n\n` +
          `Great news! ${itemsText} from your wishlist ${
            items.length === 1 ? "is" : "are"
          } now available at BELORELLA.\n\n` +
          `Order now before it sells out!\n\n` +
          `Best regards,\n` +
          `BELORELLA Support`,
      };
    }
    if (template === "coming") {
      return {
        subject: formattedDate
          ? `Arriving ${formattedDate} — items from your wishlist`
          : "Coming soon — items from your wishlist",
        message:
          `Hi ${name},\n\n` +
          `${itemsText} from your wishlist ${
            items.length === 1 ? "is" : "are"
          } will be available on ${
            formattedDate || "a date to be announced soon"
          }.\n\n` +
          `Stay tuned — order as soon as it arrives!\n\n` +
          `Best regards,\n` +
          `BELORELLA Support`,
      };
    }
    return { subject: "A message from BELORELLA", message: "" };
  };

  const openEmailModal = (user) => {
    const prefill = buildPrefill("stock", "", user);
    setEmailUser(user);
    setEmailTemplate("stock");
    setComingDate("");
    setSubject(prefill.subject);
    setMessage(prefill.message);
  };

  const handleTemplateChange = (template) => {
    setEmailTemplate(template);
    const prefill = buildPrefill(template, comingDate, emailUser);
    setSubject(prefill.subject);
    setMessage(prefill.message);
  };

  const handleDateChange = (date) => {
    setComingDate(date);
    if (emailTemplate === "coming") {
      const prefill = buildPrefill("coming", date, emailUser);
      setSubject(prefill.subject);
      setMessage(prefill.message);
    }
  };

  const handleSendEmail = async () => {
    if (!emailUser) return;
    if (!subject.trim() || !message.trim()) {
      toast.error("Subject and message are required");
      return;
    }
    setSending(true);
    try {
      await axios.post(
        `${API}/api/admin/wishlists/send-email`,
        { to: emailUser.email, subject: subject.trim(), message: message.trim() },
        { headers: { Authorization: `Bearer ${getStorage("adminAccessToken")}` } }
      );
      toast.success(`Email sent to ${emailUser.email}`);
      setEmailUser(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send email");
      console.error("Failed to send wishlist email:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 min-h-screen bg-[#FAF8F6]">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>
              Customer Wishlists
            </h1>
            <p className="text-sm text-[#4A4A4A] mt-1">
              {data.length} customers have items in their wishlists
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4A4A]" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-[#BDBDBD] focus:ring-2 focus:ring-[#B1123B] focus:border-transparent bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-10 w-10 border-b-2 border-[#B1123B]"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-[#4A4A4A]">
            <FaHeart className="text-4xl mx-auto mb-3 text-[#BDBDBD]" />
            <p className="text-lg font-medium">
              {search ? "No customers match your search" : "No wishlists found"}
            </p>
            <p className="text-sm">
              {search ? "Try a different name or email" : "Customers haven't added any products to their wishlists yet"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((user) => (
              <div
                key={user._id}
                className="bg-white border border-[#BDBDBD] overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpanded(expanded === user._id ? null : user._id)
                  }
                  className="w-full flex items-center justify-between p-4 hover:bg-[#F4F4F4] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#1B1B1B] flex items-center justify-center text-white font-bold">
                      {user.firstName?.[0] || "?"}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-[#1B1B1B]">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-sm text-[#4A4A4A]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm bg-[#F7D5DF] text-[#B1123B] px-2.5 py-1 font-medium">
                      {Array.isArray(user.wishlist) ? user.wishlist.length : 0} items
                    </span>
                    <svg
                      className={`w-5 h-5 text-[#4A4A4A] transition-transform ${
                        expanded === user._id ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {expanded === user._id && (
                  <div className="border-t border-[#F4F4F4] px-4 py-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-[#4A4A4A]">Wishlist items</p>
                      <button
                        onClick={() => openEmailModal(user)}
                        className="flex items-center gap-1.5 text-sm font-semibold text-white bg-[#B1123B] hover:bg-[#1B1B1B] px-3 py-1.5 transition-colors"
                      >
                        <FaEnvelope size={13} /> Email Customer
                      </button>
                    </div>
                    {Array.isArray(user.wishlist) && user.wishlist.length > 0 ? (
                      user.wishlist.map((product) => (
                        <div
                          key={product._id}
                          className="flex items-center gap-3 p-3 bg-[#FAF8F6] hover:bg-[#F4F4F4] transition-colors"
                        >
                          <img
                            src={product.mainImage || "/placeholder.jpg"}
                            alt={product.name}
                            className="w-14 h-14 object-contain bg-white border border-[#BDBDBD]"
                          />
                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${product._id}`}
                              className="font-medium text-[#1B1B1B] hover:text-[#B1123B] transition-colors line-clamp-1"
                            >
                              {product.name}
                            </Link>
                            <div className="flex items-center gap-3 text-sm text-[#4A4A4A] mt-1">
                              <span className="font-semibold text-[#1B1B1B]">
                                {formatBDT(product.discountPrice || product.mainPrice)}
                              </span>
                              {product.brand && (
                                <span className="text-[#4A4A4A]">{product.brand}</span>
                              )}
                              {product.averageRating > 0 && (
                                <span className="flex items-center gap-1 text-yellow-500">
                                  <FaStar size={12} />
                                  {product.averageRating.toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-[#4A4A4A] text-center py-4">
                        No product details available
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {emailUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F4F4F4]">
              <h2 className="text-lg font-bold text-[#1B1B1B]">Send Email</h2>
              <button
                onClick={() => setEmailUser(null)}
                disabled={sending}
                className="text-2xl leading-none text-[#4A4A4A] hover:text-[#B1123B]"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">To</label>
                <input
                  type="email"
                  readOnly
                  value={emailUser.email}
                  className="w-full px-3 py-2 border border-[#BDBDBD] bg-[#F4F4F4] text-[#1B1B1B] cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Email Type</label>
                <select
                  value={emailTemplate}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
                >
                  <option value="stock">Already here — in stock now</option>
                  <option value="coming">Will come on a date — arriving soon</option>
                  <option value="custom">Custom message</option>
                </select>
              </div>

              {emailTemplate === "coming" && (
                <div>
                  <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Arrival Date</label>
                  <input
                    type="date"
                    value={comingDate}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                  placeholder="Email subject"
                  className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] focus:outline-none focus:ring-2 focus:ring-[#B1123B]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#4A4A4A] mb-1">Message</label>
                <textarea
                  rows={9}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your message..."
                  className="w-full px-3 py-2 border border-[#BDBDBD] bg-white text-[#1B1B1B] focus:outline-none focus:ring-2 focus:ring-[#B1123B] resize-none"
                />
              </div>

              <p className="text-xs text-[#888888]">
                Sent through BELORELLA's server email account.
              </p>
            </div>

            <div className="px-6 py-4 border-t border-[#F4F4F4] flex justify-end gap-3">
              <button
                onClick={() => setEmailUser(null)}
                disabled={sending}
                className="px-4 py-2 text-[#4A4A4A] bg-[#F4F4F4] hover:bg-[#BDBDBD] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendEmail}
                disabled={sending}
                className="flex items-center gap-2 px-4 py-2 bg-[#B1123B] text-white hover:bg-[#1B1B1B] transition-colors disabled:opacity-50"
              >
                <FaPaperPlane size={13} />
                {sending ? "Sending..." : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWishlists;
