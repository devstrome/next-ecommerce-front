'use client'
import React, { useEffect, useRef, useState, useContext } from 'react';
import { UserContext } from '../context/UserContext';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

// Google Identity Services button. Loads the GIS script once, renders our own
// Google-styled button (always visible), and sends the ID token to the backend
// via UserContext.loginWithGoogle (backend verifies + merges or creates user).
function GoogleAuthButton({ onError }) {
  const { loginWithGoogle } = useContext(UserContext);
  const buttonRef = useRef(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load https://accounts.google.com/gsi/client once per page
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
      setScriptReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => onError?.('Failed to load Google sign-in');
    document.head.appendChild(script);
  }, [onError]);

  // Initialize + render once the script is available
  useEffect(() => {
    if (!scriptReady || !GOOGLE_CLIENT_ID) return;
    const poll = setInterval(() => {
      if (window.google?.accounts?.id && buttonRef.current) {
        renderButton();
        clearInterval(poll);
      }
    }, 200);
    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady]);

  const renderButton = () => {
    const el = buttonRef.current;
    // Match the native button to our container so clicks land on the real GIS control
    const width = Math.max(240, Math.round(el?.offsetWidth || 320));
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async ({ credential }) => {
        try {
          setSubmitting(true);
          await loginWithGoogle(credential);
        } catch (err) {
          onError?.(err.response?.data?.message || 'Google sign-in failed');
        } finally {
          setSubmitting(false);
        }
      },
      context: 'signin',
    });
    window.google.accounts.id.renderButton(el, {
      theme: 'outline', size: 'large', width, text: 'continue_with',
      shape: 'rectangular',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="block flex-1 h-[1px] bg-cool-gray" />
        <span className="font-sans text-[11px] tracking-[0.2em] uppercase text-mid-gray">or</span>
        <span className="block flex-1 h-[1px] bg-cool-gray" />
      </div>
      <div className="flex justify-center">
        <div className="relative w-full max-w-[320px] min-h-[44px]">
          {/* Native GIS button, transparent and stretched — it receives the real click */}
          <div
            ref={buttonRef}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-hidden="true"
          />
          {submitting ? (
            <div className="w-full min-h-[44px] flex items-center justify-center border border-cool-gray bg-pure-white px-4 py-2.5">
              <p className="text-sm text-dark-gray">Signing you in with Google…</p>
            </div>
          ) : (
            <button
              type="button"
              className="absolute inset-0 w-full min-h-[44px] flex items-center justify-center gap-3 border border-cool-gray bg-pure-white hover:bg-[#F7F5F3] transition-colors duration-200 px-4 py-2.5 pointer-events-none"
            >
              <GoogleIcon />
              <span className="font-sans text-sm font-medium text-black">Continue with Google</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default GoogleAuthButton;
