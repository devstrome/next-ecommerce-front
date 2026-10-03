'use client'
import React, { useState, useEffect } from 'react';
import { FaQrcode, FaCamera, FaTimes, FaCheck, FaExclamationTriangle, FaServer } from 'react-icons/fa';
import QRScanner from './QRScanner';
import QRCodeGenerator from './QRCodeGenerator';
import axios from 'axios';

const QRScannerTest = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [testData, setTestData] = useState('TEST_QR_CODE_123');
  const [scannedData, setScannedData] = useState('');
  const [generatedQRData, setGeneratedQRData] = useState('');
  const [testResults, setTestResults] = useState({
    scannerInitialized: false,
    cameraAccess: false,
    qrGenerated: false,
    scanSuccessful: false,
    backendConnected: false
  });
  const [backendTestResult, setBackendTestResult] = useState('');

  useEffect(() => {
    // Test camera access
    testCameraAccess();
    // Test backend connection
    testBackendConnection();
  }, []);

  const testCameraAccess = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setTestResults(prev => ({ ...prev, cameraAccess: true }));
    } catch (err) {
      console.error('Camera access test failed:', err);
      setTestResults(prev => ({ ...prev, cameraAccess: false }));
    }
  };

  const testBackendConnection = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/inventory/scan?code=TEST_CODE');
      setTestResults(prev => ({ ...prev, backendConnected: true }));
      setBackendTestResult('Backend API is accessible');
    } catch (err) {
      console.error('Backend connection test failed:', err);
      setTestResults(prev => ({ ...prev, backendConnected: false }));
      setBackendTestResult(`Backend API error: ${err.message}`);
    }
  };

  const handleScan = (data) => {
    console.log('Test: QR Code scanned:', data);
    setScannedData(data);
    setShowScanner(false);
    setTestResults(prev => ({ ...prev, scanSuccessful: true }));
  };

  const handleGenerateQR = () => {
    setGeneratedQRData(testData);
    setShowGenerator(true);
    setTestResults(prev => ({ ...prev, qrGenerated: true }));
  };

  const handleScannerOpen = () => {
    setShowScanner(true);
    setTestResults(prev => ({ ...prev, scannerInitialized: true }));
  };

  const runFullTest = () => {
    setTestResults({
      scannerInitialized: false,
      cameraAccess: false,
      qrGenerated: false,
      scanSuccessful: false,
      backendConnected: false
    });
    setScannedData('');
    setGeneratedQRData('');
    
    // Run tests in sequence
    testCameraAccess();
    testBackendConnection();
    handleGenerateQR();
    setTimeout(() => {
      handleScannerOpen();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-6 flex items-center">
            <FaQrcode className="mr-2 text-maybelline-pink" />
            QR Scanner Test & Diagnostics
          </h1>

          {/* System Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">System Status</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className={`p-3 rounded-lg border ${testResults.cameraAccess ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center">
                  {testResults.cameraAccess ? <FaCheck className="text-green-500 mr-2" /> : <FaExclamationTriangle className="text-red-500 mr-2" />}
                  <span className="text-sm font-medium">Camera Access</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${testResults.scannerInitialized ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {testResults.scannerInitialized ? <FaCheck className="text-green-500 mr-2" /> : <FaTimes className="text-gray-400 mr-2" />}
                  <span className="text-sm font-medium">Scanner Ready</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${testResults.qrGenerated ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {testResults.qrGenerated ? <FaCheck className="text-green-500 mr-2" /> : <FaTimes className="text-gray-400 mr-2" />}
                  <span className="text-sm font-medium">QR Generated</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${testResults.scanSuccessful ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center">
                  {testResults.scanSuccessful ? <FaCheck className="text-green-500 mr-2" /> : <FaTimes className="text-gray-400 mr-2" />}
                  <span className="text-sm font-medium">Scan Success</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg border ${testResults.backendConnected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center">
                  {testResults.backendConnected ? <FaCheck className="text-green-500 mr-2" /> : <FaExclamationTriangle className="text-red-500 mr-2" />}
                  <span className="text-sm font-medium">Backend API</span>
                </div>
              </div>
            </div>
          </div>

          {/* Backend Test Result */}
          {backendTestResult && (
            <div className="mb-6">
              <div className={`p-3 rounded-lg border ${testResults.backendConnected ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <div className="flex items-center">
                  <FaServer className="mr-2" />
                  <span className="text-sm">{backendTestResult}</span>
                </div>
              </div>
            </div>
          )}

          {/* Test Data Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test QR Code Data:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={testData}
                onChange={(e) => setTestData(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
                placeholder="Enter test data for QR code"
              />
              <button
                onClick={handleGenerateQR}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <FaQrcode className="mr-2" />
                Generate QR
              </button>
            </div>
          </div>

          {/* Test Controls */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Test Controls</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleScannerOpen}
                className="px-4 py-2 bg-maybelline-pink text-white rounded-lg hover:bg-maybelline-magenta flex items-center"
              >
                <FaCamera className="mr-2" />
                Open Scanner
              </button>
              <button
                onClick={runFullTest}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
              >
                <FaQrcode className="mr-2" />
                Run Full Test
              </button>
              <button
                onClick={() => {
                  setScannedData('');
                  setGeneratedQRData('');
                  setTestResults({
                    scannerInitialized: false,
                    cameraAccess: false,
                    qrGenerated: false,
                    scanSuccessful: false,
                    backendConnected: false
                  });
                  setBackendTestResult('');
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Reset All
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-2">Scan Results</h2>
              {scannedData ? (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                  <strong>Scanned Data:</strong> {scannedData}
                </div>
              ) : (
                <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
                  No data scanned yet
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Test Instructions</h2>
              <div className="bg-maybelline-light border border-maybelline-pink text-maybelline-magenta px-4 py-3 rounded">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Check the System Status indicators above</li>
                  <li>Enter test data in the input field above</li>
                  <li>Click "Generate QR" to create a test QR code</li>
                  <li>Click "Open Scanner" to open the QR scanner</li>
                  <li>Point your camera at the generated QR code</li>
                  <li>The scanned data should appear in the results section</li>
                  <li>Or use "Run Full Test" to test everything automatically</li>
                </ol>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Troubleshooting</h2>
              <div className="bg-maybelline-light border border-maybelline-pink text-maybelline-magenta px-4 py-3 rounded">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Camera Access Red:</strong> Check browser permissions and try refreshing</li>
                  <li><strong>Backend API Red:</strong> Make sure the backend server is running on port 3000</li>
                  <li><strong>Scanner Not Working:</strong> Check browser console for errors</li>
                  <li><strong>HTTPS Required:</strong> Camera access needs HTTPS (except localhost)</li>
                  <li><strong>Manual Input:</strong> Use "Enter QR Code Manually" if scanning fails</li>
                  <li><strong>Browser Support:</strong> Test in Chrome, Firefox, or Safari</li>
                </ul>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2">Browser Console</h2>
              <div className="bg-gray-100 border border-gray-400 text-gray-700 px-4 py-3 rounded">
                <p className="text-sm">Open browser developer tools (F12) and check the Console tab for detailed debugging information.</p>
                <p className="text-sm mt-2">Look for messages starting with "QRScanner:" to track the scanning process.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
        title="Test QR Scanner"
      />

      {/* QR Code Generator Modal */}
      <QRCodeGenerator
        isOpen={showGenerator}
        data={generatedQRData}
        onClose={() => setShowGenerator(false)}
      />
    </div>
  );
};

export default QRScannerTest;
