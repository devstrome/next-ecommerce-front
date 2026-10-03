'use client'
import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaEnvelope, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaClock, 
  FaPaperPlane,
  FaUser,
  FaComments,
  FaCheckCircle,
  FaExclamationTriangle,
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaYoutube
} from 'react-icons/fa';

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/api/contact/submit`, formData);
      
      setIsSubmitting(false);
      setSubmitStatus('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      toast.success(response.data.message, {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Reset status after 3 seconds
      setTimeout(() => setSubmitStatus(null), 3000);
    } catch (error) {
      setIsSubmitting(false);
      setSubmitStatus('error');
      
      const errorMessage = error.response?.data?.message || 'Failed to send message. Please try again.';
      toast.error(errorMessage, {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Reset status after 3 seconds
      setTimeout(() => setSubmitStatus(null), 3000);
    }
  };

  const contactInfo = [
    {
      icon: <FaEnvelope className="text-2xl text-maybelline-pink" />,
      title: "Email Us",
      details: "info.belorella@gmail.com",
      description: "We'll respond within 24 hours"
    },
    {
      icon: <FaPhone className="text-2xl text-maybelline-pink" />,
      title: "Call Us",
      details: "01601-886367",
      description: "Mon-Fri from 8am to 6pm"
    },
    {
      icon: <FaMapMarkerAlt className="text-2xl text-maybelline-pink" />,
      title: "Visit Us",
      details: "North Ibrahimpur, Dhaka-1206",
      description: "Bangladesh"
    },
    {
      icon: <FaClock className="text-2xl text-maybelline-pink" />,
      title: "Business Hours",
      details: "Monday - Friday",
      description: "8:00 AM - 6:00 PM (GMT+6)"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-maybelline-light via-white to-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-maybelline-pink to-maybelline-rose rounded-full flex items-center justify-center">
              <FaComments className="text-white text-xl" />
            </div>
            Contact Us
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Have a question or need assistance? We're here to help! Reach out to us and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaEnvelope className="text-maybelline-pink" />
                Get in Touch
              </h2>
              
              <div className="space-y-6">
                {contactInfo.map((info, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200">
                    <div className="flex-shrink-0">
                      {info.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">{info.title}</h3>
                      <p className="text-gray-700 font-medium">{info.details}</p>
                      <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* FAQ Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
                <div className="space-y-3">
                  <div className="p-3 bg-maybelline-light rounded-lg border border-maybelline-light">
                    <p className="text-sm font-medium text-gray-900">How long does shipping take?</p>
                    <p className="text-xs text-gray-600 mt-1">Typically 3-5 business days for domestic orders.</p>
                  </div>
                  <div className="p-3 bg-maybelline-light rounded-lg border border-maybelline-light">
                    <p className="text-sm font-medium text-gray-900">What's your return policy?</p>
                    <p className="text-xs text-gray-600 mt-1">30-day return policy for unused items in original packaging.</p>
                  </div>
                  <div className="p-3 bg-maybelline-light rounded-lg border border-maybelline-light">
                    <p className="text-sm font-medium text-gray-900">Do you ship internationally?</p>
                    <p className="text-xs text-gray-600 mt-1">Yes, we ship to most countries worldwide.</p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Follow Us</h3>
                <div className="flex items-center gap-3">
                  {[
                    { icon: <FaFacebookF size={16} />, href: 'https://www.facebook.com/BELORELLA', label: 'Facebook', color: 'hover:bg-[#1877F2] hover:border-[#1877F2]' },
                    { icon: <FaInstagram size={16} />, href: 'https://www.instagram.com/belorella.ig', label: 'Instagram', color: 'hover:bg-[#E4405F] hover:border-[#E4405F]' },
                    { icon: <FaTwitter size={16} />, href: 'https://x.com/BELORELLAX', label: 'X', color: 'hover:bg-black hover:border-black' },
                    { icon: <FaYoutube size={16} />, href: 'https://www.youtube.com/@BELORELLA', label: 'YouTube', color: 'hover:bg-[#FF0000] hover:border-[#FF0000]' },
                  ].map((s) => (
                    <a
                      key={s.label}
                      href={s.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 ${s.color} hover:text-white transition-all duration-200`}
                      aria-label={s.label}
                    >
                      {s.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaPaperPlane className="text-maybelline-pink" />
                Send us a Message
              </h2>

              {/* Success/Error Messages */}
              {submitStatus === 'success' && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FaCheckCircle className="text-green-600 text-xl" />
                    <div>
                      <p className="text-green-800 font-medium">Message Sent Successfully!</p>
                      <p className="text-green-700 text-sm">We'll get back to you within 24 hours.</p>
                    </div>
                  </div>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <FaExclamationTriangle className="text-red-600 text-xl" />
                    <div>
                      <p className="text-red-800 font-medium">Failed to Send Message</p>
                      <p className="text-red-700 text-sm">Please try again or contact us directly.</p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaUser className="text-maybelline-pink" />
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <FaEnvelope className="text-maybelline-pink" />
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaComments className="text-maybelline-pink" />
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200"
                    placeholder="What's this about?"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                    <FaComments className="text-maybelline-pink" />
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Tell us more about your inquiry..."
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    By submitting this form, you agree to our{' '}
                    <a href="#" className="text-maybelline-pink hover:text-maybelline-magenta underline">Privacy Policy</a>
                  </p>
                  
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-8 py-3 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      isSubmitting
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-maybelline-pink text-white hover:bg-maybelline-magenta transform hover:scale-105'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FaPaperPlane />
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FaMapMarkerAlt className="text-maybelline-pink" />
              Find Us
            </h2>
            <div className="bg-gray-200 rounded-xl h-64 flex items-center justify-center">
              <div className="text-center">
                <FaMapMarkerAlt className="text-gray-400 text-4xl mx-auto mb-4" />
                <p className="text-gray-600">Interactive map will be displayed here</p>
                <p className="text-sm text-gray-500 mt-2">North Ibrahimpur, Dhaka-1206, Bangladesh</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactForm;