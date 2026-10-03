'use client'
import React, { useState } from 'react';

const ApiTest = () => {
  const [apiUri, setApiUri] = useState('');
  const [testResult, setTestResult] = useState('');

  const checkApiUri = () => {
    const envUri = process.env.NEXT_PUBLIC_API_URI;
    const fallbackUri = "http://localhost:5000";
    const finalUri = envUri || fallbackUri;
    
    setApiUri(finalUri);
    setTestResult(`API URI: ${finalUri} (${envUri ? 'from env' : 'fallback'})`);
  };

  return (
    <div className="p-4 bg-maybelline-light rounded-lg border-2 border-maybelline-pink">
      <h3 className="text-lg font-bold mb-2">API Configuration Test</h3>
      <button
        onClick={checkApiUri}
        className="px-3 py-1 bg-maybelline-pink text-white rounded hover:bg-maybelline-pink mb-2"
      >
        Test API URI
      </button>
      
      {apiUri && (
        <div className="space-y-2 text-sm">
          <p><strong>Environment Variable:</strong> {process.env.NEXT_PUBLIC_API_URI || 'Not set'}</p>
          <p><strong>Final API URI:</strong> {apiUri}</p>
          <p><strong>Result:</strong> {testResult}</p>
        </div>
      )}
    </div>
  );
};

export default ApiTest;
