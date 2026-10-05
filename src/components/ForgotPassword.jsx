'use client'
import React, { useState, useEffect, useContext } from 'react';
import Link from "next/link";
import { faEye, faEyeSlash, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { api } from '../config/api';
import { UserContext } from '../context/UserContext';

function ForgotPassword({ embedded = false }) {
  const { user } = useContext(UserContext);
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [canResendOtp, setCanResendOtp] = useState(true);
  const [step, setStep] = useState(1);

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
      const response = await api.post('/api/send-forgot-password-otp', { email: trimmedEmail });
      setSuccess(response.data.message);
      setIsOtpSent(true);
      setStep(2);
      setOtpCountdown(60);
      setCanResendOtp(false);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to send OTP. Please try again.';
      setError(message);
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
        type: 'password_reset'
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

  const handleVerifyOTP = async () => {
    setError('');
    setSuccess('');

    const trimmedOtp = otp.trim();
    
    if (!trimmedOtp || trimmedOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/api/verify-otp', {
        email: email.trim().toLowerCase(),
        otp: trimmedOtp,
        type: 'password_reset'
      });
      
      setSuccess('OTP verified successfully. Please enter your new password.');
      setStep(3);
    } catch (err) {
      const message = err?.response?.data?.message || 'Invalid OTP. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    setSuccess('');

    const trimmedNewPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedNewPassword) {
      setError('New password is required');
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (trimmedNewPassword.length > 128) {
      setError('Password must be less than 128 characters');
      return;
    }

    if (!trimmedConfirmPassword) {
      setError('Please confirm your password');
      return;
    }

    if (trimmedNewPassword !== trimmedConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await api.post('/api/verify-forgot-password-otp', {
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        newPassword: trimmedNewPassword
      });
      
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } catch (err) {
      const message = err?.response?.data?.message || 'Failed to reset password. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setError('');
      setSuccess('');
    }
  };

  return (
    <section className={embedded ? 'py-2' : 'bg-[#FAF8F6]'}>
      <div className={`flex flex-col items-center justify-center px-6 ${embedded ? 'py-4' : 'py-8 md:h-screen lg:py-0'} mx-auto`}>
        {!embedded && (
          <a href="#" className="flex items-center mb-6 text-2xl font-semibold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>
            BELORELLA
          </a>
        )}
        <div className="w-full bg-white rounded-lg shadow sm:max-w-md xl:p-0">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <div className="flex items-center">
              {step > 1 && (
                <button
                  onClick={goBack}
                  className="mr-3 text-[#4A4A4A] hover:text-[#1B1B1B]"
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                </button>
              )}
              <h1 className="text-xl font-bold leading-tight tracking-tight text-[#1B1B1B] md:text-2xl" style={{ fontFamily: "'Inter', serif" }}>
                {step === 1 && 'Forgot Password'}
                {step === 2 && 'Enter Verification Code'}
                {step === 3 && 'Reset Password'}
              </h1>
            </div>
            
            {error && <p className="text-red-500 text-center">{error}</p>}
            {success && <p className="text-green-500 text-center">{success}</p>}

            {step === 1 && (
              <div className="space-y-4">
                <p className="text-[#4A4A4A] text-center">
                  Enter your email address and we'll send you a verification code to reset your password.
                </p>
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-[#1B1B1B]">
                    Email Address
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
                      className="bg-white border border-[#BDBDBD] text-[#1B1B1B] rounded-lg focus:ring-2 focus:ring-[#B1123B] focus:border-[#B1123B] block w-full p-2.5"
                    />
                    <button
                      type="button"
                      onClick={handleSendOTP}
                      disabled={isSubmitting || !email.trim() || otpCountdown > 0}
                      className="px-4 py-2.5 text-sm font-medium text-white bg-[#B1123B] hover:bg-[#1B1B1B] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg focus:ring-4 focus:outline-none focus:ring-[#F7D5DF] whitespace-nowrap transition-colors"
                    >
                      {otpCountdown > 0 ? `${otpCountdown}s` : 'Send OTP'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <p className="text-[#4A4A4A] text-center">
                  We've sent a 6-digit verification code to <strong>{email}</strong>
                </p>
                <div>
                  <label htmlFor="otp" className="block mb-2 text-sm font-medium text-[#1B1B1B]">
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
                      className="bg-white border border-[#BDBDBD] text-[#1B1B1B] rounded-lg focus:ring-2 focus:ring-[#B1123B] focus:border-[#B1123B] block w-full p-2.5 text-center text-lg font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={!canResendOtp || isSubmitting}
                      className="px-4 py-2.5 text-sm font-medium text-[#B1123B] hover:text-[#1B1B1B] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg focus:ring-4 focus:outline-none focus:ring-[#F7D5DF] whitespace-nowrap border border-[#B1123B] hover:border-[#1B1B1B] transition-colors"
                    >
                      Resend
                    </button>
                  </div>
                  <p className="text-xs text-[#4A4A4A] mt-1">
                    Enter the 6-digit code sent to your email
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyOTP}
                  disabled={isSubmitting || !otp.trim() || otp.length !== 6}
                  className="w-full text-white bg-[#B1123B] hover:bg-[#1B1B1B] disabled:opacity-70 disabled:cursor-not-allowed focus:ring-4 focus:outline-none focus:ring-[#F7D5DF] font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
                >
                  {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <p className="text-[#4A4A4A] text-center">
                  Enter your new password below
                </p>
                <div>
                  <label htmlFor="newPassword" className="block mb-2 text-sm font-medium text-[#1B1B1B]">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="bg-white border border-[#BDBDBD] text-[#1B1B1B] rounded-lg focus:ring-2 focus:ring-[#B1123B] focus:border-[#B1123B] block w-full p-2.5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4A4A4A]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-[#1B1B1B]">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="bg-white border border-[#BDBDBD] text-[#1B1B1B] rounded-lg focus:ring-2 focus:ring-[#B1123B] focus:border-[#B1123B] block w-full p-2.5"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#4A4A4A]"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isSubmitting || !newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword}
                  className="w-full text-white bg-[#B1123B] hover:bg-[#1B1B1B] disabled:opacity-70 disabled:cursor-not-allowed focus:ring-4 focus:outline-none focus:ring-[#F7D5DF] font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors"
                >
                  {isSubmitting ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </div>
            )}

            <p className="text-sm font-light text-[#4A4A4A] text-center">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-[#B1123B] hover:text-[#1B1B1B] hover:underline transition-colors">
                Log In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ForgotPassword;
