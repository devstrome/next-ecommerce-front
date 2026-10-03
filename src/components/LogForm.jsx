'use client'
import React, { useContext, useState } from 'react';
import Link from "next/link";
import { UserContext } from '../context/UserContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';

function LogForm() {
  const { login } = useContext(UserContext);
  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await login(emailOrPhone, password);
    } catch (err) {
      setError('Invalid email, phone number, or password');
    }
  };

  return (
    <section className="bg-pure-white min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto w-full">
        <a href="#" className="flex items-center mb-8 text-3xl font-heading text-black">
          Belorella
        </a>
        <div className="w-full bg-pure-white border border-cool-gray sm:max-w-md">
          <div className="p-8 space-y-6">
            <h1 className="font-heading text-display-sm text-black text-center">
              Log in to your account
            </h1>
            {error && <p className="text-maybelline-pink text-center font-sans text-sm">{error}</p>}
            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label htmlFor="emailOrPhone" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  name="emailOrPhone"
                  id="emailOrPhone"
                  value={emailOrPhone}
                  onChange={(e) => setEmailOrPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                  placeholder="name@company.com or +8801XXXXXXXXX"
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block mb-2 text-sm font-medium text-dark-gray font-sans">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-cool-gray font-sans text-black bg-pure-white focus:ring-1 focus:ring-maybelline-pink focus:border-maybelline-pink outline-none transition-colors duration-200"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-gray"
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Link href="/forgot-password" className="text-sm font-medium text-maybelline-pink hover:text-rose transition-colors duration-200">
                  Forgot password?
                </Link>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-maybelline-pink text-pure-white font-sans font-medium hover:opacity-90 transition-opacity duration-200"
              >
                Log In
              </button>
              <p className="text-sm font-light text-dark-gray text-center">
                Don&apos;t have an account yet?{' '}
                <Link href="/signup" className="font-medium text-maybelline-pink hover:text-rose transition-colors duration-200">
                  Sign Up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default LogForm;
