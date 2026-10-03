'use client'
import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaCamera, FaKeyboard } from 'react-icons/fa';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

const QRScanner = ({ onScan, onClose, isOpen, title = 'Scan Code', mode = 'qr' }) => {
  const [error, setError] = useState('');
  const [scanType, setScanType] = useState(mode);
  const [scanMode, setScanMode] = useState('camera');
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);
  const containerRef = useRef(null);

  const stop = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      }
    } catch {}
    scannerRef.current = null;
  };

  const start = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      await stop();
      setLoading(true);
      setError('');

      el.id = el.id || `qrscan-${Date.now()}`;

      const scanner = new Html5Qrcode(el.id);
      scannerRef.current = scanner;

      const formats = scanType === 'qr'
        ? [Html5QrcodeSupportedFormats.QR_CODE]
        : [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ];

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: scanType === 'qr' ? { width: 250, height: 250 } : { width: 300, height: 120 },
          formatsToSupport: formats,
        },
        (text) => {
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          onScan(text);
          onClose();
        },
        () => {}
      );

      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err?.message || 'Camera access denied. Check permissions.');
    }
  };

  useEffect(() => {
    if (isOpen && scanMode === 'camera') {
      const t = setTimeout(start, 500);
      return () => { clearTimeout(t); stop(); };
    }
    if (!isOpen) {
      stop();
      setManualCode('');
      setScanMode('camera');
    }
  }, [isOpen, scanType, scanMode]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    onScan(code);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-sm w-full overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <FaTimes size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setScanType('qr')} className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${scanType === 'qr' ? 'bg-white text-maybelline-pink shadow-sm' : 'text-gray-500'}`}>
              QR Code
            </button>
            <button onClick={() => setScanType('barcode')} className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition ${scanType === 'barcode' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500'}`}>
              Barcode
            </button>
          </div>

          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setScanMode('camera')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${scanMode === 'camera' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              <FaCamera size={13} /> Camera
            </button>
            <button onClick={() => setScanMode('manual')} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition ${scanMode === 'manual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              <FaKeyboard size={13} /> Manual
            </button>
          </div>

          {scanMode === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Enter {scanType === 'qr' ? 'QR Code' : 'Barcode'} manually
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder={scanType === 'qr' ? 'e.g. QR1234567890' : 'e.g. INV1234567890'}
                  autoFocus
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim()}
                className="w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Submit Code
              </button>
            </form>
          ) : (
            <>
              {error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-sm text-red-700 mb-3">{error}</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={start} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Retry</button>
                    <button onClick={() => setScanMode('manual')} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200">Enter Manually</button>
                  </div>
                </div>
              ) : (
                <div className="relative" style={{ minHeight: '300px' }}>
                  {loading && (
                    <div className="absolute inset-0 bg-gray-900 rounded-lg flex items-center justify-center z-10" style={{ minHeight: '300px' }}>
                      <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white mx-auto mb-2"></div>
                        <p className="text-white/80 text-sm">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  <div ref={containerRef} className="w-full bg-gray-900 rounded-lg overflow-hidden" style={{ minHeight: '300px' }} />
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 pb-5 text-center text-xs text-gray-400">
          {scanMode === 'manual'
            ? `Type or paste the ${scanType === 'qr' ? 'QR code' : 'barcode'} value`
            : `Point camera at ${scanType === 'qr' ? 'QR code' : 'barcode'} — scans automatically`
          }
        </div>
      </div>
    </div>
  );
};

export default QRScanner;
