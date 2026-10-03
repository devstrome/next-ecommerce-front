'use client'
import { getStorage, setStorage, removeStorage } from "../lib/storage"
const API_BASE = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";
import React, { useState, useContext, useEffect, useMemo } from 'react';
import { UserContext } from '../context/UserContext';
import {
  FaEdit,
  FaSave,
  FaTimes,
  FaUserCircle,
  FaCreditCard,
  FaMapMarkerAlt,
  FaTrash,
  FaStar,
  FaRegStar,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaIdCard,
  FaGlobe,
  FaPlus,
  FaCheck,
  FaExclamationTriangle,
  FaInfoCircle,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaKey,
} from 'react-icons/fa';

const UserProfile = () => {
  const {
    user,
    address,
    paymentMethods,
    defaultPaymentMethod,
    updateProfile,
    updateAddress,
    addPaymentMethod,
    removePaymentMethod,
    makeDefaultPaymentMethod,
    editPaymentMethod,
  } = useContext(UserContext);

  const initialFormData = useMemo(
    () => ({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      fullName: user?.fullName || '',
      phoneNumber: user?.phoneNumber || '',
      email: user?.email || '',
      userName: user?.userName || '',
      imageUrl: user?.imageUrl || '',
      address: {
        street: address?.street || '',
        city: address?.city || '',
        state: address?.state || '',
        zipCode: address?.zipCode || '',
        country: address?.country || '',
      },
    }),
    [user, address]
  );

  const [formData, setFormData] = useState(initialFormData);
  const [isEditing, setIsEditing] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailData, setEmailData] = useState({
    newEmail: '',
    otp: '',
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [verificationStep, setVerificationStep] = useState('email');

  const [newPm, setNewPm] = useState({
    type: 'bkash',
    label: '',
    isDefault: false,
    brand: '',
    last4: '',
    expMonth: '',
    expYear: '',
    walletNumberMasked: '',
    msisdn: '',
  });

  const [editingPmId, setEditingPmId] = useState(null);
  const [editFields, setEditFields] = useState({});

  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const toggleEditing = (field) => {
    setIsEditing((prev) => ({ ...prev, [field]: !prev[field] }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const validatePhoneNumber = (phoneNumber) => {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return 'Phone number is required';
    }

    const trimmedPhone = phoneNumber.trim();
    if (!trimmedPhone) {
      return 'Phone number cannot be empty';
    }

    const phoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      return 'Invalid Bangladeshi phone number format. Please use format: 01XXXXXXXXX or +8801XXXXXXXXX';
    }

    return null;
  };

  const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return phoneNumber;

    let normalized = phoneNumber.trim();

    normalized = normalized.replace(/[^\d+]/g, '');

    if (normalized.startsWith('880')) {
      normalized = '+' + normalized;
    } else if (normalized.startsWith('0')) {
      normalized = '+880' + normalized.substring(1);
    } else if (normalized.startsWith('1') && normalized.length === 11) {
      normalized = '+880' + normalized;
    } else if (!normalized.startsWith('+880')) {
      normalized = '+880' + normalized;
    }

    return normalized;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const keys = name.split('.');

    setFormData((prev) => {
      if (keys.length === 1) {
        return { ...prev, [name]: value };
      } else {
        const [outerKey, innerKey] = keys;
        return {
          ...prev,
          [outerKey]: {
            ...prev[outerKey],
            [innerKey]: value,
          },
        };
      }
    });

    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const saveChanges = async (field) => {
    setLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      let valueToSave = formData[field];

      if (field === 'phoneNumber') {
        const validationError = validatePhoneNumber(valueToSave);
        if (validationError) {
          setErrors({ [field]: validationError });
          setLoading(false);
          return;
        }
        valueToSave = normalizePhoneNumber(valueToSave);
      }

      if (field.startsWith('address.')) {
        const innerKey = field.split('.')[1];
        const nextAddress = {
          ...formData.address,
          [innerKey]: formData.address?.[innerKey],
        };
        await updateAddress(nextAddress);
      } else {
        await updateProfile({ [field]: valueToSave });
      }

      setIsEditing((prev) => ({ ...prev, [field]: false }));
      setSuccessMessage(`${formatLabel(field)} updated successfully!`);
    } catch (error) {
      console.error('Failed to update user profile:', error);
      const errorMessage = error?.response?.data?.message || 'Could not save changes. Please try again.';
      setErrors({ [field]: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const formatLabel = (label) =>
    label.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validatePassword = (password) => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return null;
  };

  const updatePassword = async () => {
    setLoading(true);
    setErrors({});

    try {
      const passwordError = validatePassword(passwordData.newPassword);
      if (passwordError) {
        setErrors({ newPassword: passwordError });
        setLoading(false);
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        setErrors({ confirmPassword: 'Passwords do not match' });
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_BASE}/api/update-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStorage('accessToken')}`,
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          try {
            const refreshToken = getStorage('refreshToken');
            if (refreshToken) {
              const refreshResponse = await fetch(`${API_BASE}/api/refresh-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: refreshToken }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setStorage('accessToken', refreshData.accessToken);

                const retryResponse = await fetch(`${API_BASE}/api/update-password`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                  },
                  body: JSON.stringify({
                    currentPassword: passwordData.currentPassword,
                    newPassword: passwordData.newPassword,
                  }),
                });

                const retryData = await retryResponse.json();

                if (!retryResponse.ok) {
                  throw new Error(retryData.message || 'Failed to update password');
                }

                setSuccessMessage('Password updated successfully!');
                setShowPasswordModal(false);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                return;
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            window.location.href = '/login';
            return;
          }
        }
        throw new Error(data.message || 'Failed to update password');
      }

      setSuccessMessage('Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Password update failed:', error);
      setErrors({ password: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (e) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const sendEmailOTP = async () => {
    if (!validateEmail(emailData.newEmail)) {
      setErrors({ newEmail: 'Please enter a valid email address' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE}/api/send-email-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStorage('accessToken')}`,
        },
        body: JSON.stringify({
          newEmail: emailData.newEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          try {
            const refreshToken = getStorage('refreshToken');
            if (refreshToken) {
              const refreshResponse = await fetch(`${API_BASE}/api/refresh-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: refreshToken }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setStorage('accessToken', refreshData.accessToken);

                const retryResponse = await fetch(`${API_BASE}/api/send-email-otp`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                  },
                  body: JSON.stringify({
                    newEmail: emailData.newEmail,
                  }),
                });

                const retryData = await retryResponse.json();

                if (!retryResponse.ok) {
                  throw new Error(retryData.message || 'Failed to send OTP');
                }

                setOtpSent(true);
                setOtpTimer(60);
                setVerificationStep('otp');
                setSuccessMessage('Verification code sent to your new email!');
                return;
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            setErrors({ email: 'Your session has expired. Please log in again to continue.' });
            setLoading(false);
            return;
          }
        }
        throw new Error(data.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      setOtpTimer(60);
      setVerificationStep('otp');
      setSuccessMessage('Verification code sent to your new email!');
    } catch (error) {
      console.error('Send OTP failed:', error);
      setErrors({ email: error.message });
    } finally {
      setLoading(false);
    }
  };

  const updateEmail = async () => {
    if (!emailData.otp || emailData.otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit verification code' });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(`${API_BASE}/api/update-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStorage('accessToken')}`,
        },
        body: JSON.stringify({
          newEmail: emailData.newEmail,
          otp: emailData.otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          try {
            const refreshToken = getStorage('refreshToken');
            if (refreshToken) {
              const refreshResponse = await fetch(`${API_BASE}/api/refresh-token`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ token: refreshToken }),
              });

              if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setStorage('accessToken', refreshData.accessToken);

                const retryResponse = await fetch(`${API_BASE}/api/update-email`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${refreshData.accessToken}`,
                  },
                  body: JSON.stringify({
                    newEmail: emailData.newEmail,
                    otp: emailData.otp,
                  }),
                });

                const retryData = await retryResponse.json();

                if (!retryResponse.ok) {
                  throw new Error(retryData.message || 'Failed to update email');
                }

                setSuccessMessage('Email updated successfully!');
                setShowEmailModal(false);
                setEmailData({ newEmail: '', otp: '' });
                setOtpSent(false);
                setOtpTimer(0);
                setVerificationStep('email');

                window.location.reload();
                return;
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            setErrors({ email: 'Your session has expired. Please log in again to continue.' });
            setLoading(false);
            return;
          }
        }
        throw new Error(data.message || 'Failed to update email');
      }

      setSuccessMessage('Email updated successfully!');
      setShowEmailModal(false);
      setEmailData({ newEmail: '', otp: '' });
      setOtpSent(false);
      setOtpTimer(0);
      setVerificationStep('email');

      window.location.reload();
    } catch (error) {
      console.error('Email update failed:', error);
      setErrors({ email: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field, label, value, icon, type = 'text') => (
    <div key={field} className="w-full">
      <label className="block text-sm font-semibold text-dark-gray mb-2 flex items-center gap-2">
        {icon}
        {formatLabel(label)}
        {field === 'phoneNumber' && (
          <div className="relative group">
            <FaInfoCircle className="text-mid-gray text-xs cursor-help" />
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
              Format: 01XXXXXXXXX or +8801XXXXXXXXX
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
            </div>
          </div>
        )}
      </label>
      {isEditing[field] ? (
        <div className="space-y-2">
          <div className="flex gap-2 items-center">
            <input
              type={type}
              name={field}
              value={value || ''}
              onChange={handleChange}
              className={`flex-1 rounded-lg border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink shadow-sm transition-all duration-200 ${
                errors[field] ? 'border-maybelline-pink bg-pure-white' : 'border-cool-gray'
              }`}
              placeholder={field === 'phoneNumber' ? '01XXXXXXXXX or +8801XXXXXXXXX' : `Enter ${formatLabel(label).toLowerCase()}`}
            />
            <button
              className="p-3 text-maybelline-pink hover:text-maybelline-pink hover:bg-pure-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => saveChanges(field)}
              disabled={loading}
              title="Save"
            >
              <FaSave />
            </button>
            <button
              className="p-3 text-maybelline-pink hover:text-maybelline-pink hover:bg-pure-white rounded-lg transition-all duration-200"
              onClick={() => {
                toggleEditing(field);
                setFormData(initialFormData);
              }}
              title="Cancel"
            >
              <FaTimes />
            </button>
          </div>
          {errors[field] && (
            <div className="text-maybelline-pink text-sm flex items-center gap-1">
              <FaExclamationTriangle className="text-xs" />
              {errors[field]}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between card rounded-lg px-4 py-3 hover:border-mid-gray transition-all duration-200">
          <span className="text-black truncate">{value || 'Not provided'}</span>
          <button
            className="p-2 text-maybelline-pink hover:text-maybelline-pink hover:bg-pure-white rounded-lg transition-all duration-200"
            onClick={() => toggleEditing(field)}
            title="Edit"
          >
            <FaEdit />
          </button>
        </div>
      )}
    </div>
  );

  const handleNewPmChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewPm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors.paymentMethod) {
      setErrors((prev) => ({ ...prev, paymentMethod: '' }));
    }
  };

  const resetNewPm = () =>
    setNewPm({
      type: 'bkash',
      label: '',
      isDefault: false,
      brand: '',
      last4: '',
      expMonth: '',
      expYear: '',
      walletNumberMasked: '',
      msisdn: '',
    });

  const submitNewPaymentMethod = async () => {
    try {
      let payload = { type: newPm.type, label: newPm.label, isDefault: newPm.isDefault };

      if (newPm.type === 'card') {
        payload = {
          ...payload,
          brand: newPm.brand || 'Card',
          last4: (newPm.last4 || '').slice(-4),
          expMonth: Number(newPm.expMonth) || undefined,
          expYear: Number(newPm.expYear) || undefined,
        };
      } else {
        payload = {
          ...payload,
          walletNumberMasked: newPm.walletNumberMasked || '',
          msisdn: newPm.msisdn || '',
        };
      }

      await addPaymentMethod(payload);
      resetNewPm();
      setSuccessMessage('Payment method added successfully!');
    } catch (e) {
      console.error('Add payment method failed', e);
      const errorMessage = e?.response?.data?.message || 'Failed to add payment method';
      setErrors({ paymentMethod: errorMessage });
    }
  };

  const maskMsisdn = (msisdn) => {
    if (!msisdn) return '';
    return msisdn.replace(/^(\d{2})\d+(\d{2})$/, '$1********$2');
  };

  const renderPmBadge = (pm) => {
    const type = pm.type;
    if (type === 'card') {
      const label = pm.label || `${pm.brand || 'Card'} **** ${pm.last4 || 'XXXX'}`;
      const exp =
        pm.expMonth && pm.expYear ? ` (exp ${String(pm.expMonth).padStart(2, '0')}/${pm.expYear})` : '';
      return `${label}${exp}`;
    }
    const label = pm.label || `${type.toUpperCase()} ${pm.walletNumberMasked || maskMsisdn(pm.msisdn) || ''}`;
    return label;
  };

  const startEditingMethod = (pm) => {
    setEditingPmId(pm._id);
    if (pm.type === 'card') {
      setEditFields({
        label: pm.label || '',
        brand: pm.brand || '',
        last4: pm.last4 || '',
        expMonth: pm.expMonth || '',
        expYear: pm.expYear || '',
      });
    } else {
      setEditFields({
        label: pm.label || '',
        walletNumberMasked: pm.walletNumberMasked || '',
        msisdn: pm.msisdn || '',
      });
    }
  };

  const cancelEditMethod = () => {
    setEditingPmId(null);
    setEditFields({});
  };

  const handleEditFieldChange = (e) => {
    const { name, value } = e.target;
    setEditFields((prev) => ({ ...prev, [name]: value }));
  };

  const saveEditedPaymentMethod = async () => {
    try {
      const payload =
        paymentMethods.find((p) => p._id === editingPmId)?.type === 'card'
          ? {
              ...editFields,
              expMonth:
                editFields.expMonth !== '' && !Number.isNaN(Number(editFields.expMonth))
                  ? Number(editFields.expMonth)
                  : undefined,
              expYear:
                editFields.expYear !== '' && !Number.isNaN(Number(editFields.expYear))
                  ? Number(editFields.expYear)
                  : undefined,
              last4: String(editFields.last4 || '').slice(-4),
            }
          : { ...editFields };

      await editPaymentMethod(editingPmId, payload);
      cancelEditMethod();
      setSuccessMessage('Payment method updated successfully!');
    } catch (e) {
      console.error('Update payment method failed', e);
      const errorMessage = e?.response?.data?.message || 'Failed to update payment method';
      setErrors({ paymentMethod: errorMessage });
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-black mb-2 flex items-center gap-3 font-heading">
          <div className="w-12 h-12 bg-maybelline-pink rounded-full flex items-center justify-center">
            <FaUser className="text-white text-xl" />
          </div>
          My Profile
        </h1>
        <p className="section-tag">Manage your account information and preferences</p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 bg-pure-white border border-maybelline-pink rounded-lg flex items-center gap-3">
          <FaCheck className="text-maybelline-pink text-lg" />
          <span className="text-maybelline-pink font-medium">{successMessage}</span>
        </div>
      )}

      <div className="space-y-8">
        <div className="card rounded-xl">
          <div className="bg-pure-white px-6 py-4 border-b border-cool-gray">
            <h2 className="text-xl font-semibold text-black flex items-center gap-3 font-heading">
              <FaUser className="text-maybelline-pink" />
              Personal Information
            </h2>
            <p className="text-sm text-dark-gray mt-1">Update your personal details</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { field: 'firstName', icon: <FaUser className="text-maybelline-pink" /> },
                { field: 'lastName', icon: <FaUser className="text-maybelline-pink" /> },
                { field: 'fullName', icon: <FaIdCard className="text-maybelline-pink" /> },
                { field: 'phoneNumber', icon: <FaPhone className="text-maybelline-pink" /> },
                { field: 'userName', icon: <FaUser className="text-maybelline-pink" /> },
              ].map(({ field, icon }) => renderField(field, field, formData[field], icon))}

              <div className="w-full">
                <label className="block text-sm font-semibold text-dark-gray mb-2 flex items-center gap-2">
                  <FaEnvelope className="text-maybelline-pink" />
                  Email
                </label>
                <div className="flex items-center justify-between card rounded-lg px-4 py-3">
                  <span className="text-black truncate">{formData.email || 'Not provided'}</span>
                  <span className="text-xs text-dark-gray bg-cool-gray px-2 py-1 rounded">Read Only</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-cool-gray">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                <FaLock className="text-maybelline-pink" />
                Security Settings
              </h3>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="btn-primary"
                >
                  <FaKey />
                  Change Password
                </button>
                <button
                  onClick={() => setShowEmailModal(true)}
                  className="btn-primary"
                >
                  <FaEnvelope />
                  Update Email
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card rounded-xl">
          <div className="bg-pure-white px-6 py-4 border-b border-cool-gray">
            <h2 className="text-xl font-semibold text-black flex items-center gap-3 font-heading">
              <FaMapMarkerAlt className="text-maybelline-pink" />
              Address Information
            </h2>
            <p className="text-sm text-dark-gray mt-1">Manage your shipping address</p>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {['street', 'city', 'state', 'zipCode', 'country'].map((field) =>
                renderField(
                  `address.${field}`,
                  field,
                  formData.address?.[field],
                  <FaMapMarkerAlt className="text-maybelline-pink" />
                )
              )}
            </div>
          </div>
        </div>

        <div className="card rounded-xl">
          <div className="bg-pure-white px-6 py-4 border-b border-cool-gray">
            <h2 className="text-xl font-semibold text-black flex items-center gap-3 font-heading">
              <FaCreditCard className="text-maybelline-pink" />
              Payment Methods
            </h2>
            <p className="text-sm text-dark-gray mt-1">Manage your payment options</p>
          </div>

          <div className="p-6 space-y-6">
            {errors.paymentMethod && (
              <div className="p-4 bg-pure-white border border-maybelline-pink rounded-lg flex items-center gap-3">
                <FaExclamationTriangle className="text-maybelline-pink text-lg" />
                <span className="text-maybelline-pink">{errors.paymentMethod}</span>
              </div>
            )}

            <div>
              <h3 className="text-lg font-semibold text-black mb-4 font-heading">Saved Payment Methods</h3>
              <div className="space-y-4">
                {(paymentMethods || []).length === 0 ? (
                  <div className="text-center py-8 card rounded-xl border-dashed">
                    <FaCreditCard className="text-mid-gray text-4xl mx-auto mb-3" />
                    <p className="text-dark-gray">No payment methods saved yet.</p>
                    <p className="text-sm text-dark-gray">Add a payment method to get started.</p>
                  </div>
                ) : (
                  paymentMethods.map((pm) => {
                    const isDefault = pm._id === defaultPaymentMethod?._id || pm.isDefault;
                    const isEditingPm = pm._id === editingPmId;

                    return (
                      <div
                        key={pm._id}
                        className="card rounded-xl p-4"
                      >
                        {!isEditingPm ? (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-maybelline-pink rounded-lg flex items-center justify-center">
                                <FaCreditCard className="text-white text-lg" />
                              </div>
                              <div>
                                <div className="font-semibold text-black">{renderPmBadge(pm)}</div>
                                <div className="text-sm text-dark-gray capitalize">Type: {pm.type}</div>
                                {isDefault && (
                                  <div className="flex items-center gap-1 mt-1">
                                    <FaStar className="text-maybelline-pink text-xs" />
                                    <span className="text-xs text-maybelline-pink font-medium">Default</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isDefault && (
                                <button
                                  className="p-2 text-dark-gray hover:text-maybelline-pink hover:bg-pure-white rounded-lg transition-all duration-200"
                                  title="Make default"
                                  onClick={() => makeDefaultPaymentMethod(pm._id)}
                                >
                                  <FaRegStar />
                                </button>
                              )}

                              <button
                                className="p-2 text-maybelline-pink hover:text-maybelline-pink hover:bg-pure-white rounded-lg transition-all duration-200"
                                title="Edit"
                                onClick={() => startEditingMethod(pm)}
                              >
                                <FaEdit />
                              </button>

                              <button
                                className="p-2 text-maybelline-pink hover:text-maybelline-pink hover:bg-pure-white rounded-lg transition-all duration-200"
                                title="Remove"
                                onClick={() => removePaymentMethod(pm._id)}
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-dark-gray mb-2">Label</label>
                                <input
                                  name="label"
                                  value={editFields.label || ''}
                                  onChange={handleEditFieldChange}
                                  className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                  placeholder="e.g., Personal bKash, Visa **** 4242"
                                />
                              </div>

                              {pm.type === 'card' ? (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-dark-gray mb-2">Brand</label>
                                    <input
                                      name="brand"
                                      value={editFields.brand || ''}
                                      onChange={handleEditFieldChange}
                                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                      placeholder="Visa, MasterCard"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-dark-gray mb-2">Last 4</label>
                                    <input
                                      name="last4"
                                      value={editFields.last4 || ''}
                                      onChange={handleEditFieldChange}
                                      maxLength={4}
                                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                      placeholder="1234"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-dark-gray mb-2">Exp. Month</label>
                                    <input
                                      name="expMonth"
                                      type="number"
                                      min={1}
                                      max={12}
                                      value={editFields.expMonth || ''}
                                      onChange={handleEditFieldChange}
                                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                      placeholder="MM"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-dark-gray mb-2">Exp. Year</label>
                                    <input
                                      name="expYear"
                                      type="number"
                                      min={new Date().getFullYear()}
                                      value={editFields.expYear || ''}
                                      onChange={handleEditFieldChange}
                                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                      placeholder="YYYY"
                                    />
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-sm font-medium text-dark-gray mb-2">Wallet (masked)</label>
                                    <input
                                      name="walletNumberMasked"
                                      value={editFields.walletNumberMasked || ''}
                                      onChange={handleEditFieldChange}
                                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                      placeholder="01*********89"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-dark-gray mb-2">MSISDN (optional)</label>
                                    <input
                                      name="msisdn"
                                      value={editFields.msisdn || ''}
                                      onChange={handleEditFieldChange}
                                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                                      placeholder="01XXXXXXXXX"
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={saveEditedPaymentMethod}
                                className="btn-primary"
                              >
                                <FaCheck />
                                Save
                              </button>
                              <button
                                onClick={cancelEditMethod}
                                className="px-6 py-2 rounded-lg border border-cool-gray text-dark-gray hover:bg-pure-white transition-all duration-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-cool-gray pt-6">
              <h3 className="text-lg font-semibold text-black mb-4 flex items-center gap-2 font-heading">
                <FaPlus className="text-maybelline-pink" />
                Add New Payment Method
              </h3>

              <div className="card rounded-xl p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-gray mb-2">Type</label>
                    <select
                      name="type"
                      value={newPm.type}
                      onChange={handleNewPmChange}
                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                    >
                      <option value="bkash">bKash</option>
                      <option value="nagad">Nagad</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-gray mb-2">Label (optional)</label>
                    <input
                      name="label"
                      value={newPm.label}
                      onChange={handleNewPmChange}
                      placeholder="e.g., Personal bKash, Visa **** 4242"
                      className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="isDefault"
                      type="checkbox"
                      name="isDefault"
                      checked={newPm.isDefault}
                      onChange={handleNewPmChange}
                      className="w-4 h-4 text-maybelline-pink border-cool-gray rounded focus:ring-maybelline-pink"
                    />
                    <label htmlFor="isDefault" className="text-sm text-dark-gray">
                      Set as default
                    </label>
                  </div>

                  {newPm.type === 'card' ? (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">Brand</label>
                        <input
                          name="brand"
                          value={newPm.brand}
                          onChange={handleNewPmChange}
                          placeholder="Visa, MasterCard"
                          className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">Last 4</label>
                        <input
                          name="last4"
                          value={newPm.last4}
                          onChange={handleNewPmChange}
                          placeholder="1234"
                          maxLength={4}
                          className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">Exp. Month</label>
                        <input
                          name="expMonth"
                          type="number"
                          min={1}
                          max={12}
                          value={newPm.expMonth}
                          onChange={handleNewPmChange}
                          placeholder="MM"
                          className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">Exp. Year</label>
                        <input
                          name="expYear"
                          type="number"
                          min={new Date().getFullYear()}
                          value={newPm.expYear}
                          onChange={handleNewPmChange}
                          placeholder="YYYY"
                          className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">Wallet number (masked)</label>
                        <input
                          name="walletNumberMasked"
                          value={newPm.walletNumberMasked}
                          onChange={handleNewPmChange}
                          placeholder="01*********89"
                          className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-dark-gray mb-2">MSISDN (optional)</label>
                        <input
                          name="msisdn"
                          value={newPm.msisdn}
                          onChange={handleNewPmChange}
                          placeholder="01XXXXXXXXX"
                          className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={submitNewPaymentMethod}
                    className="btn-primary"
                  >
                    <FaPlus />
                    Add Method
                  </button>
                  <button
                    onClick={resetNewPm}
                    className="px-6 py-3 rounded-lg border border-cool-gray text-dark-gray hover:bg-pure-white transition-all duration-200"
                  >
                    Reset
                  </button>
                </div>

                <div className="mt-4 p-4 card rounded-lg">
                  <div className="flex items-start gap-3">
                    <FaExclamationTriangle className="text-maybelline-pink mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-dark-gray">
                      <p className="font-medium text-black mb-1">Security Notice</p>
                      <p>For cards, we only store brand, last 4 digits, and expiry date. We never collect or store full card numbers or CVV on our servers.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-black flex items-center gap-2 font-heading">
                  <FaKey className="text-maybelline-pink" />
                  Change Password
                </h3>
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setErrors({});
                  }}
                  className="p-2 text-mid-gray hover:text-black rounded-lg hover:bg-cool-gray transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-maybelline-pink rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaKey className="text-white text-2xl" />
                </div>
                <h4 className="text-lg font-semibold text-black mb-2 font-heading">Update Your Password</h4>
                <p className="text-dark-gray text-sm font-sans">Enter your current password and choose a new secure password</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-lg border border-cool-gray px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mid-gray hover:text-black"
                    >
                      {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.currentPassword && (
                    <p className="text-maybelline-pink text-sm mt-1">{errors.currentPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-lg border border-cool-gray px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mid-gray hover:text-black"
                    >
                      {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.newPassword && (
                    <p className="text-maybelline-pink text-sm mt-1">{errors.newPassword}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-gray mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handlePasswordChange}
                      className="w-full rounded-lg border border-cool-gray px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-mid-gray hover:text-black"
                    >
                      {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-maybelline-pink text-sm mt-1">{errors.confirmPassword}</p>
                  )}
                </div>

                <div className="p-4 card rounded-lg">
                  <h5 className="text-sm font-medium text-black mb-2">Password Requirements:</h5>
                  <ul className="text-xs text-dark-gray space-y-1">
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${passwordData.newPassword.length >= 8 ? 'bg-maybelline-pink' : 'bg-mid-gray'}`}></div>
                      At least 8 characters long
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${/(?=.*[a-z])/.test(passwordData.newPassword) ? 'bg-maybelline-pink' : 'bg-mid-gray'}`}></div>
                      Contains lowercase letter
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${/(?=.*[A-Z])/.test(passwordData.newPassword) ? 'bg-maybelline-pink' : 'bg-mid-gray'}`}></div>
                      Contains uppercase letter
                    </li>
                    <li className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${/(?=.*\d)/.test(passwordData.newPassword) ? 'bg-maybelline-pink' : 'bg-mid-gray'}`}></div>
                      Contains number
                    </li>
                  </ul>
                </div>

                {errors.password && (
                  <div className="p-3 bg-pure-white border border-maybelline-pink rounded-lg">
                    <p className="text-maybelline-pink text-sm">{errors.password}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={updatePassword}
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                      setErrors({});
                    }}
                    className="px-4 py-3 border border-cool-gray text-dark-gray rounded-lg hover:bg-pure-white transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="card rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-black flex items-center gap-2 font-heading">
                  <FaEnvelope className="text-maybelline-pink" />
                  Update Email Address
                </h3>
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailData({ newEmail: '', otp: '' });
                    setOtpSent(false);
                    setOtpTimer(0);
                    setVerificationStep('email');
                    setErrors({});
                  }}
                  className="p-2 text-mid-gray hover:text-black rounded-lg hover:bg-cool-gray transition-colors"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    verificationStep === 'email' ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                  }`}>
                    1
                  </div>
                  <div className={`w-12 h-0.5 mx-2 ${
                    verificationStep === 'otp' ? 'bg-maybelline-pink' : 'bg-cool-gray'
                  }`}></div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    verificationStep === 'otp' ? 'bg-maybelline-pink text-white' : 'bg-cool-gray text-dark-gray'
                  }`}>
                    2
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {verificationStep === 'email' ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-maybelline-pink rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaEnvelope className="text-white text-2xl" />
                      </div>
                      <h4 className="text-lg font-semibold text-black mb-2 font-heading">Enter New Email</h4>
                      <p className="text-dark-gray text-sm font-sans">We'll send a verification code to your new email address</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-gray mb-2">
                        New Email Address
                      </label>
                      <input
                        type="email"
                        name="newEmail"
                        value={emailData.newEmail}
                        onChange={handleEmailChange}
                        className="w-full rounded-lg border border-cool-gray px-4 py-3 focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        placeholder="Enter new email address"
                      />
                      {errors.newEmail && (
                        <p className="text-maybelline-pink text-sm mt-1">{errors.newEmail}</p>
                      )}
                    </div>

                    {errors.email && (
                      <div className="p-3 bg-pure-white border border-maybelline-pink rounded-lg">
                        <p className="text-maybelline-pink text-sm">{errors.email}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={sendEmailOTP}
                        disabled={loading || !emailData.newEmail}
                        className="btn-primary flex-1"
                      >
                        {loading ? 'Sending...' : 'Send Verification Code'}
                      </button>
                      <button
                        onClick={() => {
                          setShowEmailModal(false);
                          setEmailData({ newEmail: '', otp: '' });
                          setOtpSent(false);
                          setOtpTimer(0);
                          setVerificationStep('email');
                          setErrors({});
                        }}
                        className="px-4 py-3 border border-cool-gray text-dark-gray rounded-lg hover:bg-pure-white transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-maybelline-pink rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaCheck className="text-white text-2xl" />
                      </div>
                      <h4 className="text-lg font-semibold text-black mb-2 font-heading">Verify Your Email</h4>
                      <p className="text-dark-gray text-sm font-sans">
                        We've sent a 6-digit verification code to <br />
                        <span className="font-medium text-black">{emailData.newEmail}</span>
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-dark-gray mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        name="otp"
                        value={emailData.otp}
                        onChange={handleEmailChange}
                        maxLength={6}
                        className="w-full rounded-lg border border-cool-gray px-4 py-3 text-center text-lg font-mono focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                        placeholder="000000"
                        autoFocus
                      />
                      {errors.otp && (
                        <p className="text-maybelline-pink text-sm mt-1">{errors.otp}</p>
                      )}
                    </div>

                    <div className="text-center">
                      {otpTimer > 0 ? (
                        <p className="text-sm text-dark-gray font-sans">
                          Resend code in <span className="font-medium">{otpTimer}</span> seconds
                        </p>
                      ) : (
                        <button
                          onClick={sendEmailOTP}
                          className="text-maybelline-pink hover:text-maybelline-pink/80 text-sm font-medium"
                        >
                          Didn't receive the code? Resend
                        </button>
                      )}
                    </div>

                    {errors.email && (
                      <div className="p-3 bg-pure-white border border-maybelline-pink rounded-lg">
                        <p className="text-maybelline-pink text-sm">{errors.email}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={updateEmail}
                        disabled={loading || !emailData.otp || emailData.otp.length !== 6}
                        className="btn-primary flex-1"
                      >
                        {loading ? 'Verifying...' : 'Verify & Update Email'}
                      </button>
                      <button
                        onClick={() => {
                          setVerificationStep('email');
                          setEmailData(prev => ({ ...prev, otp: '' }));
                          setOtpSent(false);
                          setOtpTimer(0);
                          setErrors({});
                        }}
                        className="px-4 py-3 border border-cool-gray text-dark-gray rounded-lg hover:bg-pure-white transition-all duration-200"
                      >
                        Back
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
