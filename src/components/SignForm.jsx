'use client'
import React, { useContext, useState, useEffect } from 'react';
import Link from "next/link";
import { UserContext } from '../context/UserContext';
import { faEye, faEyeSlash, faEnvelope, faCheck } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { api } from '../config/api';
import { withDevice } from '../lib/device';
import GoogleAuthButton from './GoogleAuthButton';

function SignForm() {
  const { register } = useContext(UserContext);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(true);

  const getRegistrationError = (err, fallback) => {
    const response = err?.response?.data;
    if (response?.banned) return response.message || 'Sign-up is blocked for this account or device.';
    return response?.message || fallback;
  };

  useEffect(() => {
    let timer;
    if (otpCountdown > 0) {
      timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
    } else {
      setCanResendOtp(true);
    }
    return () => clearTimeout(timer);
  }, [otpCountdown]);

  const handleSendOTP = async () => {
    setError('');
    setSuccess('');

    const trimmedEmail = email.trim().toLowerCase();
    
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/api/send-registration-otp', withDevice({ email: trimmedEmail }));
      setSuccess(response.data.message);
      setIsOtpSent(true);
      setOtpCountdown(60);
      setCanResendOtp(false);
    } catch (err) {
      setError(getRegistrationError(err, 'Failed to send OTP. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setError('');
    setSuccess('');

    try {
      setIsSubmitting(true);
      const response = await api.post('/api/resend-otp', { 
        email: email.trim().toLowerCase(),
        type: 'registration'
      });
      setSuccess(response.data.message);
      setOtpCountdown(60);
      setCanResendOtp(false);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to resend OTP. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUserName = userName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedOtp = otp.trim();

    if (!trimmedFirst || !trimmedLast) {
      setError('First name and last name are required');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    const phoneRegex = /^(\+880|880|0)?1[3-9]\d{8}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setError('Please enter a valid Bangladeshi phone number (e.g., +8801XXXXXXXXX or 01XXXXXXXXX)');
      return;
    }
    
    let normalizedPhone = trimmedPhone;
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '+880' + normalizedPhone.substring(1);
    } else if (normalizedPhone.startsWith('880')) {
      normalizedPhone = '+' + normalizedPhone;
    } else if (!normalizedPhone.startsWith('+880')) {
      normalizedPhone = '+880' + normalizedPhone;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (!isOtpSent) {
      setError('Please send OTP first');
      return;
    }
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    const finalUserName =
      trimmedUserName ||
      `${trimmedFirst}.${trimmedLast}`.toLowerCase().replace(/\s+/g, '');

    const formData = {
      firstName: trimmedFirst,
      lastName: trimmedLast,
      userName: finalUserName,
      email: trimmedEmail,
      phoneNumber: normalizedPhone,
      password,
      otp: trimmedOtp,
    };

    try {
      setIsSubmitting(true);
      const response = await api.post('/api/verify-otp-and-register', withDevice(formData));
      
      if (response.data.accessToken && response.data.refreshToken) {
        await register({
          email: response.data.user.email,
          password: password,
          accessToken: response.data.accessToken,
          refreshToken: response.data.refreshToken,
          user: response.data.user
        });
      }
      
      setSuccess('Registration successful! Redirecting...');
    } catch (err) {
      setError(getRegistrationError(err, err?.message || 'Registration failed. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-pure-white min-h-screen flex items-center justify-center py-8">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto w-full">
        <a href="#" className="flex items-center mb-8 text-3xl font-heading text-black">
          BELORELLA
        </a>
        <div className="w-full bg-pure-white border border-cool-gray sm:max-w-md">
          <div className="p-8 space-y-6">
            <h1 className="font-heading text-display-sm text-black text-center">
              Sign Up
            </h1>
            {error && <p className="text-maybelline-pink text-center font-sans text-sm">{error}</p>}
            {success && <p className="text-black text-center font-sans text-sm">{success}</p>}
            <form className="space-y-5" onSubmit={handleSignUp} noValidate>
              <div>
                <label htmlFor="firstName" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="First Name"
                  autoComplete="given-name"
                  className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Last Name"
                  autoComplete="family-name"
                  className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                />
              </div>
              <div>
                <label htmlFor="username" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  required
                  placeholder="Username"
                  autoComplete="username"
                  className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                />
              </div>
              <div>
                <label htmlFor="email" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@company.com"
                    autoComplete="email"
                    className="flex-1 px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                  />
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={isSubmitting || !email.trim() || otpCountdown > 0}
                    className="bg-maybelline-pink text-pure-white px-6 py-3 font-sans text-sm font-medium whitespace-nowrap hover:opacity-90 transition-opacity duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {otpCountdown > 0 ? `${otpCountdown}s` : 'Send OTP'}
                  </button>
                </div>
              </div>
              
              {isOtpSent && (
                <div>
                  <label htmlFor="otp" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                    Verification Code
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      className="flex-1 px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white text-center text-lg tracking-widest focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                    />
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={!canResendOtp || isSubmitting}
                      className="px-6 py-3 text-sm font-medium text-dark-gray border border-cool-gray hover:border-maybelline-pink hover:text-maybelline-pink transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Resend
                    </button>
                  </div>
                  <p className="text-xs text-dark-gray mt-1">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>
              )}
              <div>
                <label htmlFor="phoneNumber" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  placeholder="01XXXXXXXXX or +8801XXXXXXXXX"
                  inputMode="tel"
                  title="Enter Bangladeshi phone number (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)"
                  className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                />
                <p className="text-xs text-dark-gray mt-1">
                  Enter your Bangladeshi mobile number (e.g., 01712345678 or +8801712345678)
                </p>
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-gray"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-maybelline-pink text-pure-white font-sans font-medium hover:opacity-90 transition-opacity duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Signing Up...' : 'Sign Up'}
              </button>
              <p className="text-sm font-light text-dark-gray text-center">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-maybelline-pink hover:text-rose transition-colors duration-200">
                  Log In
                </Link>
              </p>
            </form>
            <GoogleAuthButton onError={setError} />
          </div>
        </div>
      </div>
    </section>
  );
}

export default SignForm;
