'use client'
import React, { useState, useEffect } from 'react';
import { FaQrcode, FaDownload, FaTimes } from 'react-icons/fa';
import QRCode from 'qrcode';

const QRCodeGenerator = ({ data, onClose, isOpen }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && data) {
      generateQRCode();
    }
  }, [isOpen, data]);

  const generateQRCode = async () => {
    try {
      setError('');
      const url = await QRCode.toDataURL(data, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });
      setQrCodeUrl(url);
    } catch (err) {
      console.error('Error generating QR code:', err);
      // Try fallback method
      try {
        const svgString = await QRCode.toString(data, {
          type: 'svg',
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        // Convert SVG to data URL
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(svgBlob);
        setQrCodeUrl(url);
      } catch (fallbackErr) {
        console.error('Fallback QR code generation also failed:', fallbackErr);
        setError('Failed to generate QR code');
      }
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.download = `qr-${data}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <FaQrcode className="mr-2 text-maybelline-pink" />
            QR Code
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="text-center mb-4">
          {error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          ) : qrCodeUrl ? (
            <div className="bg-gray-100 p-4 rounded-lg inline-block">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-48 h-48 mx-auto"
              />
            </div>
          ) : (
            <div className="bg-gray-100 p-4 rounded-lg inline-block w-48 h-48 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-maybelline-pink"></div>
            </div>
          )}
          <p className="mt-2 text-sm text-gray-600 break-all">{data}</p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={downloadQRCode}
            disabled={!qrCodeUrl}
            className="flex-1 py-2 px-4 bg-maybelline-pink text-white rounded-lg hover:bg-maybelline-magenta disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <FaDownload className="mr-2" />
            Download
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeGenerator;
